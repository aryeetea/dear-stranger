import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

function buildAvatarPrompt(answers: string[], style?: string, feedback?: string) {
  const trimmedAnswers = answers
    .map((answer) => normalizeDetail(answer))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers
    .map((answer, index) => `${index + 1}. ${answer}`)
    .join('\n')

  const styleLine = style
    ? `Overall visual style: ${normalizeDetail(style)}.`
    : 'Overall visual style: cinematic, realistic, detailed.'

  const feedbackLine = feedback?.trim()
    ? `Important revision note: ${normalizeDetail(feedback)}.`
    : ''

  return [
    'Create a single full-body character portrait.',
    styleLine,
    'Use only the details below. Do not invent unrelated traits or aesthetics.',
    'The character must be clearly visible from head to toe.',
    'Use a vertical portrait composition with a clean, readable silhouette.',
    'Keep the background simple and supportive, not busy.',
    details ? `Character details:\n${details}` : '',
    feedbackLine,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithGptImage(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'low',
    output_format: 'jpeg',
    user: userId || undefined,
  })

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('gpt-image-1 returned no image data.')
  }

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: image.revised_prompt || prompt,
  }
}

async function generateWithDalle(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    quality: 'standard',
    style: 'natural',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = response.data?.[0]
  if (image?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  throw new Error('dall-e-3 returned no image data.')
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style } = await req.json()
    const openaiKey = process.env.OPENAI_API_KEY

    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => normalizeDetail(String(answer)))
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No Soul Mirror answers were provided.' },
        { status: 400 },
      )
    }

    const imagePrompt = buildAvatarPrompt(orderedAnswers, style, feedback)
    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId)
      return NextResponse.json({ imageUrl: result.imageUrl, prompt: result.revisedPrompt })
    } catch (primaryError) {
      console.warn('gpt-image-1 avatar generation failed:', primaryError)
      const fallback = await generateWithDalle(openai, imagePrompt, userId)
      return NextResponse.json({ imageUrl: fallback.imageUrl, prompt: fallback.revisedPrompt })
    }
  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}
