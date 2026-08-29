'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, CheckSquare, TrendingUp } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface SearchResult {
  id: string
  type: 'node' | 'task' | 'document'
  title: string
  description?: string
  path?: string
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const getIcon = (type: string) => {
    switch (type) {
      case 'node':
        return FileText
      case 'task':
        return CheckSquare
      case 'document':
        return FileText
      default:
        return Search
    }
  }

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'node') {
      router.push(`/workbench?node=${result.id}`)
    } else if (result.type === 'task') {
      router.push(`/workbench/tasks?task=${result.id}`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="flex items-center gap-2 border-b pb-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск узлов, задач, документов..."
            className="flex-1 outline-none text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              Поиск...
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center py-8 text-gray-500">
              Ничего не найдено
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((result) => {
                const Icon = getIcon(result.type)
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 rounded text-left"
                  >
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.description && (
                        <p className="text-sm text-gray-600 truncate">
                          {result.description}
                        </p>
                      )}
                      {result.path && (
                        <p className="text-xs text-gray-400 truncate">
                          {result.path}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
