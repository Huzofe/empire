'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: string
  priority?: string
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove?: (taskId: string, newStatus: string) => void
  onTaskClick?: (taskId: string) => void
}

const columns = [
  { id: 'planned', title: 'Запланировано', color: 'bg-gray-100' },
  { id: 'ready', title: 'Готово к работе', color: 'bg-blue-100' },
  { id: 'in_progress', title: 'В работе', color: 'bg-yellow-100' },
  { id: 'completed', title: 'Выполнено', color: 'bg-green-100' },
]

export function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: string) => {
    if (draggedTask) {
      onTaskMove?.(draggedTask, status)
      setDraggedTask(null)
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-80"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
        >
          <div className={`${column.color} rounded-t-lg px-4 py-2 flex items-center justify-between`}>
            <h3 className="font-medium text-sm">{column.title}</h3>
            <span className="text-xs text-gray-600">
              {getTasksByStatus(column.id).length}
            </span>
          </div>

          <div className="bg-gray-50 rounded-b-lg p-3 min-h-[500px] space-y-2">
            {getTasksByStatus(column.id).map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onClick={() => onTaskClick?.(task.id)}
                className="bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move"
              >
                <p className="text-sm font-medium">{task.title}</p>
                {task.priority && task.priority !== 'medium' && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                    {task.priority}
                  </span>
                )}
              </div>
            ))}

            <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 flex items-center justify-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
              <Plus className="w-4 h-4" />
              Добавить задачу
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
