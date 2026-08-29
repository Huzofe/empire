'use client'

import { Calendar, Link as LinkIcon, TrendingUp, AlertTriangle } from 'lucide-react'

interface NodeContext {
  status: string
  progress: number
  deadline?: string
  relationsCount: number
  metricsCount: number
  issuesCount: number
}

interface ContextPanelProps {
  context: NodeContext
}

export function ContextPanel({ context }: ContextPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Статус</h3>
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
          {context.status}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Прогресс</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Выполнено</span>
            <span className="font-medium">{context.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${context.progress}%` }}
            />
          </div>
        </div>
      </div>

      {context.deadline && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Дедлайн
          </h3>
          <div className="text-sm">{context.deadline}</div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <LinkIcon className="w-4 h-4" />
          Связи
        </h3>
        <div className="text-sm">{context.relationsCount} связей</div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          Метрики
        </h3>
        <div className="text-sm">{context.metricsCount} KPI</div>
      </div>

      {context.issuesCount > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Проблемы
          </h3>
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm">
            {context.issuesCount} требуют внимания
          </div>
        </div>
      )}
    </div>
  )
}
