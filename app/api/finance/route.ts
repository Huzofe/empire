import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const createFinanceSchema = z.object({
  nodeId: z.string(),
  period: z.string(),
  type: z.enum(['plan', 'actual']),
  category: z.string(),
  amount: z.number(),
  currency: z.string().default('RUB'),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')
    const period = searchParams.get('period')
    const type = searchParams.get('type')

    const where: any = { deletedAt: null }
    if (nodeId) where.nodeId = nodeId
    if (period) where.period = period
    if (type) where.type = type

    const entries = await prisma.financialEntry.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: [
        { period: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('GET /api/finance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createFinanceSchema.parse(body)

    const entry = await prisma.financialEntry.create({
      data: {
        nodeId: validated.nodeId,
        period: validated.period,
        type: validated.type,
        category: validated.category,
        amount: new Decimal(validated.amount),
        currency: validated.currency,
        notes: validated.notes,
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/finance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
