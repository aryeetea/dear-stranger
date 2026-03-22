import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

async function generateAvatarImage(openai: OpenAI, prompt: string, userId?: string) {
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536',
      quality: 'medium',
      output_format: 'png',
      user: userId || undefined,
    })

    const image = response.data?.[0]
    if (image?.b64_json) {
      return {
        imageUrl: `data:image/png;base64,${image.b64_json}`,
        revisedPrompt: image.revised_prompt || prompt,
      }
    }
  } catch (error) {
    console.warn('gpt-image-1 failed, falling back to dall-e-3:', error)
  }

  const fallback = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    quality: 'standard',
    style: 'natural',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = fallback.data?.[0]
  if (!image) {
    throw new Error('No image was returned from OpenAI.')
  }

  if (image.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  if (image.url) {
    const imgRes = await fetch(image.url)
    if (!imgRes.ok) {
      throw new Error(`Image fetch failed with status ${imgRes.status}`)
    }

    const buffer = await imgRes.arrayBuffer()
    const b64 = Buffer.from(buffer).toString('base64')
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  throw new Error('No image data returned from OpenAI.')
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY' },
        { status: 500 }
      )
    }

    if (!openaiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => String(answer).trim())
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No Soul Mirror answers were provided.' },
        { status: 400 }
      )
    }

    const answersText = orderedAnswers
      .map((answer, index) => `Detail ${index + 1}: ${answer}`)
      .join('\n')

    const genAI = new GoogleGenerativeAI(geminiKey)
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const promptResult = await textModel.generateContent(`
You are writing one clean image prompt for a character portrait generator.

User character details:
${answersText}
${feedback ? `\nRegeneration feedback: ${feedback}` : ''}
${style ? `\nRequested portrait style: ${style}` : ''}

Rules:
- Follow the user's description exactly.
- Do not add random traits, themes, or aesthetics.
- Keep the character's physical features, clothing, mood, and overall vibe accurate.
- Make it a full body portrait.
- Keep the image vertical and portrait oriented.
- Character must be clearly visible from head to toe.
- Use a fitting background only if it supports what the user described.
- Do not make the scene too busy.
- Keep the wording direct and visually specific.
- Keep it under 110 words.

Return only the final image prompt.
`)

    const imagePrompt = promptResult.response.text().trim()

    if (!imagePrompt) {
      throw new Error('Failed to create image prompt.')
    }

    console.log('Avatar image prompt:', imagePrompt)

    const openai = new OpenAI({ apiKey: openaiKey })
    const { imageUrl, revisedPrompt } = await generateAvatarImage(openai, imagePrompt, userId)

    return NextResponse.json({
      imageUrl,
      prompt: revisedPrompt,
    })
  } catch (error) {
    console.error('generate-avatar error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate avatar.',
      },
      { status: 500 }
    )
  }
}
