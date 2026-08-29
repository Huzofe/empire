import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createRelationSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  type: z.string(),
  metadata: z.any().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    let relations
    if (nodeId) {
      relations = await prisma.nodeRelation.findMany({
        where: {
          OR: [
            { sourceNodeId: nodeId },
            { targetNodeId: nodeId },
          ],
          deletedAt: null,
        },
        include: {
          sourceNode: {
            include: {
              type: true,
            },
          },
          targetNode: {
            include: {
              type: true,
            },
          },
        },
      })
    } else {
      relations = await prisma.nodeRelation.findMany({
        where: { deletedAt: null },
        include: {
          sourceNode: {
            include: {
              type: true,
            },
          },
          targetNode: {
            include: {
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    return NextResponse.json({ relations })
  } catch (error) {
    console.error('GET /api/relations error:', error)
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
    const validated = createRelationSchema.parse(body)

    // Check for cycles
    const wouldCreateCycle = await checkForCycle(
      validated.sourceNodeId,
      validated.targetNodeId
    )

    if (wouldCreateCycle) {
      return NextResponse.json(
        { error: 'This relation would create a cycle' },
        { status: 400 }
      )
    }

    const relation = await prisma.nodeRelation.create({
      data: {
        sourceNodeId: validated.sourceNodeId,
        targetNodeId: validated.targetNodeId,
        type: validated.type,
        metadata: validated.metadata,
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    })

    return NextResponse.json({ relation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/relations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function checkForCycle(
  sourceId: string,
  targetId: string
): Promise<boolean> {
  // BFS to detect if adding this edge creates a cycle
  const visited = new Set<string>()
  const queue = [targetId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    
    if (currentId === sourceId) {
      return true // Cycle detected
    }

    if (visited.has(currentId)) {
      continue
    }

    visited.add(currentId)

    // Get outgoing relations
    const relations = await prisma.nodeRelation.findMany({
      where: {
        sourceNodeId: currentId,
        deletedAt: null,
      },
      select: {
        targetNodeId: true,
      },
    })

    queue.push(...relations.map((r) => r.targetNodeId))
  }

  return false
}
