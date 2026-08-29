import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createParameterSchema = z.object({
  nodeId: z.string(),
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.string(),
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

    const parameters = await prisma.businessParameter.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        key: 'asc',
      },
    })

    return NextResponse.json({ parameters })
  } catch (error) {
    console.error('GET /api/parameters error:', error)
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
    const validated = createParameterSchema.parse(body)

    const parameter = await prisma.businessParameter.create({
      data: {
        nodeId: validated.nodeId,
        key: validated.key,
        value: validated.value,
        type: validated.type,
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ parameter }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/parameters error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
