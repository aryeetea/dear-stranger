import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { answers } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const answersText = Object.entries(answers || {})
      .map(([i, a]) => `Answer ${Number(i) + 1}: ${String(a)}`)
      .join('\n')

    const [bioResult, askResult] = await Promise.all([
      model.generateContent(`
Write a 2 sentence poetic bio for a pen-pal platform user based on their Soul Mirror answers:
${answersText}
- Third person, mysterious and reflective
- Under 30 words
- No mentions of space or stars directly
Return only the bio text.
`),
      model.generateContent(`
Write an "Ask me about" line based on these Soul Mirror answers:
${answersText}
- 3 to 4 comma-separated topics
- Personal and specific
- Under 20 words
- Do not start with "Ask me about"
Return only the list.
`),
    ])

    return NextResponse.json({
      bio: bioResult.response.text().trim(),
      askAbout: askResult.response.text().trim(),
    })

  } catch (error) {
    console.error('generate-bio error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
