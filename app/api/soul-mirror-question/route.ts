import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MIN_EXCHANGES = 10
const MAX_EXCHANGES = 20

export async function POST(req: Request) {
  try {
    const { messages, answers, exchangeNumber, style, styleDescription } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const conversationSoFar = (messages || [])
      .map((m: { role: string; text: string }) =>
        m.role === 'ai' ? `You: ${m.text}` : `Them: ${m.text}`
      )
      .join('\n')

    const answersText = Object.entries(answers || {})
      .map(([key, value]) => `${String(key)}: ${String(value)}`)
      .join('\n')

    const selectedStyle = typeof style === 'string' && style.trim() ? style.trim() : 'Fantasy Modern'
    const selectedStyleDescription =
      typeof styleDescription === 'string' && styleDescription.trim()
        ? styleDescription.trim()
        : 'a mix of magical and modern style'

    const isFirst = exchangeNumber === 0
    const isForced = exchangeNumber >= MAX_EXCHANGES - 1
    const canEnd = exchangeNumber >= MIN_EXCHANGES

    if (canEnd && !isForced) {
      const checkResult = await model.generateContent(`
Review this Soul Mirror conversation.

The chosen avatar style is:
- ${selectedStyle}
- ${selectedStyleDescription}

Do you have a vivid enough picture of this person to create a full-body avatar of them, including:
- their energy
- their world
- their presence
- their clothing/fashion
- their overall visual identity

Answer only YES or NO.

Conversation:
${conversationSoFar || 'None yet'}

Answers so far:
${answersText || 'None yet'}
`)

      const hasEnough = checkResult.response.text().trim().toUpperCase().startsWith('YES')

      if (hasEnough) {
        const closingResult = await model.generateContent(`
You are the Soul Mirror.

You now have a clear vision of this person and are ready to create their avatar.

Write a warm closing message under 25 words saying you can see them now and you're ready to bring them to life.
Make it feel personal.
Return only the message.

Conversation:
${conversationSoFar || 'None yet'}
`)
        return NextResponse.json({
          question: closingResult.response.text().trim(),
          done: true,
        })
      }
    }

    if (isForced) {
      const closingResult = await model.generateContent(`
You are the Soul Mirror.
Write a warm closing message under 20 words saying you can see them clearly now.
Return only the message.
`)
      return NextResponse.json({
        question: closingResult.response.text().trim(),
        done: true,
      })
    }

    const prompt = `
You are the Soul Mirror — a warm, curious guide inside a cosmic pen-pal universe called Dear Stranger.

Your job is to understand the user well enough to help create a full-body avatar image of them.

The user has already chosen an avatar style:
- Style: ${selectedStyle}
- Style direction: ${selectedStyleDescription}

This selected style should influence the kind of questions you ask.
For example:
- Modern = ask about fashion, silhouette, styling, confidence, environment, vibe
- Fantasy = ask about magical presence, role, symbolic details, world, aura
- Fantasy Modern = ask about both modern fashion and fantasy energy
- Celestial = ask about cosmic elements, glow, divine atmosphere
- Royal = ask about elegance, status, poise, luxurious details
- Streetwear = ask about bold style, attitude, fashion pieces, expression
- Futuristic = ask about advanced materials, sleek design, glowing details
- Nature Inspired = ask about earthy beauty, floral details, natural presence

Rules:
- Ask exactly ONE question
- Under 20 words
- Warm and curious
- Natural and conversational
- Build on what they already said
- Help reveal what their full-body avatar should look and feel like
- Ask about things like presence, clothing, silhouette, role, world, energy, accessories, movement, atmosphere
- You must eventually ask at least one question about what they wear or how they present themselves visually
- Do NOT ask dry or clinical questions
- Do NOT ask direct basic questions like "what color is your hair"
- Do NOT force fantasy if the user's chosen style is more modern
${isFirst ? '- First message: ask exactly "In another world, how do you see yourself?"' : ''}

Conversation so far:
${conversationSoFar || 'None yet'}

Answers so far:
${answersText || 'None yet'}

Good directions:
- what kind of world they belong to
- what they wear
- what kind of presence they have
- what they carry
- what role they play
- what energy surrounds them
- what details make them stand out
- what kind of movement or posture fits them
- what kind of home, place, or atmosphere matches them
- what fashion or styling feels most like them

Return only the next question. No labels. No quotes.
`

    const result = await model.generateContent(prompt)

    return NextResponse.json({
      question: result.response.text().trim(),
      done: false,
    })
  } catch (error) {
    console.error('soul-mirror-question error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}