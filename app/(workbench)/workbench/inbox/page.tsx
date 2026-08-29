'use client'

import { useState, useEffect } from 'react'
import { Inbox as InboxIcon, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImportItem {
  id: string
  type: string
  fileName: string
  status: string
  createdAt: string
}

export default function InboxPage() {
  const [imports, setImports] = useState<ImportItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadInbox()
  }, [])

  async function loadInbox() {
    // TODO: Implement inbox API
    setImports([])
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <InboxIcon className="w-8 h-8" />
            Inbox
          </h1>
          <p className="text-gray-600 mt-1">
            Импортируйте документы для обработки и добавления в систему
          </p>
        </div>

        <div className="bg-white border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Upload className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Загрузите документы</h3>
            <p className="text-gray-600 text-sm mb-4">
              Поддерживаются форматы: TXT, MD, DOCX, PDF
            </p>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Выбрать файлы
            </Button>
          </div>
        </div>

        {imports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <InboxIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Inbox пуст</p>
            <p className="text-sm mt-2">Загрузите документы для обработки</p>
          </div>
        )}
      </div>
    </div>
  )
}
