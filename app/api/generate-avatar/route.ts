import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const { answers, feedback } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!geminiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    if (!openaiKey) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(geminiKey)
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const answersText = Object.entries(answers || {})
      .map(([i, a]) => `Answer ${Number(i) + 1}: ${String(a)}`)
      .join('\n')

    const promptResult = await textModel.generateContent(`
Create a DALL-E image generation prompt for a full body character portrait based on this description:
${answersText}
${feedback ? `\nUser feedback for this regeneration: ${feedback}` : ''}

Rules:
- Render EXACTLY what the user described. Do not impose a style.
- If they described something modern, make it modern. If fantasy, make it fantasy. Follow their lead.
- Full body portrait, character centered, detailed and expressive
- Dramatic cosmic backdrop with deep navy sky and subtle aurora borealis
- Cinematic lighting that fits the character's vibe
- Digital art style, painterly and detailed
- Under 120 words

Return only the image prompt. No labels, no quotes.
`)

    const imagePrompt = promptResult.response.text().trim()

    const openai = new OpenAI({ apiKey: openaiKey })
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
      response_format: 'b64_json',
    })

    const b64 = imageResponse.data?.[0]?.b64_json
    if (!b64) throw new Error('No image data returned from DALL-E')

    // Return as data URL — permanent, no expiry
    const imageUrl = `data:image/png;base64,${b64}`

    return NextResponse.json({ imageUrl, prompt: imagePrompt })

  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
