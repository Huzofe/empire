import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { nodesService } from '@/modules/nodes/nodes.service'
import { z } from 'zod'

const updateNodeSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  deadline: z.string().datetime().optional(),
  metadata: z.any().optional(),
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

    const node = await nodesService.getNodeById(params.id)

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    return NextResponse.json({ node })
  } catch (error) {
    console.error('GET /api/nodes/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const validated = updateNodeSchema.parse(body)

    const data: any = { ...validated }
    if (validated.deadline) {
      data.deadline = new Date(validated.deadline)
    }

    const node = await nodesService.updateNode(params.id, data)

    return NextResponse.json({ node })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PUT /api/nodes/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await nodesService.deleteNode(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/nodes/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
