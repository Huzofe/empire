import { prisma } from '@/lib/db'
import { JSONContent } from '@tiptap/core'

export class DocumentsService {
  async createDocument(data: {
    nodeId: string
    title: string
    parentDocumentId?: string
    contentJson?: JSONContent
    createdById: string
  }) {
    // Extract plain text from JSON for search
    const plainText = this.extractPlainText(data.contentJson)

    const document = await prisma.document.create({
      data: {
        nodeId: data.nodeId,
        parentDocumentId: data.parentDocumentId,
        title: data.title,
        contentJson: data.contentJson || { type: 'doc', content: [] },
        plainText,
        createdById: data.createdById,
      },
      include: {
        node: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return document
  }

  async updateDocument(
    id: string,
    data: {
      title?: string
      contentJson?: JSONContent
      sortOrder?: number
    },
    userId: string
  ) {
    const plainText = data.contentJson ? this.extractPlainText(data.contentJson) : undefined

    const document = await prisma.document.update({
      where: { id },
      data: {
        title: data.title,
        contentJson: data.contentJson,
        plainText,
        sortOrder: data.sortOrder,
      },
    })

    // Create version snapshot every 10 updates or on significant changes
    const shouldCreateVersion = await this.shouldCreateVersion(id)
    if (shouldCreateVersion && data.contentJson) {
      await this.createVersion(id, data.contentJson, userId)
    }

    return document
  }

  async getDocument(id: string) {
    return prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: {
        node: true,
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
  }

  async getNodeDocuments(nodeId: string) {
    return prisma.document.findMany({
      where: {
        nodeId,
        deletedAt: null,
        parentDocumentId: null, // Only root documents
      },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
  }

  async deleteDocument(id: string) {
    return prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  private async createVersion(
    documentId: string,
    contentJson: JSONContent,
    createdById: string,
    reason?: string
  ) {
    const plainText = this.extractPlainText(contentJson)

    return prisma.documentVersion.create({
      data: {
        documentId,
        contentJson,
        plainText,
        createdById,
        reason: reason || 'auto-save',
      },
    })
  }

  private async shouldCreateVersion(documentId: string): Promise<boolean> {
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })

    if (!lastVersion) return true

    // Create version if last one was more than 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    return lastVersion.createdAt < tenMinutesAgo
  }

  private extractPlainText(content?: JSONContent): string {
    if (!content) return ''

    let text = ''

    if (content.type === 'text' && content.text) {
      text += content.text
    }

    if (content.content && Array.isArray(content.content)) {
      for (const child of content.content) {
        text += this.extractPlainText(child) + ' '
      }
    }

    return text.trim()
  }

  async searchDocuments(query: string, nodeId?: string) {
    const where: any = {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { plainText: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (nodeId) {
      where.nodeId = nodeId
    }

    return prisma.document.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      take: 50,
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  async getVersion(versionId: string) {
    return prisma.documentVersion.findUnique({
      where: { id: versionId },
    })
  }

  async restoreVersion(documentId: string, versionId: string, userId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.documentId !== documentId) {
      throw new Error('Version not found')
    }

    // Create a version from current state before restoring
    const currentDoc = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (currentDoc?.contentJson) {
      await this.createVersion(
        documentId,
        currentDoc.contentJson as JSONContent,
        userId,
        'before-restore'
      )
    }

    // Restore from version
    return this.updateDocument(
      documentId,
      {
        contentJson: version.contentJson as JSONContent,
      },
      userId
    )
  }
}

export const documentsService = new DocumentsService()
