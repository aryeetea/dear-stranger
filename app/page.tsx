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
You are asking a user simple questions to help design their avatar.

Rules:
- Ask ONLY ONE question
- Use simple, clear English
- Keep it under 20 words
- Make it easy to understand
- Do NOT be overly poetic
- Do NOT be confusing
- Do NOT explain anything
- Do NOT greet the user

This is question ${step + 1} of ${totalAiSteps}.

Previous answers:
${priorAnswersText || 'None yet'}

Ask about things like:
- appearance
- vibe
- colors
- clothing
- personality
- energy

Examples of good questions:
- What do you want your avatar to look like?
- What kind of vibe should your avatar have?
- What colors do you like for your avatar?
- Should your avatar feel calm, powerful, or mysterious?

Return ONLY the question.
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