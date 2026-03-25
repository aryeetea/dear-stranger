import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { fal } from '@fal-ai/client'

export const maxDuration = 60

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
  mode: 'create' | 'reimagine' = 'create',
) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers.join(' — ')

  const modeNote = mode === 'reimagine'
    ? `This is a reimagined version. Keep the character's core identity recognizable but make the changes clearly visible — alter lighting, pose, outfit, or atmosphere so the difference is dramatic.`
    : ''

  const feedbackLine = feedback?.trim()
    ? `Specific changes requested: ${normalizeDetail(feedback)}.`
    : ''

  return [
    details
      ? `Create a full-body character portrait. The character is described as: ${details}. Represent this person EXACTLY as described — their appearance, skin tone, hair, clothing, body, and features must match their description precisely. Do not substitute, stylize over, or drift from what they described. Their description is the only authority on the character's look.`
      : `Create a full-body character portrait of a mysterious figure in a cinematic illustrated style.`,
    modeNote,
    feedbackLine,
    `Rendering: painterly digital illustration, cinematic quality. Full body visible head to toe, vertical composition. Face clearly lit and readable — never buried in shadow. Rich atmospheric background that complements the character. No text, watermarks, or logos.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithDallE3(openai: OpenAI, prompt: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt.slice(0, 4000),
    size: '1024x1792',
    quality: 'hd',
    response_format: 'b64_json',
  })

  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('dall-e-3 returned no image data.')

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId?: string,
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('gpt-image-1 returned no image data.')

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

async function generateWithSeedream(prompt: string) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('Missing FAL_KEY')
  fal.config({ credentials: falKey })
  const result = await fal.subscribe('fal-ai/seedream-3', {
    input: {
      prompt,
      image_size: { width: 1024, height: 1536 },
      num_images: 1,
      guidance_scale: 7.5,
      num_inference_steps: 30,
    },
  }) as { data: { images: { url: string }[] } }
  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('Seedream returned no image URL.')
  const imageResp = await fetch(imageUrl)
  if (!imageResp.ok) throw new Error('Failed to fetch Seedream image.')
  const buffer = await imageResp.arrayBuffer()
  const b64 = Buffer.from(buffer).toString('base64')
  return {
    imageUrl: `data:image/jpeg;base64,${b64}`,
    revisedPrompt: prompt,
  }
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style, mode } = await req.json()

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => normalizeDetail(String(answer)))
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No answers provided.' }, { status: 400 })
    }

    const generationMode: 'create' | 'reimagine' =
      mode === 'reimagine' ? 'reimagine' : 'create'

    const imagePrompt = buildAvatarPrompt(
      orderedAnswers,
      style,
      feedback,
      generationMode,
    )

    const openai = new OpenAI({ apiKey: openaiKey })

    // DALL-E 3 is primary (widely available); gpt-image-1 and Seedream are fallbacks
    try {
      const result = await generateWithDallE3(openai, imagePrompt)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      console.warn('DALL-E 3 failed, trying gpt-image-1:', primaryError)
      try {
        const gptImg = await generateWithGptImage(openai, imagePrompt, userId)
        return NextResponse.json({
          imageUrl: gptImg.imageUrl,
          prompt: gptImg.revisedPrompt,
        })
      } catch (gptError) {
        console.warn('gpt-image-1 failed, falling back to Seedream via fal.ai:', gptError)
        const seedream = await generateWithSeedream(imagePrompt)
        return NextResponse.json({
          imageUrl: seedream.imageUrl,
          prompt: seedream.revisedPrompt,
        })
      }
    }
  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}