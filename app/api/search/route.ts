import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.trim().toLowerCase()

    // Search nodes
    const nodes = await prisma.node.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        type: true,
        parent: {
          select: {
            title: true,
          },
        },
      },
      take: 10,
    })

    // Search tasks
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        node: {
          select: {
            title: true,
          },
        },
      },
      take: 10,
    })

    // Search documents
    const documents = await prisma.document.findMany({
      where: {
        deletedAt: null,
        title: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      include: {
        node: {
          select: {
            title: true,
          },
        },
      },
      take: 10,
    })

    const results = [
      ...nodes.map((node) => ({
        id: node.id,
        type: 'node' as const,
        title: node.title,
        description: node.description,
        path: node.parent ? `${node.parent.title} / ${node.title}` : node.title,
      })),
      ...tasks.map((task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        description: task.description,
        path: task.node.title,
      })),
      ...documents.map((doc) => ({
        id: doc.id,
        type: 'document' as const,
        title: doc.title,
        path: doc.node.title,
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
