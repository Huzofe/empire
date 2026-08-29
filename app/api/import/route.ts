import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createImportSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  content: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const imports = await prisma.importStaging.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ imports })
  } catch (error) {
    console.error('GET /api/import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createImportSchema.parse(body)

    // Parse content based on type
    let parsedContent: any = {}
    let proposedStructure: any = null

    if (validated.fileType === 'text/plain' || validated.fileType === 'text/markdown') {
      parsedContent = parseTextContent(validated.content)
      proposedStructure = proposeStructure(parsedContent)
    }

    const importRecord = await prisma.importStaging.create({
      data: {
        fileName: validated.fileName,
        fileType: validated.fileType,
        rawContent: validated.content,
        parsedContent,
        proposedStructure,
        status: 'pending',
      },
    })

    return NextResponse.json({ import: importRecord }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function parseTextContent(content: string) {
  const lines = content.split('\n')
  const sections: any[] = []
  
  let currentSection: any = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check for headers
    if (trimmed.startsWith('#')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      
      const level = (trimmed.match(/^#+/) || [''])[0].length
      const title = trimmed.replace(/^#+\s*/, '')
      
      currentSection = {
        level,
        title,
        content: [],
      }
    } else if (trimmed && currentSection) {
      currentSection.content.push(trimmed)
    }
  }
  
  if (currentSection) {
    sections.push(currentSection)
  }
  
  return { sections }
}

function proposeStructure(parsed: any) {
  const { sections } = parsed
  
  if (!sections || sections.length === 0) {
    return null
  }
  
  // Simple heuristic: top-level headers become nodes
  const nodes = sections
    .filter((s: any) => s.level === 1)
    .map((s: any) => ({
      title: s.title,
      type: 'project',
      description: s.content.join('\n'),
      children: sections
        .filter((child: any) => child.level === 2)
        .map((child: any) => ({
          title: child.title,
          type: 'task',
          description: child.content.join('\n'),
        })),
    }))
  
  return { nodes }
}
