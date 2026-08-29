import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

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

const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['GROQ', 'NVIDIA', 'OPENROUTER', 'OPENAI', 'ANTHROPIC']),
  apiKey: z.string(),
  modelId: z.string().optional(),
  maxTokens: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await prisma.aIProvider.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    // Don't expose API keys
    const sanitized = providers.map((p) => ({
      ...p,
      apiKey: '***',
      apiKeyIv: undefined,
      apiKeyTag: undefined,
    }))

    return NextResponse.json({ providers: sanitized })
  } catch (error) {
    console.error('GET /api/ai/providers error:', error)
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
    const validated = createProviderSchema.parse(body)

    // Encrypt API key
    const { encrypted, iv, tag } = encrypt(validated.apiKey)

    const provider = await prisma.aIProvider.create({
      data: {
        name: validated.name,
        type: validated.type,
        apiKey: encrypted,
        apiKeyIv: iv,
        apiKeyTag: tag,
        modelId: validated.modelId,
        maxTokens: validated.maxTokens,
      },
    })

    return NextResponse.json(
      {
        provider: {
          ...provider,
          apiKey: '***',
          apiKeyIv: undefined,
          apiKeyTag: undefined,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/ai/providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
