import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

type RawMessage = {
  role: 'user' | 'ai'
  text: string
}

type RequestBody = {
  messages?: RawMessage[]
  answers?: string[]
  exchangeNumber?: number
  style?: string
  styleDescription?: string
  mirrorVoice?: string
  mirrorVoicePrompt?: string
  isReturning?: boolean
  minExchanges?: number
  maxExchanges?: number
}

const VOICE_PROMPTS: Record<string, string> = {
  friend:
    'You are a warm, gentle, encouraging friend helping someone create their avatar. You speak naturally, with care and curiosity.',
  poetic:
    'You are poetic and mysterious, but still concise. Use soft imagery without becoming long winded.',
  direct:
    'You are direct and honest. Ask exactly what you mean with no filler.',
  genz:
    'You are casual and current. Keep it natural, short, and not cringe.',
  elder:
    'You are calm, wise, and grounded. Speak with warmth and clarity.',
  playful:
    'You are playful and curious. Keep things light, simple, and engaging.',
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.floor(value), min), max)
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueChips(chips: string[]) {
  const seen = new Set<string>()

  return chips.filter((chip) => {
    const normalized = chip.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function fallbackChipsFromContext(question: string, style: string, styleDescription: string) {
  const source = `${question} ${style} ${styleDescription}`.toLowerCase()

  if (source.includes('hair')) {
    return ['braids', 'curly hair', 'long hair', 'silver streaks']
  }

  if (source.includes('eyes')) {
    return ['blue eyes', 'gold eyes', 'sharp gaze', 'soft glow']
  }

  if (source.includes('outfit') || source.includes('wear')) {
    return ['streetwear', 'baggy jeans', 'graphic tee', 'layered look']
  }

  if (source.includes('color')) {
    return ['blue tones', 'black and silver', 'neon accents', 'soft gold']
  }

  if (source.includes('setting') || source.includes('background')) {
    return ['city lights', 'moonlit street', 'futuristic skyline', 'floating lights']
  }

  return ['streetwear', 'blue eyes', 'dark skin', 'futuristic vibe']
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json()

    const safeMessages: RawMessage[] = Array.isArray(body.messages)
      ? body.messages.filter(
          (m): m is RawMessage =>
            !!m &&
            (m.role === 'user' || m.role === 'ai') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0
        )
      : []

    const safeAnswers: string[] = Array.isArray(body.answers)
      ? body.answers
          .filter((a): a is string => typeof a === 'string')
          .map((a) => a.trim())
          .filter(Boolean)
      : []

    const safeExchangeNumber =
      typeof body.exchangeNumber === 'number' && Number.isFinite(body.exchangeNumber)
        ? Math.max(0, Math.floor(body.exchangeNumber))
        : 0

    let safeMinExchanges = clampNumber(body.minExchanges, 5, 5, 10)
    let safeMaxExchanges = clampNumber(body.maxExchanges, 10, 5, 10)

    if (safeMinExchanges > safeMaxExchanges) {
      ;[safeMinExchanges, safeMaxExchanges] = [safeMaxExchanges, safeMinExchanges]
    }

    const style = cleanText(body.style)
    const styleDescription = cleanText(body.styleDescription)
    const mirrorVoice = cleanText(body.mirrorVoice) || 'friend'
    const mirrorVoicePrompt = cleanText(body.mirrorVoicePrompt)
    const isReturning = Boolean(body.isReturning)

    const voiceInstruction =
      mirrorVoicePrompt ||
      VOICE_PROMPTS[mirrorVoice] ||
      VOICE_PROMPTS.friend

    const hasEnough = safeExchangeNumber >= safeMinExchanges
    const mustClose = safeExchangeNumber >= safeMaxExchanges
    const isFirstTurn = safeExchangeNumber === 0

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY' },
        { status: 500 }
      )
    }

    const systemPrompt = `
${voiceInstruction}

Your role: You are a Soul Mirror helping someone create their ${style || 'artistic'} style avatar${styleDescription ? ` (${styleDescription})` : ''} for Dear Stranger.

${isReturning ? 'IMPORTANT: This person is returning after 90 days. Greet them warmly, but keep it brief.' : ''}

${isFirstTurn
  ? `
Your first message must center on this exact question:
"In another world, how do you see yourself?"

You may add a very short lead in, but do not replace that core question.
Ask exactly one question.
`
  : `
You are continuing an existing conversation.
Do not reintroduce yourself.
Ask only the single best next follow up question.
`}

Rules:
- Ask ONLY ONE question per turn
- Keep it short, ideally under 15 words
- Sound natural and conversational
- Do not overtalk
- Do not give long explanations
- Do not stack questions
- Use only one question mark total in the whole response
- No bullet points
- No decorative symbols
- No markdown emphasis
- Make each question clearly respond to what the user just said
- Focus only on the most useful missing visual detail
- Prioritize appearance, outfit, vibe, colors, textures, and setting
- If they already gave a lot, zoom in on one missing detail
- Keep continuity across the conversation
- Do not contradict earlier details

${hasEnough
  ? `
ASSESSMENT:
You now have ${safeExchangeNumber} exchanges.
If you already have enough visual detail for a strong portrait, write ONE short closing sentence and end with exactly [DONE].
If not, ask one more focused question.
`
  : ''}

${mustClose
  ? `
You must close now.
Write ONE short closing sentence and end with exactly [DONE].
`
  : ''}

CRITICAL:
After your question or closing, always add this on a new line:
[CHIPS: chip1 | chip2 | chip3 | chip4]

Chips rules:
- Keep them short
- Make them directly relevant to what you just asked
- Make them sound like natural replies the user might actually say
- Never reuse chips from previous turns

Make sure the response is complete and not cut off.
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const rawHistory = [...safeMessages]
    const latestAnswer =
      safeAnswers.length > 0 ? safeAnswers[safeAnswers.length - 1] : ''
    const lastHistoryMessage =
      rawHistory.length > 0 ? rawHistory[rawHistory.length - 1] : undefined

    let latestUserMessage =
      latestAnswer ||
      (lastHistoryMessage?.role === 'user' ? lastHistoryMessage.text.trim() : '') ||
      'Continue.'

    const historyForChat =
      lastHistoryMessage?.role === 'user' && !latestAnswer
        ? rawHistory.slice(0, -1)
        : rawHistory

    const normalizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []

    if (historyForChat.length > 0 && historyForChat[0]?.role === 'ai') {
      const openingPrompt = historyForChat[0].text.trim()
      const openingReply =
        historyForChat.length > 1 && historyForChat[1]?.role === 'user'
          ? historyForChat[1].text.trim()
          : ''

      if (openingPrompt && openingReply) {
        normalizedHistory.push({
          role: 'user',
          parts: [
            {
              text: `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${openingReply}`,
            },
          ],
        })
      } else if (openingPrompt && latestUserMessage) {
        latestUserMessage = `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${latestUserMessage}`
      }
    }

    const remainingHistoryStart =
      historyForChat.length > 1 &&
      historyForChat[0]?.role === 'ai' &&
      historyForChat[1]?.role === 'user'
        ? 2
        : historyForChat.length > 0 && historyForChat[0]?.role === 'ai'
          ? 1
          : 0

    const conversationHistory = normalizedHistory.concat(
      historyForChat
        .slice(remainingHistoryStart)
        .map((m) => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.text.trim().slice(0, 700) }],
        }))
    )

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 220,
        temperature:
          mirrorVoice === 'genz'
            ? 0.85
            : mirrorVoice === 'poetic'
              ? 0.8
              : 0.7,
      },
    })

    const promptToSend =
      conversationHistory.length === 0 && safeAnswers.length === 0
        ? 'Begin. Ask your opening question.'
        : latestUserMessage || 'Continue.'

    const result = await chat.sendMessage(promptToSend)
    const raw = result.response.text().trim()

    const doneTagFound = /\[DONE\]/i.test(raw)

    const chipsMatch = raw.match(/\[CHIPS:\s*([^\]]+)\]/i)

    let chips: string[] = chipsMatch
      ? chipsMatch[1]
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 4)
      : []

    chips = uniqueChips(chips)

    if (chips.length < 4) {
      const fallbacks = fallbackChipsFromContext(raw, style, styleDescription)
      for (const chip of fallbacks) {
        if (chips.length >= 4) break
        if (!chips.some((c) => c.toLowerCase() === chip.toLowerCase())) {
          chips.push(chip)
        }
      }
    }

    const cleaned = raw
      .replace(/\[DONE\]/gi, '')
      .replace(/\[CHIPS:[\s\S]*?\]/gi, '')
      .trim()

    const finalQuestion =
      cleaned || (mustClose ? 'Your avatar feels vivid now.' : 'What outfit would you wear?')

    const isDone = mustClose || doneTagFound

    return NextResponse.json({
      question: finalQuestion,
      done: isDone,
      chips,
    })
  } catch (err) {
    console.error('Soul mirror error:', err)
    return NextResponse.json(
      { error: 'Mirror went quiet.' },
      { status: 500 }
    )
  }
}