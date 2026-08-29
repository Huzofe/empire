import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const createValueSchema = z.object({
  period: z.string(),
  value: z.number(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const values = await prisma.metricValue.findMany({
      where: {
        metricId: params.id,
        deletedAt: null,
      },
      orderBy: {
        period: 'desc',
      },
    })

    return NextResponse.json({ values })
  } catch (error) {
    console.error('GET /api/metrics/[id]/values error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createValueSchema.parse(body)

    // Check if metric exists
    const metric = await prisma.metric.findUnique({
      where: { id: params.id },
    })

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 })
    }

    // Upsert value for this period
    const value = await prisma.metricValue.upsert({
      where: {
        metricId_period: {
          metricId: params.id,
          period: validated.period,
        },
      },
      update: {
        value: new Decimal(validated.value),
      },
      create: {
        metricId: params.id,
        period: validated.period,
        value: new Decimal(validated.value),
      },
    })

    return NextResponse.json({ value }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/metrics/[id]/values error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
