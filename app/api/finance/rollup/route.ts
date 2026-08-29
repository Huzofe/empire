import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')
    const period = searchParams.get('period')

    if (!nodeId || !period) {
      return NextResponse.json(
        { error: 'nodeId and period are required' },
        { status: 400 }
      )
    }

    // Get node and all descendants
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        children: {
          where: { deletedAt: null },
          include: {
            children: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    // Collect all node IDs (node + descendants)
    const nodeIds = collectNodeIds(node)

    // Get financial entries for all these nodes
    const entries = await prisma.financialEntry.findMany({
      where: {
        nodeId: { in: nodeIds },
        period,
        deletedAt: null,
      },
    })

    // Aggregate by type and category
    const rollup: Record<string, any> = {}

    for (const entry of entries) {
      const key = `${entry.type}_${entry.category}`
      if (!rollup[key]) {
        rollup[key] = {
          type: entry.type,
          category: entry.category,
          amount: new Decimal(0),
          currency: entry.currency,
        }
      }
      rollup[key].amount = rollup[key].amount.plus(entry.amount)
    }

    const aggregated = Object.values(rollup).map((item: any) => ({
      ...item,
      amount: item.amount.toNumber(),
    }))

    return NextResponse.json({ rollup: aggregated })
  } catch (error) {
    console.error('GET /api/finance/rollup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function collectNodeIds(node: any): string[] {
  const ids = [node.id]
  
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectNodeIds(child))
    }
  }

  return ids
}
