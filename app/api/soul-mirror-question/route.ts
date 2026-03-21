import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { messages, exchangeNumber, totalExchanges } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const conversationSoFar = (messages || [])
      .map((m: { role: string; text: string }) =>
        m.role === 'ai' ? `You: ${m.text}` : `Them: ${m.text}`
      )
      .join('\n')

    const isFirst = exchangeNumber === 0
    const isLast = exchangeNumber === totalExchanges - 1

    const prompt = `You are the Soul Mirror — a warm, curious guide inside a cosmic pen-pal universe called Dear Stranger. You are having a conversation with a new arrival to help create their fantasy avatar.

The avatar style you are building toward: dark fantasy RPG art. Think a powerful sorceress or warrior with flowing robes or armor, navy and white color palette, gold accents, a dragon or mystical creature companion, dramatic starlit sky background.

Rules:
- Ask exactly ONE question per message
- Under 20 words
- Casual and warm, not formal
- Build naturally on what they said
- Do not repeat topics
- This is message ${exchangeNumber + 1} of ${totalExchanges}
${isFirst ? '- First message: ask exactly "In another world, how do you see yourself?"' : ''}
${isLast ? '- Last question: wrap up warmly, something that feels like a final touch.' : ''}

${conversationSoFar ? `Conversation so far:\n${conversationSoFar}` : ''}

Guide the conversation to uncover:
- Their other-world appearance (hair, skin, eyes)
- Their colors and aesthetic
- Their power or role (mage, warrior, healer)
- A creature or companion they would have
- Something they always carry
- Their emotional presence

Return only your next message. No labels, no quotes.`

    const result = await model.generateContent(prompt)
    const question = result.response.text().trim()
    return NextResponse.json({ question })

  } catch (error) {
    console.error('soul-mirror-question error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
