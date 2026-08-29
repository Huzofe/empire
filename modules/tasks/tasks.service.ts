import { prisma } from '@/lib/db'
import { progressService } from '../progress/progress.service'

export class TasksService {
  async createTask(data: {
    nodeId: string
    title: string
    description?: string
    parentTaskId?: string
    status?: string
    priority?: string
    deadline?: Date
    assigneeId?: string
  }) {
    const task = await prisma.task.create({
      data: {
        nodeId: data.nodeId,
        parentTaskId: data.parentTaskId,
        title: data.title,
        description: data.description,
        status: data.status || 'planned',
        priority: data.priority || 'medium',
        deadline: data.deadline,
        assigneeId: data.assigneeId,
      },
    })

    // Recalculate node progress
    await progressService.recalculateChain(data.nodeId)

    return task
  }

  async updateTask(
    id: string,
    data: {
      title?: string
      description?: string
      status?: string
      priority?: string
      deadline?: Date
      completedAt?: Date
    }
  ) {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { nodeId: true },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
    })

    // Recalculate progress if status changed
    if (data.status) {
      await progressService.recalculateChain(task.nodeId)
    }

    return updated
  }

  async deleteTask(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { nodeId: true },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await progressService.recalculateChain(task.nodeId)
  }

  async getNodeTasks(nodeId: string) {
    return prisma.task.findMany({
      where: {
        nodeId,
        deletedAt: null,
        parentTaskId: null, // Root tasks only
      },
      include: {
        children: {
          where: { deletedAt: null },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }

  async getTaskById(id: string) {
    return prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        node: true,
        parent: true,
        children: {
          where: { deletedAt: null },
        },
      },
    })
  }

  async getSubtasks(parentTaskId: string) {
    return prisma.task.findMany({
      where: {
        parentTaskId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  async getOverdueTasks(userId?: string) {
    const now = new Date()
    
    const where: any = {
      deletedAt: null,
      deadline: {
        lt: now,
      },
      status: {
        notIn: ['completed', 'cancelled'],
      },
    }

    if (userId) {
      where.assigneeId = userId
    }

    return prisma.task.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    })
  }

  async getUpcomingTasks(userId?: string, days: number = 7) {
    const now = new Date()
    const future = new Date()
    future.setDate(future.getDate() + days)

    const where: any = {
      deletedAt: null,
      deadline: {
        gte: now,
        lte: future,
      },
      status: {
        notIn: ['completed', 'cancelled'],
      },
    }

    if (userId) {
      where.assigneeId = userId
    }

    return prisma.task.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    })
  }

  async getTodayTasks(userId?: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const where: any = {
      deletedAt: null,
      deadline: {
        gte: today,
        lt: tomorrow,
      },
      status: {
        notIn: ['completed', 'cancelled'],
      },
    }

    if (userId) {
      where.assigneeId = userId
    }

    return prisma.task.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    })
  }
}

export const tasksService = new TasksService()
