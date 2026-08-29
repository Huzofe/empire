import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { nodesService } from '@/modules/nodes/nodes.service'
import { z } from 'zod'

const createNodeSchema = z.object({
  title: z.string().min(1).max(255),
  typeId: z.string(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  metadata: z.any().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const search = searchParams.get('search')

    if (search) {
      const nodes = await nodesService.searchNodes(search, session.user.id)
      return NextResponse.json({ nodes })
    }

    if (parentId) {
      const children = await nodesService.getChildren(parentId)
      return NextResponse.json({ nodes: children })
    }

    // Get root node
    const root = await nodesService.getRootNode()
    return NextResponse.json({ node: root })
  } catch (error) {
    console.error('GET /api/nodes error:', error)
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
    const validated = createNodeSchema.parse(body)

    const node = await nodesService.createNode({
      ...validated,
      createdById: session.user.id,
    })

    return NextResponse.json({ node }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/nodes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
