import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const createMetricSchema = z.object({
  nodeId: z.string(),
  name: z.string().min(1).max(200),
  unit: z.string(),
  target: z.number().optional(),
  warningThreshold: z.number().optional(),
  aggregation: z.enum(['SUM', 'AVG', 'LAST']),
  frequency: z.string(),
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
    if (nodeId) where.nodeId = nodeId

    const metrics = await prisma.metric.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
        values: {
          where: { deletedAt: null },
          orderBy: { period: 'desc' },
          take: 10,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('GET /api/metrics error:', error)
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
    const validated = createMetricSchema.parse(body)

    const metric = await prisma.metric.create({
      data: {
        nodeId: validated.nodeId,
        name: validated.name,
        unit: validated.unit,
        target: validated.target ? new Decimal(validated.target) : null,
        warningThreshold: validated.warningThreshold
          ? new Decimal(validated.warningThreshold)
          : null,
        aggregation: validated.aggregation,
        frequency: validated.frequency,
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ metric }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
