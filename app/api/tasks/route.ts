import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { tasksService } from '@/modules/tasks/tasks.service'
import { z } from 'zod'

const createTaskSchema = z.object({
  nodeId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  parentTaskId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')
    const filter = searchParams.get('filter')

    if (nodeId) {
      const tasks = await tasksService.getNodeTasks(nodeId)
      return NextResponse.json({ tasks })
    }

    if (filter === 'today') {
      const tasks = await tasksService.getTodayTasks(session.user.id)
      return NextResponse.json({ tasks })
    }

    if (filter === 'overdue') {
      const tasks = await tasksService.getOverdueTasks(session.user.id)
      return NextResponse.json({ tasks })
    }

    if (filter === 'upcoming') {
      const tasks = await tasksService.getUpcomingTasks(session.user.id)
      return NextResponse.json({ tasks })
    }

    return NextResponse.json({ tasks: [] })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
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
    const validated = createTaskSchema.parse(body)

    const data: any = { ...validated }
    if (validated.deadline) {
      data.deadline = new Date(validated.deadline)
    }

    const task = await tasksService.createTask(data)

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
