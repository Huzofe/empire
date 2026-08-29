import { prisma } from '@/lib/db'

export class ProgressService {
  /**
   * Calculate progress for a node recursively
   * Rules:
   * - If node has children: average of children progress
   * - If node has tasks: percentage of completed tasks
   * - If node is completed/working: 100%
   * - Cancelled and archived items excluded from calculation
   */
  async calculateNodeProgress(nodeId: string): Promise<number> {
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
          select: {
            id: true,
            status: true,
            progressCache: true,
          },
        },
        tasks: {
          where: {
            deletedAt: null,
            parentTaskId: null, // Only root tasks
            status: {
              not: 'cancelled',
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!node) return 0

    let progress = 0

    // Priority 1: Node has children
    if (node.children.length > 0) {
      const childProgresses = await Promise.all(
        node.children.map(async (child) => {
          // Use cached progress if recent, otherwise recalculate
          return await this.calculateNodeProgress(child.id)
        })
      )
      progress = childProgresses.reduce((sum, p) => sum + p, 0) / node.children.length
    }
    // Priority 2: Node has tasks
    else if (node.tasks.length > 0) {
      const completedCount = node.tasks.filter(
        (t) => t.status === 'completed' || t.status === 'working'
      ).length
      progress = (completedCount / node.tasks.length) * 100
    }
    // Priority 3: Node itself is done
    else if (node.status === 'completed' || node.status === 'working') {
      progress = 100
    }

    // Update cache
    await prisma.node.update({
      where: { id: nodeId },
      data: { progressCache: Math.round(progress * 100) / 100 },
    })

    return progress
  }

  /**
   * Recalculate progress for node and all ancestors up to root
   */
  async recalculateChain(nodeId: string): Promise<void> {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, parentId: true },
    })

    if (!node) return

    // Calculate current node
    await this.calculateNodeProgress(node.id)

    // Recursively calculate parent
    if (node.parentId) {
      await this.recalculateChain(node.parentId)
    }
  }

  /**
   * Get aggregated progress for all children of a node
   */
  async getChildrenProgress(nodeId: string) {
    const children = await prisma.node.findMany({
      where: {
        parentId: nodeId,
        deletedAt: null,
        status: {
          notIn: ['cancelled', 'archived'],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        progressCache: true,
        type: {
          select: {
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    })

    // Recalculate if needed
    const childrenWithProgress = await Promise.all(
      children.map(async (child) => {
        const progress = await this.calculateNodeProgress(child.id)
        return {
          ...child,
          progress,
        }
      })
    )

    return childrenWithProgress
  }

  /**
   * Get progress statistics for a node
   */
  async getNodeStats(nodeId: string) {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        children: {
          where: {
            deletedAt: null,
          },
          select: {
            status: true,
          },
        },
        tasks: {
          where: {
            deletedAt: null,
          },
          select: {
            status: true,
            deadline: true,
          },
        },
      },
    })

    if (!node) return null

    const progress = await this.calculateNodeProgress(nodeId)

    // Count by status
    const statusCounts = {
      idea: 0,
      planned: 0,
      in_progress: 0,
      pilot: 0,
      working: 0,
      completed: 0,
      blocked: 0,
      paused: 0,
      cancelled: 0,
      archived: 0,
    }

    node.children.forEach((child) => {
      const status = child.status as keyof typeof statusCounts
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    node.tasks.forEach((task) => {
      const status = task.status as keyof typeof statusCounts
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    // Overdue tasks
    const now = new Date()
    const overdueTasks = node.tasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < now &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    ).length

    return {
      progress,
      totalChildren: node.children.length,
      totalTasks: node.tasks.length,
      statusCounts,
      overdueTasks,
    }
  }
}

export const progressService = new ProgressService()
