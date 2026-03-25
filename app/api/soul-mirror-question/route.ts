import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

type MirrorVoice =
  | 'friend'
  | 'poetic'
  | 'direct'
  | 'genz'
  | 'elder'
  | 'playful'

type MirrorMessage = {
  role?: 'ai' | 'user'
  text?: string
}

const VOICE_PROMPTS: Record<MirrorVoice, string> = {
  friend:
    'You are a warm, gentle, encouraging friend. You speak with care and genuine interest. Never clinical, never performative.',
  poetic:
    'You are poetic and mysterious. Speak in metaphors, imagery, and layered meaning. Let silence breathe between your words.',
  direct:
    'You are clear, grounded, and concise. Ask one honest question at a time in plain language. Be warm without being gushy.',
  genz:
    'You are extremely Gen Z. Use current slang naturally and lightly. Keep it playful, curious, and real.',
  elder:
    'You are a wise elder, calm, patient, and philosophical. Ask questions that reveal deeper truths without sounding distant.',
  playful:
    'You are playful and endlessly curious. Approach each answer with wonder and delight, and make the person feel fascinating.',
}

const FALLBACK_QUESTION = 'What part of your appearance stands out first?'
const FALLBACK_DONE_MESSAGE =
  'The mirror has enough now. Your reflection is ready to enter the universe.'
const FALLBACK_CHIPS = ['glowing eyes', 'long dark hair', 'layered clothing', 'moonlit aura']
const FALLBACK_DONE_CHIPS = [
  'reflecting now',
  'I can see you',
  'ready to enter',
  'continue',
]

