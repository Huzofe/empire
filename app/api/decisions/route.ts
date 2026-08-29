import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createDecisionSchema = z.object({
  nodeId: z.string(),
  question: z.string().min(1).max(1000),
  context: z.string().optional(),
  options: z.array(z.string()),
  selectedOption: z.string().optional(),
  rationale: z.string().optional(),
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

    const decisions = await prisma.decision.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
        madeBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ decisions })
  } catch (error) {
    console.error('GET /api/decisions error:', error)
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
    const validated = createDecisionSchema.parse(body)

    const decision = await prisma.decision.create({
      data: {
        nodeId: validated.nodeId,
        question: validated.question,
        context: validated.context,
        options: validated.options,
        selectedOption: validated.selectedOption,
        rationale: validated.rationale,
        madeById: session.user.id,
      },
      include: {
        node: true,
        madeBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ decision }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/decisions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
