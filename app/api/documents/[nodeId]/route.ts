import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { documentsService } from '@/modules/documents/documents.service'
import { z } from 'zod'

const updateDocumentSchema = z.object({
  content: z.any(),
  title: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateDocumentSchema.parse(body)

    // Find primary document for this node
    const documents = await documentsService.getNodeDocuments(params.nodeId)
    const primaryDoc = documents.find((d) => d.isPrimary)

    if (!primaryDoc) {
      return NextResponse.json(
        { error: 'Primary document not found' },
        { status: 404 }
      )
    }

    const updated = await documentsService.updateDocument(
      primaryDoc.id,
      {
        contentJson: validated.content,
        title: validated.title,
      },
      session.user.id
    )

    return NextResponse.json({ document: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PUT /api/documents/[nodeId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
