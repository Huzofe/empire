import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { nodesService } from '@/modules/nodes/nodes.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const importRecord = await prisma.importStaging.findUnique({
      where: { id: params.id },
    })

    if (!importRecord) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 })
    }

    if (importRecord.status !== 'pending') {
      return NextResponse.json(
        { error: 'Import already processed' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { parentNodeId, structure } = body

    // Apply the structure
    const createdNodes = await applyStructure(
      structure || importRecord.proposedStructure,
      parentNodeId
    )

    // Mark import as completed
    await prisma.importStaging.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        appliedAt: new Date(),
      },
    })

    return NextResponse.json({ createdNodes })
  } catch (error) {
    console.error('POST /api/import/[id]/apply error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function applyStructure(structure: any, parentNodeId?: string) {
  const createdNodes: any[] = []
  
  if (!structure || !structure.nodes) {
    return createdNodes
  }
  
  for (const nodeData of structure.nodes) {
    const node = await nodesService.createNode({
      parentId: parentNodeId,
      typeCode: nodeData.type || 'project',
      title: nodeData.title,
      description: nodeData.description,
    })
    
    createdNodes.push(node)
    
    // Create children recursively
    if (nodeData.children && nodeData.children.length > 0) {
      const childStructure = { nodes: nodeData.children }
      const children = await applyStructure(childStructure, node.id)
      createdNodes.push(...children)
    }
  }
  
  return createdNodes
}
