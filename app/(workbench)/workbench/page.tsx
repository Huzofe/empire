'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TreeNavigation } from '@/components/workbench/tree-navigation'
import { Breadcrumbs } from '@/components/workbench/breadcrumbs'
import { ContextPanel } from '@/components/workbench/context-panel'
import { TiptapEditor } from '@/components/editor/tiptap-editor'
import { Button } from '@/components/ui/button'
import { debounce } from '@/lib/utils'
import { Plus, Search, Menu, X } from 'lucide-react'
import { JSONContent } from '@tiptap/core'

interface Node {
  id: string
  title: string
  icon?: string
  status: string
  progressCache: number
  children?: Node[]
}

export default function WorkbenchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [treeNodes, setTreeNodes] = useState<Node[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([])
  const [documentContent, setDocumentContent] = useState<JSONContent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load root node and tree
  useEffect(() => {
    async function loadTree() {
      try {
        const res = await fetch('/api/nodes')
        const data = await res.json()
        
        if (data.node) {
          setTreeNodes([data.node])
          // Auto-select root node
          if (!selectedNodeId) {
            setSelectedNodeId(data.node.id)
          }
        }
      } catch (error) {
        console.error('Failed to load tree:', error)
      }
    }

    if (status === 'authenticated') {
      loadTree()
    }
  }, [status])

  // Load selected node data
  useEffect(() => {
    async function loadNode() {
      if (!selectedNodeId) return

      try {
        const res = await fetch(`/api/nodes/${selectedNodeId}`)
        const data = await res.json()
        
        if (data.node) {
          // Load primary document
          const primaryDoc = data.node.documents?.find((d: any) => d.isPrimary)
          if (primaryDoc) {
            setDocumentContent(primaryDoc.contentJson)
          }

          // Build breadcrumbs
          // TODO: implement ancestors endpoint
          setBreadcrumbs([
            { id: data.node.id, title: data.node.title, icon: '🏛️' }
          ])
        }
      } catch (error) {
        console.error('Failed to load node:', error)
      }
    }

    loadNode()
  }, [selectedNodeId])

  // Debounced autosave
  const saveDocument = useCallback(
    async (content: JSONContent) => {
      if (!selectedNodeId) return

      setIsSaving(true)
      try {
        await fetch(`/api/documents/${selectedNodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [selectedNodeId]
  )

  const debouncedSave = useCallback(debounce(saveDocument, 2000), [saveDocument])

  const handleDocumentChange = (content: JSONContent) => {
    setDocumentContent(content)
    debouncedSave(content)
  }

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <h1 className="text-xl font-bold">Empire</h1>
          
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <Button size="sm" variant="outline">
              <Search className="w-4 h-4 mr-1" />
              Поиск
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Создать
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-sm text-gray-500">Сохранение...</span>
          )}
          {!isSaving && lastSaved && (
            <span className="text-sm text-gray-500">
              Сохранено {lastSaved.toLocaleTimeString('ru-RU')}
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{session.user?.name || session.user?.email}</span>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          items={breadcrumbs}
          onItemClick={(id) => setSelectedNodeId(id)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tree */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } lg:w-64 bg-gray-50 border-r transition-all duration-200 overflow-hidden`}
        >
          <div className="p-2 border-b bg-white">
            <h2 className="font-medium text-sm text-gray-700 px-2 py-1">Структура</h2>
          </div>
          <div className="p-2">
            <TreeNavigation
              nodes={treeNodes}
              selectedNodeId={selectedNodeId || undefined}
              onNodeSelect={setSelectedNodeId}
            />
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 overflow-auto bg-white">
          <div className="max-w-4xl mx-auto py-8 px-4">
            {selectedNodeId && documentContent ? (
              <TiptapEditor
                content={documentContent}
                onChange={handleDocumentChange}
                autoFocus
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p>Выберите узел из дерева</p>
              </div>
            )}
          </div>
        </main>

        {/* Context panel */}
        <aside className="hidden xl:block w-64 bg-gray-50 border-l">
          <div className="p-2 border-b bg-white">
            <h2 className="font-medium text-sm text-gray-700 px-2 py-1">Контекст</h2>
          </div>
          {selectedNodeId && (
            <ContextPanel
              context={{
                status: 'working',
                progress: 75,
                relationsCount: 3,
                metricsCount: 5,
                issuesCount: 0,
              }}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
