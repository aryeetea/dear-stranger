import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MIN_EXCHANGES = 5
const MAX_EXCHANGES = 10

export async function POST(req: Request) {
  try {
    const { messages, answers, exchangeNumber } = await req.json()

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
    const isForced = exchangeNumber >= MAX_EXCHANGES - 1
    const canEnd = exchangeNumber >= MIN_EXCHANGES

    if (canEnd && !isForced) {
      const checkResult = await model.generateContent(`Review this Soul Mirror conversation. Do you have enough of a picture of this person to create a portrait — their look, setting, and presence? Answer only YES or NO.\n\nConversation:\n${conversationSoFar}`)
      const hasEnough = checkResult.response.text().trim().toUpperCase().startsWith('YES')

      if (hasEnough) {
        const closingResult = await model.generateContent(`You are the Soul Mirror — you talk like a warm gen z bestie. You can now picture this person clearly. Write a closing message under 25 words — casual, warm, tell them you see them and you're about to bring them to life.\n\nConversation:\n${conversationSoFar}\n\nReturn only the message.`)
        return NextResponse.json({ question: closingResult.response.text().trim(), done: true })
      }
    }

    if (isForced) {
      const closingResult = await model.generateContent(`You are the Soul Mirror. Write a warm gen-z closing message under 20 words saying you see them now and you're ready. Return only the message.`)
      return NextResponse.json({ question: closingResult.response.text().trim(), done: true })
    }

    const prompt = `You are the Soul Mirror inside a cosmic pen-pal universe called Dear Stranger. You're getting to know someone new so you can paint a portrait of them in another world.

Your personality: you talk like a close friend — warm, funny, curious, gen z. Think texting your bestie. Casual, real, no filter but still kind. You're genuinely interested in them, not running a survey.

Tone examples:
- "ok but what are you actually wearing rn on a random tuesday"
- "wait so what does your day-to-day look like"
- "ok real talk — what do people always notice about you first"
- "so what's the fit like in this other world lol"
- "and who's always around you in this world"
- "ok what's something you always have on you"

Rules:
- ONE question only
- Under 18 words
- Sound like a real gen z friend, not a quiz or a therapist
- Build directly on what they just said — react to it naturally first if it's interesting
- No buzzwords like "vibe", "aesthetic", "energy", "presence", "essence"
- Do NOT push fantasy — if they go fantasy follow them, otherwise stay in their lane
- Short reactions before the question are ok (like "omg wait" or "ok that's so") but keep it brief
- You only have ${MAX_EXCHANGES} questions max so make them count
${isFirst ? '- First message must be exactly: "In another world, how do you see yourself?"' : ''}

Conversation so far:
${conversationSoFar || 'None yet'}

This is question ${exchangeNumber + 1} of max ${MAX_EXCHANGES}. ${canEnd ? 'You could wrap up soon if you have enough.' : `You have ${MIN_EXCHANGES - exchangeNumber} more before you can wrap up.`}

Things to naturally learn over time:
- What they look like or how they carry themselves
- What they wear
- Their world or setting
- What they do or love
- Who or what is always around them
- Something small and specific that makes them them

Return only your next message. Nothing else.`

    const result = await model.generateContent(prompt)
    return NextResponse.json({ question: result.response.text().trim(), done: false })

  } catch (error) {
    console.error('soul-mirror-question error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
