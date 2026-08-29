import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export class NodesService {
  async createNode(data: {
    title: string
    typeId: string
    parentId?: string
    description?: string
    status?: string
    priority?: string
    createdById: string
    metadata?: any
  }) {
    const node = await prisma.node.create({
      data: {
        title: data.title,
        typeId: data.typeId,
        parentId: data.parentId,
        description: data.description,
        status: data.status || 'idea',
        priority: data.priority || 'medium',
        createdById: data.createdById,
        metadata: data.metadata,
      },
      include: {
        type: true,
        parent: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create primary workspace document
    await prisma.document.create({
      data: {
        nodeId: node.id,
        title: 'Workspace',
        isPrimary: true,
        createdById: data.createdById,
        contentJson: { type: 'doc', content: [] },
        plainText: '',
      },
    })

    return node
  }

  async getNodeById(id: string) {
    return prisma.node.findUnique({
      where: { id, deletedAt: null },
      include: {
        type: true,
        parent: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        children: {
          where: { deletedAt: null },
          include: {
            type: true,
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        tasks: {
          where: { deletedAt: null },
        },
        relationsFrom: {
          include: {
            toNode: {
              include: {
                type: true,
              },
            },
          },
        },
        relationsTo: {
          include: {
            fromNode: {
              include: {
                type: true,
              },
            },
          },
        },
        locations: true,
        financialEntries: {
          where: { deletedAt: null },
        },
        metrics: {
          where: { deletedAt: null },
        },
      },
    })
  }

  async updateNode(
    id: string,
    data: Partial<{
      title: string
      description: string
      status: string
      priority: string
      plannedStart: Date
      actualStart: Date
      deadline: Date
      reviewAt: Date
      completedAt: Date
      metadata: any
    }>
  ) {
    const node = await prisma.node.update({
      where: { id },
      data,
      include: {
        type: true,
        parent: true,
      },
    })

    // Recalculate progress for this node and all ancestors
    await this.recalculateProgress(id)

    return node
  }

  async deleteNode(id: string) {
    // Soft delete
    return prisma.node.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  async getChildren(parentId: string) {
    return prisma.node.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      include: {
        type: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async getAncestors(nodeId: string): Promise<any[]> {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        type: true,
        parent: true,
      },
    })

    if (!node || !node.parent) {
      return node ? [node] : []
    }

    const ancestors = await this.getAncestors(node.parentId!)
    return [...ancestors, node]
  }

  async recalculateProgress(nodeId: string): Promise<number> {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        children: {
          where: {
            deletedAt: null,
            status: {
              notIn: ['cancelled', 'archived'],
            },
          },
        },
        tasks: {
          where: {
            deletedAt: null,
            parentTaskId: null, // Only root tasks
            status: {
              notIn: ['cancelled'],
            },
          },
        },
      },
    })

    if (!node) return 0

    let progress = 0

    // If node has children, calculate based on children progress
    if (node.children.length > 0) {
      const childProgresses = await Promise.all(
        node.children.map((child) => this.recalculateProgress(child.id))
      )
      progress = childProgresses.reduce((sum, p) => sum + p, 0) / node.children.length
    }
    // If node has tasks, calculate based on tasks
    else if (node.tasks.length > 0) {
      const completedTasks = node.tasks.filter(
        (t) => t.status === 'completed' || t.status === 'working'
      ).length
      progress = (completedTasks / node.tasks.length) * 100
    }
    // If node itself is completed or working
    else if (node.status === 'completed' || node.status === 'working') {
      progress = 100
    }

    // Update progress cache
    await prisma.node.update({
      where: { id: nodeId },
      data: { progressCache: progress },
    })

    // Recursively update parent
    if (node.parentId) {
      await this.recalculateProgress(node.parentId)
    }

    return progress
  }

  async searchNodes(query: string, userId: string) {
    return prisma.node.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        type: true,
        parent: true,
      },
      take: 50,
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  async getRootNode() {
    return prisma.node.findFirst({
      where: {
        parentId: null,
        deletedAt: null,
      },
      include: {
        type: true,
        children: {
          where: { deletedAt: null },
          include: {
            type: true,
          },
        },
      },
    })
  }
}

export const nodesService = new NodesService()
