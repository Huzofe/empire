'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { TaskList } from '@/components/tasks/task-list'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Plus } from 'lucide-react'

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState([])
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTaskMove(taskId: string, newStatus: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      loadTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
        }),
      })
      loadTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600">Загрузка задач...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Задачи</h1>
            <p className="text-gray-600 text-sm mt-1">
              Управление задачами по проектам
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded ${
                  viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Новая задача
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks}
            onTaskMove={handleTaskMove}
          />
        ) : (
          <TaskList
            tasks={tasks}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  )
}
