import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateProposalSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateProposalSchema.parse(body)

    const data: any = { status: validated.status }
    
    if (validated.status === 'accepted') {
      data.appliedAt = new Date()
    }

    const proposal = await prisma.aIProposal.update({
      where: { id: params.id },
      data,
      include: {
        node: true,
      },
    })

    return NextResponse.json({ proposal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PUT /api/ai/proposals/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
