import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { answers, step, totalAiSteps } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const priorAnswersText = Object.entries(answers || {})
      .map(([index, answer]) => `Answer ${Number(index) + 1}: ${String(answer)}`)
      .join('\n')

    const prompt = `
You are writing one mystical onboarding question for a surreal social universe called Soul Mirror.

The purpose is to help a user describe the look, aura, and symbolism of their avatar.

Rules:
- Ask exactly one question.
- Make it poetic, elegant, and clear.
- Keep it under 28 words.
- Do not greet the user.
- Do not explain anything.
- Do not number the question.
- Ask something visually useful for designing an avatar.
- Each question should feel different from the previous ones.
- This is question ${step + 1} out of ${totalAiSteps}.

Previous answers:
${priorAnswersText || 'None yet'}

Good themes:
- appearance
- aura
- expression
- colors
- clothing
- symbols
- celestial details
- emotional presence

Return only the question text.
`

    const result = await model.generateContent(prompt)
    const question = result.response.text().trim()

    return NextResponse.json({ question })
  } catch (error) {
    console.error('soul-mirror-question error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate Soul Mirror question',
      },
      { status: 500 }
    )
  }
} 