'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface UniverseNode {
  id: string
  title: string
  type: string
  status: string
  progressCache: number
  position?: { x: number; y: number }
  children?: UniverseNode[]
}

interface UniverseMapProps {
  rootNode: UniverseNode
  onNodeClick?: (nodeId: string) => void
}

function convertToFlowNodes(node: UniverseNode, level: number = 0, parentX: number = 0): Node[] {
  const nodes: Node[] = []
  
  // Calculate position
  const x = node.position?.x ?? parentX
  const y = node.position?.y ?? level * 200

  // Determine color based on progress
  const getNodeColor = (progress: number, status: string) => {
    if (status === 'blocked') return '#ef4444'
    if (status === 'stale') return '#f97316'
    if (progress === 100) return '#22c55e'
    if (progress >= 75) return '#3b82f6'
    if (progress >= 50) return '#eab308'
    return '#6b7280'
  }

  nodes.push({
    id: node.id,
    type: 'default',
    position: { x, y },
    data: {
      label: (
        <div className="text-center">
          <div className="font-medium text-sm">{node.title}</div>
          <div className="text-xs text-gray-600 mt-1">{node.progressCache}%</div>
        </div>
      ),
    },
    style: {
      background: getNodeColor(node.progressCache, node.status),
      color: 'white',
      border: '2px solid #fff',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      width: 180,
    },
  })

  // Add children
  if (node.children && node.children.length > 0) {
    const childSpacing = 300
    const startX = x - ((node.children.length - 1) * childSpacing) / 2

    node.children.forEach((child, index) => {
      const childX = startX + index * childSpacing
      nodes.push(...convertToFlowNodes(child, level + 1, childX))
    })
  }

  return nodes
}

function convertToFlowEdges(node: UniverseNode): Edge[] {
  const edges: Edge[] = []

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        animated: child.status === 'in_progress',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      })

      edges.push(...convertToFlowEdges(child))
    })
  }

  return edges
}

export function UniverseMap({ rootNode, onNodeClick }: UniverseMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    const flowNodes = convertToFlowNodes(rootNode)
    const flowEdges = convertToFlowEdges(rootNode)
    
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [rootNode, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const style = node.style as any
            return style?.background || '#6b7280'
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  )
}
