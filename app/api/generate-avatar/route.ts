import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { fal } from '@fal-ai/client'

export const maxDuration = 60

type Mode = 'create' | 'reimagine'

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

function buildAvatarPrompt(
  answers: string[],
  _style?: string,
  feedback?: string,
  mode: Mode = 'create',
) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers.join(', ')

  const modeNote =
    mode === 'reimagine'
      ? `This is a reimagined version. Keep the character's core identity recognizable, but make the requested changes clearly visible through the outfit, pose, lighting, or atmosphere.`
      : ''

  const feedbackLine = feedback?.trim()
    ? `Specific changes requested: ${normalizeDetail(feedback)}.`
    : ''

  return [
    details
      ? `Create a full body character portrait. The character is described as: ${details}. Match the person's appearance, skin tone, hair, clothing, body, and features closely to the description provided.`
      : `Create a full body character portrait of a mysterious figure in a cinematic illustrated style.`,
    modeNote,
    feedbackLine,
    `Rendering: painterly digital illustration, cinematic quality, full body visible head to toe, vertical composition, face clearly lit and readable, rich atmospheric background that complements the character, no text, no watermark, no logo.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function parseAnswers(answers: unknown): string[] {
  if (!answers || typeof answers !== 'object') return []

  return Object.entries(answers as Record<string, unknown>)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, answer]) => normalizeDetail(String(answer ?? '')))
    .filter(Boolean)
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId?: string,
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1.5',
    prompt: prompt.slice(0, 4000),
    size: '1024x1536',
    quality: 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('gpt-image-1.5 returned no image data.')
  }

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
    provider: 'gpt-image-1.5',
  }
}

async function generateWithDallE3(openai: OpenAI, prompt: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt.slice(0, 4000),
    size: '1024x1792',
    quality: 'hd',
    response_format: 'b64_json',
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('dall-e-3 returned no image data.')
  }

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
    provider: 'dall-e-3',
  }
}

async function generateWithSeedream(prompt: string) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('Missing FAL_KEY')

  fal.config({ credentials: falKey })

  const result = (await fal.subscribe(
    'fal-ai/bytedance/seedream/v3/text-to-image',
    {
      input: {
        prompt,
        image_size: { width: 1024, height: 1536 },
        num_images: 1,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      },
    },
  )) as { data?: { images?: Array<{ url?: string }> } }

  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) {
    throw new Error('Seedream returned no image URL.')
  }

  const imageResp = await fetch(imageUrl)
  if (!imageResp.ok) {
    throw new Error(`Failed to fetch Seedream image: ${imageResp.status}`)
  }

  const buffer = await imageResp.arrayBuffer()
  const b64 = Buffer.from(buffer).toString('base64')

  return {
    imageUrl: `data:image/jpeg;base64,${b64}`,
    revisedPrompt: prompt,
    provider: 'seedream-v3',
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      answers,
      feedback,
      userId,
      style,
      mode,
    }: {
      answers?: unknown
      feedback?: string
      userId?: string
      style?: string
      mode?: string
    } = body

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 },
      )
    }

    const orderedAnswers = parseAnswers(answers)
    if (orderedAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No answers provided.' },
        { status: 400 },
      )
    }

    const generationMode: Mode = mode === 'reimagine' ? 'reimagine' : 'create'

    const imagePrompt = buildAvatarPrompt(
      orderedAnswers,
      style,
      feedback,
      generationMode,
    )

    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
        provider: result.provider,
      })
    } catch (gptError) {
      console.warn('gpt-image-1.5 failed, trying dall-e-3:', gptError)

      try {
        const result = await generateWithDallE3(openai, imagePrompt)
        return NextResponse.json({
          imageUrl: result.imageUrl,
          prompt: result.revisedPrompt,
          provider: result.provider,
        })
      } catch (dalleError) {
        console.warn('dall-e-3 failed, trying Seedream:', dalleError)

        const result = await generateWithSeedream(imagePrompt)
        return NextResponse.json({
          imageUrl: result.imageUrl,
          prompt: result.revisedPrompt,
          provider: result.provider,
        })
      }
    }
  } catch (error) {
    console.error('generate-avatar error:', error)

    return NextResponse.json(
      { error: toErrorMessage(error) || 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}