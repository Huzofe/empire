'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface TreeNode {
  id: string
  title: string
  icon?: string
  children?: TreeNode[]
  isExpanded?: boolean
}

interface TreeNavigationProps {
  nodes: TreeNode[]
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
}

function TreeItem({
  node,
  level = 0,
  selectedNodeId,
  onNodeSelect,
  onToggle,
}: {
  node: TreeNode
  level?: number
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
  onToggle: (nodeId: string) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = node.id === selectedNodeId

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded ${
          isSelected ? 'bg-blue-50 text-blue-600' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onNodeSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        {node.icon && <span className="text-sm">{node.icon}</span>}
        
        <span className="text-sm truncate flex-1">{node.title}</span>
      </div>

      {hasChildren && node.isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeNavigation({
  nodes,
  selectedNodeId,
  onNodeSelect,
}: TreeNavigationProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const handleToggle = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const addExpanded = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => ({
      ...node,
      isExpanded: expandedNodes.has(node.id),
      children: node.children ? addExpanded(node.children) : undefined,
    }))
  }

  const enrichedNodes = addExpanded(nodes)

  return (
    <div className="h-full overflow-y-auto">
      {enrichedNodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
