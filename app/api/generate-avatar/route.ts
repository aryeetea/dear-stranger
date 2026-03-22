import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!geminiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    if (!openaiKey) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(geminiKey)
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => String(answer).trim())
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No Soul Mirror answers were provided.' }, { status: 400 })
    }

    const answersText = orderedAnswers
      .map((answer, index) => `Soul Mirror detail ${index + 1}: ${answer}`)
      .join('\n')

    const promptResult = await textModel.generateContent(`
Create a DALL-E image generation prompt for a full-body character portrait based on this Soul Mirror conversation:
${answersText}
${feedback ? `\nUser feedback for this regeneration: ${feedback}` : ''}

Rules:
- Render EXACTLY what the user described. Do not impose a style.
- If they described something modern, make it modern. If fantasy, make it fantasy. Follow their lead.
- Preserve key physical features, styling, mood, and world details from the conversation.
- Full-body portrait, character centered, visually clear from head to toe.
- Use a background that fits the user's world instead of forcing a generic cosmic scene.
- Cinematic lighting that fits the character's vibe.
- Painterly digital illustration, detailed and expressive.
- Under 140 words.

Return only the image prompt. No labels, no quotes.
`)

    const imagePrompt = promptResult.response.text().trim()
    console.log('DALL-E prompt:', imagePrompt)

    const openai = new OpenAI({ apiKey: openaiKey })
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
      style: 'natural',
      response_format: 'b64_json',
      user: userId || undefined,
    })

    const image = imageResponse.data?.[0]
    let imageUrl = ''

    if (image?.b64_json) {
      imageUrl = `data:image/png;base64,${image.b64_json}`
    } else if (image?.url) {
      const imgRes = await fetch(image.url)
      if (!imgRes.ok) throw new Error(`Image fetch failed with status ${imgRes.status}`)
      const buffer = await imgRes.arrayBuffer()
      const b64 = Buffer.from(buffer).toString('base64')
      imageUrl = `data:image/png;base64,${b64}`
    }

    if (!imageUrl) throw new Error('No image data returned from OpenAI')

    return NextResponse.json({
      imageUrl,
      prompt: image?.revised_prompt || imagePrompt,
    })

  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
