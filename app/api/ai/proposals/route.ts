import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createProposalSchema = z.object({
  nodeId: z.string(),
  type: z.string(),
  content: z.any(),
  reasoning: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')
    const status = searchParams.get('status')

    const where: any = { deletedAt: null }
    if (nodeId) where.nodeId = nodeId
    if (status) where.status = status

    const proposals = await prisma.aIProposal.findMany({
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

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('GET /api/ai/proposals error:', error)
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
    const validated = createProposalSchema.parse(body)

    const proposal = await prisma.aIProposal.create({
      data: {
        nodeId: validated.nodeId,
        type: validated.type,
        content: validated.content,
        reasoning: validated.reasoning,
        status: 'pending',
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/ai/proposals error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
