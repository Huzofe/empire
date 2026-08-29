import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const createDataSourceSchema = z.object({
  nodeId: z.string(),
  name: z.string().min(1).max(200),
  type: z.enum(['REST', 'WEBHOOK', 'CSV', 'DATABASE']),
  config: z.any(),
  syncFrequency: z.string().optional(),
  mapping: z.any().optional(),
})

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production-32b'
const ALGORITHM = 'aes-256-gcm'

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  }
}

function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    const where: any = { deletedAt: null }
    if (nodeId) where.nodeId = nodeId

    const dataSources = await prisma.dataSource.findMany({
      where,
      include: {
        node: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Don't expose encrypted credentials
    const sanitized = dataSources.map((ds) => ({
      ...ds,
      config: { ...ds.config, credentials: undefined },
    }))

    return NextResponse.json({ dataSources: sanitized })
  } catch (error) {
    console.error('GET /api/datasources error:', error)
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
    const validated = createDataSourceSchema.parse(body)

    // Encrypt sensitive data in config
    let encryptedConfig = validated.config
    if (validated.config.credentials) {
      const { encrypted, iv, tag } = encrypt(
        JSON.stringify(validated.config.credentials)
      )
      encryptedConfig = {
        ...validated.config,
        credentials: { encrypted, iv, tag },
      }
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        nodeId: validated.nodeId,
        name: validated.name,
        type: validated.type,
        config: encryptedConfig,
        syncFrequency: validated.syncFrequency,
        mapping: validated.mapping,
      },
      include: {
        node: true,
      },
    })

    return NextResponse.json({ dataSource }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/datasources error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
