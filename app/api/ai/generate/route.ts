import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const generateSchema = z.object({
  providerId: z.string(),
  prompt: z.string().min(1),
  context: z.array(z.string()).optional(),
  maxTokens: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = generateSchema.parse(body)

    const provider = await prisma.aIProvider.findUnique({
      where: { id: validated.providerId },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // TODO: Implement actual AI generation based on provider type
    // For now, return a mock response
    const response = {
      text: 'AI generation not yet implemented. This is a placeholder response.',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }

    // Log the request
    await prisma.aIRequest.create({
      data: {
        providerId: validated.providerId,
        prompt: validated.prompt,
        response: response.text,
        tokensUsed: response.usage.totalTokens,
        requestedById: session.user.id,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/ai/generate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
