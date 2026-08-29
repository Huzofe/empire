import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createExperimentSchema = z.object({
  nodeId: z.string(),
  hypothesis: z.string().min(1).max(2000),
  method: z.string(),
  metrics: z.array(z.string()),
  duration: z.number().optional(),
  status: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    const where: any = { deletedAt: null }
    if (nodeId) {
      where.nodeId = nodeId
    }

    const experiments = await prisma.experiment.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ experiments })
  } catch (error) {
    console.error('GET /api/experiments error:', error)
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
    const validated = createExperimentSchema.parse(body)

    const experiment = await prisma.experiment.create({
      data: {
        nodeId: validated.nodeId,
        hypothesis: validated.hypothesis,
        method: validated.method,
        metrics: validated.metrics,
        duration: validated.duration,
        status: validated.status || 'planned',
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ experiment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/experiments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
