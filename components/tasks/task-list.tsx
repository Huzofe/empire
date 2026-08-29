'use client'

import { useState } from 'react'
import { Check, ChevronRight, ChevronDown, Calendar, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  title: string
  status: string
  priority?: string
  deadline?: string
  children?: Task[]
}

interface TaskListProps {
  tasks: Task[]
  onTaskClick?: (taskId: string) => void
  onStatusChange?: (taskId: string, status: string) => void
}

function TaskItem({
  task,
  level = 0,
  onTaskClick,
  onStatusChange,
}: {
  task: Task
  level?: number
  onTaskClick?: (taskId: string) => void
  onStatusChange?: (taskId: string, status: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = task.children && task.children.length > 0

  const statusColors: Record<string, string> = {
    planned: 'bg-gray-100 text-gray-700',
    ready: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-500',
  }

  const priorityIcons: Record<string, { icon: typeof Flag; color: string }> = {
    critical: { icon: Flag, color: 'text-red-600' },
    high: { icon: Flag, color: 'text-orange-600' },
    medium: { icon: Flag, color: 'text-yellow-600' },
    low: { icon: Flag, color: 'text-gray-400' },
  }

  const isCompleted = task.status === 'completed'
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isCompleted

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded ${
          isCompleted ? 'opacity-60' : ''
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={() => {
            const newStatus = isCompleted ? 'in_progress' : 'completed'
            onStatusChange?.(task.id, newStatus)
          }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-green-500'
          }`}
        >
          {isCompleted && <Check className="w-3 h-3 text-white" />}
        </button>

        <button
          onClick={() => onTaskClick?.(task.id)}
          className={`flex-1 text-left text-sm ${isCompleted ? 'line-through' : ''}`}
        >
          {task.title}
        </button>

        {task.priority && task.priority !== 'medium' && (
          <span className={priorityIcons[task.priority]?.color}>
            {React.createElement(priorityIcons[task.priority]?.icon || Flag, {
              className: 'w-4 h-4',
            })}
          </span>
        )}

        {task.deadline && (
          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {new Date(task.deadline).toLocaleDateString('ru-RU')}
          </span>
        )}

        <span
          className={`px-2 py-0.5 rounded text-xs ${
            statusColors[task.status] || statusColors.planned
          }`}
        >
          {task.status}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {task.children!.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              level={level + 1}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskList({ tasks, onTaskClick, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Нет задач</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onTaskClick={onTaskClick}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}
