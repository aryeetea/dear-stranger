import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
    console.log('DALL-E prompt:', imagePrompt)

    const openai = new OpenAI({ apiKey: openaiKey })
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
    })

    const tempUrl = imageResponse.data?.[0]?.url
    if (!tempUrl) throw new Error('No image URL returned from DALL-E')

    // Fetch the image and convert to base64 server-side
    const imgRes = await fetch(tempUrl)
    const buffer = await imgRes.arrayBuffer()
    const b64 = Buffer.from(buffer).toString('base64')
    const imageUrl = `data:image/png;base64,${b64}`

    // Save directly to Supabase from server if userId provided
    if (userId) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('hubs').update({ avatar_url: imageUrl }).eq('id', userId)
    }

    return NextResponse.json({ imageUrl, prompt: imagePrompt })

  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
