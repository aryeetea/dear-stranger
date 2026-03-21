import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const { answers } = await req.json()

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
Create a DALL-E image prompt for a dark fantasy RPG character portrait based on:
${answersText}

Requirements:
- Dark fantasy RPG digital painting style, like World of Warcraft fantasy card art
- Cosmic backdrop: deep navy and purple night sky, aurora borealis, distant stars
- Color palette: deep navy, midnight purple, gold, ice blue, soft white
- Ornate robes or armor with gold trim and glowing runic details
- Cinematic cool lighting with gold and blue accents
- Portrait format, character centered, looking toward viewer
- Calm, powerful, introspective character
- Under 100 words

Return only the image prompt.
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
    })

    const imageUrl = imageResponse.data?.[0]?.url
    if (!imageUrl) throw new Error('No image URL returned from DALL-E')

    console.log('Avatar generated successfully')
    return NextResponse.json({ imageUrl, prompt: imagePrompt })

  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
