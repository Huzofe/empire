'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UniverseMap } from '@/components/universe/universe-map'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Maximize2, Filter } from 'lucide-react'

export default function UniversePage() {
  const router = useRouter()
  const [rootNode, setRootNode] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    loadUniverse()
  }, [])

  async function loadUniverse() {
    try {
      const res = await fetch('/api/nodes?includeChildren=true')
      const data = await res.json()
      
      if (data.node) {
        setRootNode(data.node)
      }
    } catch (error) {
      console.error('Failed to load universe:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleNodeClick(nodeId: string) {
    setSelectedNodeId(nodeId)
  }

  function handleDrillDown() {
    if (selectedNodeId) {
      router.push(`/workbench?node=${selectedNodeId}`)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600 text-lg">Строим Вселенную...</p>
        </div>
      </div>
    )
  }

  if (!rootNode) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Нет данных для отображения</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/workbench')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Universe</h1>
            <p className="text-sm text-gray-600">Визуальная карта всей системы</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </Button>
          
          {selectedNodeId && (
            <Button size="sm" onClick={handleDrillDown}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Открыть узел
            </Button>
          )}
        </div>
      </header>

      {/* Universe Map */}
      <div className="flex-1">
        <UniverseMap rootNode={rootNode} onNodeClick={handleNodeClick} />
      </div>

      {/* Legend */}
      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <span className="font-medium text-gray-700">Легенда:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-gray-600">100% завершено</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-gray-600">75-99%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-gray-600">50-74%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500" />
            <span className="text-gray-600">&lt;50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-gray-600">Заблокировано</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-gray-600">Устарело</span>
          </div>
        </div>
      </div>
    </div>
  )
}