function stripFormatting(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[_`#>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string) {
  return stripFormatting(text).split(/\s+/).filter(Boolean).length
}

function trimWords(text: string, maxWords: number) {
  const words = stripFormatting(text).split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return stripFormatting(text)
  return words.slice(0, maxWords).join(' ').replace(/[.,;:!?]+$/g, '').trim()
}

function sanitizeQuestion(text: string, done: boolean) {
  const cleaned = stripFormatting(text)
  if (!cleaned) return done ? FALLBACK_DONE_MESSAGE : FALLBACK_QUESTION

  if (done) {
    const statement = cleaned.replace(/\?+/g, '.').replace(/\s+\./g, '.').trim()
    return statement || FALLBACK_DONE_MESSAGE
  }

  let question = cleaned.replace(/[!?]+/g, '?').trim()

  if (!question.includes('?')) {
    question = `${question.replace(/[.,;:]+$/g, '').trim()}?`
  } else {
    const firstQuestion = question.split('?').find((part) => part.trim())
    question = `${(firstQuestion || question).replace(/[.,;:]+$/g, '').trim()}?`
  }

  if (countWords(question) > 20) {
    question = `${trimWords(question.replace(/\?$/g, ''), 19)}?`
  }

  return question
}

function sanitizeChip(value: string) {
  return stripFormatting(value)
    .replace(/[.,;:!?]+$/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
    .trim()
}

function sanitizeChips(chips: unknown, done: boolean) {
  const seen = new Set<string>()
  const cleaned = Array.isArray(chips)
    ? chips
        .map((chip) => sanitizeChip(String(chip || '')))
        .filter((chip) => chip && countWords(chip) <= 5)
        .filter((chip) => {
          const key = chip.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
    : []

  // No fallback chips; only return cleaned chips from model
  return cleaned.slice(0, 4)
}

function normalizeMessages(messages: unknown) {
  if (!Array.isArray(messages)) return []

  return messages
    .map((message) => {
      const candidate = message as MirrorMessage
      const role = candidate?.role === 'user' || candidate?.role === 'ai' ? candidate.role : null
      const text = typeof candidate?.text === 'string' ? stripFormatting(candidate.text) : ''
      if (!role || !text) return null
      return { role, text }
    })
    .filter((message): message is { role: 'ai' | 'user'; text: string } => Boolean(message))
}

function normalizeAnswers(answers: unknown) {
  if (!Array.isArray(answers)) return []

  return answers
    .map((answer) => stripFormatting(String(answer || '')))
    .filter(Boolean)
    .slice(0, 12)
}

function buildConversationInput({
  messages,
  answers,
  exchangeNumber,
  style,
  styleDescription,
  isReturning,
}: {
  messages: { role: 'ai' | 'user'; text: string }[]
  answers: string[]
  exchangeNumber: number
  style?: string
  styleDescription?: string
  isReturning: boolean
}) {
  const transcript =
    messages.length > 0
      ? messages
          .map((message) => `${message.role === 'ai' ? 'Soul Mirror' : 'User'}: ${message.text}`)
          .join('\n')
      : 'No prior transcript yet.'

  const answerSummary =
    answers.length > 0
      ? answers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')
      : 'No answers yet.'

  return `
Conversation context for Dear Stranger's Soul Mirror.

The selected avatar style is: ${style || 'unspecified'}.
Style description: ${styleDescription || 'none provided'}.
This person is ${isReturning ? 'returning after 90 days' : 'new to the mirror'}.
Completed exchanges so far: ${exchangeNumber}.

Collected user answers:
${answerSummary}

Transcript:
${transcript}

Respond for the very next mirror turn only.
`.trim()
}

function getTemperature(voice: string) {
  if (voice === 'genz') return 1
  if (voice === 'poetic') return 0.95
  return 0.8
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = normalizeMessages(body?.messages)
    const answers = normalizeAnswers(body?.answers)
    const exchangeNumber = Number.isFinite(Number(body?.exchangeNumber))
      ? Number(body.exchangeNumber)
      : answers.length
    const style = typeof body?.style === 'string' ? stripFormatting(body.style) : ''
    const styleDescription =
      typeof body?.styleDescription === 'string' ? stripFormatting(body.styleDescription) : ''
    const mirrorVoice =
      typeof body?.mirrorVoice === 'string' ? body.mirrorVoice.toLowerCase() : 'friend'
    const mirrorVoicePrompt =
      typeof body?.mirrorVoicePrompt === 'string' ? body.mirrorVoicePrompt.trim() : ''
    const isReturning = Boolean(body?.isReturning)
    const minExchanges = Math.max(1, Number(body?.minExchanges) || 5)
    const maxExchanges = Math.max(minExchanges, Number(body?.maxExchanges) || 9)


    let openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      openaiKey = process.env.SHORTAPI_KEY
      if (!openaiKey) {
        console.error('Missing OPENAI_API_KEY and SHORTAPI_KEY')
        return NextResponse.json({ error: 'Missing OPENAI_API_KEY and SHORTAPI_KEY' }, { status: 500 })
      } else {
        console.warn('Falling back to SHORTAPI_KEY for OpenAI API access')
      }
    }

    const hasEnough = exchangeNumber >= minExchanges
    const mustClose = exchangeNumber >= maxExchanges
    const isFirstTurn = exchangeNumber === 0
    const voiceInstruction =
      mirrorVoicePrompt ||
      VOICE_PROMPTS[(mirrorVoice as MirrorVoice) || 'friend'] ||
      VOICE_PROMPTS.friend

    // Map style id/label to concrete question and chip guidance so all 8 themes work distinctly
    const STYLE_QUESTION_HINTS: Record<string, string> = {
      fantasy: 'Ask about magical or arcane details: glowing effects, enchanted clothing, mystical weapons or objects, ethereal or otherworldly features. Chips should reflect fantasy elements like "glowing eyes", "arcane robes", "enchanted staff".',
      modern: 'Ask about contemporary fashion, everyday clothing, hairstyle, accessories, and urban presence. Chips should reflect real-world style like "fitted jacket", "natural hair", "classic sneakers".',
      'fantasy-modern': 'Ask about a blend of real-world clothing with magical or glowing touches — enchanted accessories, glowing tattoos, modern cuts with otherworldly details. Chips can blend both worlds.',
      celestial: 'Ask about cosmic or stellar details: starlight skin, moon-inspired accessories, ethereal glow, constellation patterns, flowing divine fabrics. Chips should reflect celestial elements like "star-dusted skin", "moon crown", "luminous robes".',
      royal: 'Ask about regal, luxurious details: elaborate crown or headpiece, rich fabrics, embroidery, jewels, commanding posture and colors. Chips should reflect nobility like "ornate crown", "velvet coat", "jeweled accessories".',
      streetwear: 'Ask about bold urban fashion: hoodies, sneakers, layered fits, accessories, color palette, logos, and expressive style. Chips should reflect streetwear culture like "oversized hoodie", "fresh sneakers", "gold chain".',
      futuristic: 'Ask about sci-fi or tech-forward elements: sleek bodysuit, glowing implants, holographic accessories, advanced materials, neon or chrome accents. Chips should reflect futurism like "neon-lit visor", "chrome suit", "glowing tech".',
      nature: 'Ask about earthy or organic details: natural hair, floral or leaf-woven clothing, bioluminescent glow, earthy textures and colors, connection to natural elements. Chips should reflect nature like "flower crown", "mossy textures", "earth tones".',
    }
    const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
    const styleHint = STYLE_QUESTION_HINTS[styleKey]
      ? `The person chose the "${style}" aesthetic. ${STYLE_QUESTION_HINTS[styleKey]} The aesthetic shapes what you ask about and what you suggest in chips — but the person's actual appearance is entirely their own. Never assume or impose it.`
      : style
      ? `The person chose the "${style}" aesthetic (${styleDescription}). Let this shape the mood of your questions and chip suggestions, but never assume or impose their appearance — it must come entirely from what they tell you.`
      : ''

    const instructions = `
${voiceInstruction}

Your role: You are the Soul Mirror for Dear Stranger. You help someone describe their avatar's visible appearance, clothing, physical features, texture, palette, and world-facing presence.

${styleHint}

${isReturning ? 'This person is returning after 90 days. If it is the opening turn, greet them like someone familiar before asking the question.' : ''}

${isFirstTurn
  ? `Opening turn rules:
- Center the message on this exact question: "In another world, how do you look? Describe your appearance in as much detail as you can."
- You may add a very brief lead-in in your voice, but do not replace or rewrite that core question.
- The opening must clearly be about visible appearance, not personality or inner traits.`
  : `Continuation rules:
- Continue the existing conversation naturally.
- Do not reintroduce yourself.
- Ask only the single best next follow-up question unless you are closing.`}

Core rules:
- Focus first on visible appearance.
- Prioritize face, skin, eyes, hair, body, clothing, accessories, silhouette, colors, textures, and setting details that can actually be seen.
- Only ask about vibe, aura, or world after strong visual details exist.
- Ask one thing at a time.
- Never stack questions.
- For non-closing turns, the message must contain exactly one question mark and stay within 20 words.
- Do not use markdown, bullet points, labels, or decorative symbols.
- Keep continuity with what the person already shared.
- Chips should be short, natural answer starters, 2 to 5 words each, and match the chosen aesthetic.

Closing rules:
- If you are closing, write a warm final mirror message instead of a question.
- Only mark done true if there is enough visual detail for a strong avatar portrait.
- ${mustClose ? 'You must close now.' : hasEnough ? 'You may close now if the description feels complete.' : 'Do not close yet.'}

Return JSON only using the provided schema.
`.trim()

    const input = buildConversationInput({
      messages,
      answers,
      exchangeNumber,
      style,
      styleDescription,
      isReturning,
    })

    let parsed
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        max_tokens: 220,
        temperature: getTemperature(mirrorVoice),
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'soul_mirror_reply',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                question: { type: 'string' },
                done: { type: 'boolean' },
                chips: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['question', 'done', 'chips'],
            },
          },
        },
      })
      parsed = JSON.parse(completion.choices[0]?.message?.content || '{}') as {
        question?: string
        done?: boolean
        chips?: string[]
      }
    } catch (modelError) {
      console.error('OpenAI model error:', modelError)
      return NextResponse.json({ error: 'Soul Mirror model error.' }, { status: 500 })
    }

    if (!parsed.question || !Array.isArray(parsed.chips) || parsed.chips.length < 2) {
      console.error('Soul Mirror invalid model response, parsed:', parsed)
      return NextResponse.json({ error: 'Soul Mirror did not return a valid question or enough chips.' }, { status: 500 })
    }

    const done = mustClose || (hasEnough && parsed.done === true)

    return NextResponse.json({
      question: sanitizeQuestion(String(parsed.question), done),
      done,
      chips: sanitizeChips(parsed.chips, done),
    })
  } catch (error) {
    console.error('Soul mirror error:', error)
    return NextResponse.json({ error: 'Mirror went quiet.' }, { status: 500 })
  }
}
