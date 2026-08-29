'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { TaskList } from '@/components/tasks/task-list'
import { Calendar as CalendarIcon, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

export default function TodayPage() {
  const { data: session } = useSession()
  const [todayTasks, setTodayTasks] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllTasks()
  }, [])

  async function loadAllTasks() {
    try {
      const [today, overdue, upcoming] = await Promise.all([
        fetch('/api/tasks?filter=today').then(r => r.json()),
        fetch('/api/tasks?filter=overdue').then(r => r.json()),
        fetch('/api/tasks?filter=upcoming').then(r => r.json()),
      ])

      setTodayTasks(today.tasks || [])
      setOverdueTasks(overdue.tasks || [])
      setUpcomingTasks(upcoming.tasks || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
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
      loadAllTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{greeting}!</h1>
          <p className="text-gray-600 mt-1">
            {now.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Просрочено</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {overdueTasks.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Сегодня</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {todayTasks.length}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Скоро</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {upcomingTasks.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold">Просроченные задачи</h2>
            </div>
            <TaskList
              tasks={overdueTasks}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {/* Today Tasks */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Задачи на сегодня</h2>
          </div>
          {todayTasks.length > 0 ? (
            <TaskList
              tasks={todayTasks}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <p className="text-gray-500 text-center py-8">
              На сегодня задач нет
            </p>
          )}
        </div>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Ближайшие 7 дней</h2>
            </div>
            <TaskList
              tasks={upcomingTasks}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
