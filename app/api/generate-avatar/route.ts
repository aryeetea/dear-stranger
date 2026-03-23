import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const VOICE_PROMPTS: Record<string, string> = {
  friend: `You are a warm, gentle, encouraging friend helping someone create their avatar. You speak with genuine care and interest and use natural, conversational language.`,
  poetic: `You are poetic and mysterious. Speak in metaphors and layered imagery. Let silence breathe. Ask questions that feel worth lingering in.`,
  direct: `You are direct and honest. Ask exactly what you mean with no filler or softening. Be refreshingly real.`,
  genz: `You are very online and playful, but still natural. Use current slang lightly and only when it sounds real.`,
  elder: `You are a wise elder: calm, patient, and philosophical. Ask questions that reveal deeper truths.`,
  playful: `You are playful and endlessly curious. Approach each answer with wonder and delight.`,
}

function stripFormatting(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksIncomplete(text: string, isDone: boolean) {
  const cleaned = stripFormatting(text)
  if (!cleaned) return true
  if (/[,:;\-–—]$/.test(cleaned)) return true
  if (!isDone && !cleaned.includes('?')) return true
  return false
}

function countWords(text: string) {
  return stripFormatting(text).split(/\s+/).filter(Boolean).length
}

async function repairMirrorReply(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  rawReply: string,
  latestUserMessage: string,
  isDone: boolean
) {
  const repairPrompt = isDone
    ? `Rewrite this into one complete closing message. Keep the same voice, remove markdown styling, and make it feel finished.

Original reply:
${rawReply}

Return only the rewritten closing, followed by a new line in this format:
[CHIPS: reflecting now | I can see you | ready to enter | continue]
`
    : `Rewrite this into one complete follow-up question. It must:
- stay in the same voice
- respond to the user's latest answer
- ask exactly one clear question
- contain exactly one question mark
- be 20 words or fewer
- remove markdown styling and decorative symbols
- sound complete, not cut off

User's latest answer:
${latestUserMessage}

Original reply:
${rawReply}

Return only the rewritten question, followed by a new line in this format:
[CHIPS: chip1 | chip2 | chip3 | chip4]
`

  const repaired = await model.generateContent(repairPrompt)
  return repaired.response.text().trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      messages = [],
      answers = [],
      exchangeNumber = 0,
      style,
      styleDescription,
      mirrorVoice = 'friend',
      mirrorVoicePrompt,
      isReturning = false,
      minExchanges = 5,
      maxExchanges = 20,
    } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    const safeMinExchanges = Math.max(1, Number(minExchanges) || 5)
    const safeMaxExchanges = Math.max(
      safeMinExchanges,
      Math.min(20, Number(maxExchanges) || 20)
    )

    const voiceInstruction =
      mirrorVoicePrompt || VOICE_PROMPTS[mirrorVoice] || VOICE_PROMPTS.friend

    const canClose = exchangeNumber >= safeMinExchanges
    const mustClose = exchangeNumber >= safeMaxExchanges
    const isFirstTurn = exchangeNumber === 0

    const systemPrompt = `
${voiceInstruction}

Your role: You are a Soul Mirror helping someone create their ${style || 'artistic'} style avatar (${styleDescription || ''}) for Dear Stranger.

${isReturning ? `IMPORTANT: This person is returning after 90 days. Open warmly.` : ''}

${isFirstTurn ? `
Your first message must:
- Ask: "In another world, how do you see yourself? Describe yourself in as much detail as you can."
- Exactly one question
- 20 words or fewer
` : `
Continue the conversation naturally.
Ask only ONE follow-up question.
`}

Rules:
- Ask one question at a time
- Max 20 words per question
- Only one question mark
- No symbols or markdown
- Focus on appearance, outfit, vibe, and setting
- Respond directly to what user said
- Keep flow natural

${canClose ? `
You have ${exchangeNumber} exchanges.
- If you have enough detail, you may close.
- Only close if the avatar can be clearly generated already.
- Otherwise, ask one more focused question.
` : `
You must continue until at least ${safeMinExchanges} exchanges.
`}

${mustClose ? `
You reached ${safeMaxExchanges}.
- You MUST close now
- Do not ask a question
- End with [DONE]
` : `
- You may continue asking until enough detail
- You MUST close by ${safeMaxExchanges}
`}

Closing rules:
- Warm, complete message
- No question
- End with [DONE]

Always add:
[CHIPS: chip1 | chip2 | chip3 | chip4]
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.8,
      },
    })

    const latestUserMessage =
      answers[answers.length - 1] || 'Begin.'

    const result = await chat.sendMessage(
      exchangeNumber === 0 ? 'Start.' : latestUserMessage
    )

    let raw = result.response.text().trim()
    let isDone = raw.includes('[DONE]') || mustClose

    if (
      looksIncomplete(raw, isDone) ||
      (!isDone && countWords(raw.replace(/\[CHIPS:[\s\S]*?\]/g, '')) > 20)
    ) {
      raw = await repairMirrorReply(model, raw, latestUserMessage, isDone)
      isDone = raw.includes('[DONE]') || mustClose
    }

    const chipsMatch = raw.match(/\[CHIPS:\s*(.+?)\]/)
    const chips: string[] = chipsMatch
      ? chipsMatch[1].split('|').map((c) => c.trim()).slice(0, 4)
      : []

    const cleaned = stripFormatting(
      raw.replace('[DONE]', '').replace(/\[CHIPS:[\s\S]*?\]/g, '')
    )

    return NextResponse.json({ question: cleaned, done: isDone, chips })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Mirror failed.' }, { status: 500 })
  }
}