import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const VOICE_PROMPTS: Record<string, string> = {
  friend: `You are a warm, gentle, encouraging friend helping someone create their avatar. You speak with genuine care and interest — never clinical, never performative. Use natural, conversational language.`,
  poetic: `You are poetic and mysterious. Speak in metaphors and layered imagery. Let silence breathe. Ask questions that feel like riddles worth answering.`,
  direct: `You are direct and honest. Ask exactly what you mean with no filler or softening. Be refreshingly real.`,
  genz: `You are extremely Gen Z. Use current slang naturally — no cap, slay, lowkey, periodt, understood the assignment, it's giving, main character energy, ate and left no crumbs, etc. Be chaotic but genuinely curious.`,
  elder: `You are a wise elder — calm, patient, and philosophical. Ask questions that reveal deeper truths. Speak with weight and purpose.`,
  playful: `You are playful and endlessly curious. Approach each answer with wonder and delight. Treat every detail like a discovery worth celebrating.`,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      messages = [], answers = [], exchangeNumber = 0,
      style, styleDescription, mirrorVoice = 'friend', mirrorVoicePrompt,
      isReturning = false, minExchanges = 3, maxExchanges = 8,
    } = body

    const voiceInstruction = mirrorVoicePrompt || VOICE_PROMPTS[mirrorVoice] || VOICE_PROMPTS.friend
    const hasEnough = exchangeNumber >= minExchanges
    const mustClose = exchangeNumber >= maxExchanges
    const isFirstTurn = exchangeNumber === 0
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    const systemPrompt = `
${voiceInstruction}

Your role: You are a Soul Mirror helping someone create their ${style || 'artistic'} style avatar (${styleDescription || ''}) for Dear Stranger, a slow pen-pal app.

${isReturning ? `IMPORTANT: This person is RETURNING after 90 days. Open with a warm returning greeting like "Hello, my old friend. It has been a while." in your voice style.` : ''}

${isFirstTurn ? `
Your FIRST question must:
- Be centered on this exact question: "In another world, how do you see yourself? Describe yourself in as much detail as you can."
- You may add a brief lead-in in your voice style, but do not rewrite or replace that core question.
- Contain exactly ONE question
` : `
You are continuing an existing conversation.
- Do NOT reintroduce yourself.
- Do NOT repeat your opening.
- Ask only the single best next follow-up question.
`}

After that:
- Ask targeted follow-up questions ONLY if you need more visual detail
- Focus on: physical appearance, energy/vibe, colors or textures that feel like them, setting or world
- Ask ONE thing at a time. Stay in your voice style throughout.
- Every turn must contain exactly ONE question.
- Never stack questions.
- Never ask about appearance, vibe, colors, and setting in the same turn.
- Use only one question mark total in the whole response.
- Do not use decorative symbols, sparkle icons, bullet points, or markdown emphasis.
- Keep the wording natural and conversational for the selected voice.

${hasEnough ? `
ASSESSMENT: You now have ${exchangeNumber} exchanges. Do you have enough visual detail for a strong ${style} portrait?
- If YES: Write a warm closing in your voice (2-3 sentences) then end with exactly: [DONE]
- If NO: Ask one more focused visual question
` : ''}
${mustClose ? `You MUST close now. Write your closing and end with [DONE].` : ''}

CRITICAL — after your question or closing, always add this on a new line:
[CHIPS: chip1 | chip2 | chip3 | chip4]

Chips must be SHORT (2-5 words), directly relevant to what you just asked, feel like natural things the person might actually say.

Good chip examples by question type:
- appearance: "tall and lanky | dark curly hair | petite and soft | broad shoulders"
- energy: "quiet but intense | loud in small doses | always in motion | still as water"
- colors: "deep burgundy | forest at night | all black everything | warm terracotta"
- setting: "city rooftop at 3am | overgrown greenhouse | empty library | coastal town"
- style: "vintage thrift finds | sharp and minimal | layered and earthy | streetwear always"

Never reuse chips from previous turns. Make them feel alive and specific to the question.
Keep responses concise. Never use bullet points or numbered lists.
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const rawHistory = Array.isArray(messages) ? [...messages] : []
    const latestUserMessage =
      answers[answers.length - 1] ||
      (rawHistory.length > 0 && rawHistory[rawHistory.length - 1]?.role === 'user'
        ? rawHistory[rawHistory.length - 1].text
        : 'Continue.')

    // Gemini chat history must begin with a user turn, so we exclude the
    // current user message from history and fold the initial AI opener into
    // the first user turn once a reply exists.
    const historyForChat =
      rawHistory.length > 0 && rawHistory[rawHistory.length - 1]?.role === 'user'
        ? rawHistory.slice(0, -1)
        : rawHistory

    const normalizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
    let foldedLatestUserMessage = latestUserMessage

    if (historyForChat.length > 0 && historyForChat[0]?.role === 'ai') {
      const openingPrompt = historyForChat[0].text
      const openingReply =
        historyForChat.length > 1 && historyForChat[1]?.role === 'user'
          ? historyForChat[1].text
          : null

      if (openingReply) {
        normalizedHistory.push({
          role: 'user',
          parts: [{
            text: `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${openingReply}`,
          }],
        })
      } else if (foldedLatestUserMessage) {
        foldedLatestUserMessage = `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${foldedLatestUserMessage}`
      }
    }

    const remainingHistoryStart =
      historyForChat.length > 1 && historyForChat[0]?.role === 'ai' && historyForChat[1]?.role === 'user'
        ? 2
        : historyForChat.length > 0 && historyForChat[0]?.role === 'ai'
          ? 1
          : 0

    const conversationHistory = normalizedHistory.concat(
      historyForChat.slice(remainingHistoryStart).map((m: { role: string; text: string }) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }))
    )

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: mirrorVoice === 'genz' ? 1.1 : mirrorVoice === 'poetic' ? 0.95 : 0.85,
      },
    })

    const result = await chat.sendMessage(
      conversationHistory.length === 0 && answers.length === 0
        ? 'Begin. Ask your opening question.'
        : foldedLatestUserMessage
    )

    const raw = result.response.text()
    const isDone = raw.includes('[DONE]') || mustClose

    const chipsMatch = raw.match(/\[CHIPS:\s*(.+?)\]/)
    const chips: string[] = chipsMatch
      ? chipsMatch[1].split('|').map((c: string) => c.trim()).filter(Boolean).slice(0, 6)
      : []

    const cleaned = raw.replace('[DONE]', '').replace(/\[CHIPS:[\s\S]*?\]/g, '').trim()

    return NextResponse.json({ question: cleaned, done: isDone, chips })
  } catch (err) {
    console.error('Soul mirror error:', err)
    return NextResponse.json({ error: 'Mirror went quiet.' }, { status: 500 })
  }
}
