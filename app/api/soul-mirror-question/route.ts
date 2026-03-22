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

async function repairMirrorReply(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, rawReply: string, latestUserMessage: string, isDone: boolean) {
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
      minExchanges = 3,
      maxExchanges = 8,
    } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    const voiceInstruction = mirrorVoicePrompt || VOICE_PROMPTS[mirrorVoice] || VOICE_PROMPTS.friend
    const hasEnough = exchangeNumber >= minExchanges
    const mustClose = exchangeNumber >= maxExchanges
    const isFirstTurn = exchangeNumber === 0

    const systemPrompt = `
${voiceInstruction}

Your role: You are a Soul Mirror helping someone create their ${style || 'artistic'} style avatar (${styleDescription || ''}) for Dear Stranger, a slow pen-pal app.

${isReturning ? `IMPORTANT: This person is returning after 90 days. Open with a warm returning greeting in your voice style.` : ''}

${isFirstTurn ? `
Your first message must:
- Be centered on this exact question: "In another world, how do you see yourself? Describe yourself in as much detail as you can."
- You may add a brief lead-in in your voice style, but do not rewrite or replace that core question.
- Contain exactly one question.
- Keep the full question to 20 words or fewer.
` : `
You are continuing an existing conversation.
- Do not reintroduce yourself.
- Do not repeat your opening.
- Ask only the single best next follow-up question.
`}

After that:
- Start asking the real question quickly. Do not spend the whole message on reaction or hype.
- Ask targeted follow-up questions only if you still need visual detail.
- Focus on physical appearance, energy/vibe, colors or textures, or the world/setting.
- Ask one thing at a time.
- Every turn must contain exactly one question.
- Every question must be 20 words or fewer.
- Never stack questions.
- Use only one question mark total in the whole response.
- Do not use decorative symbols, bullet points, or markdown emphasis.
- Make sure each follow-up clearly responds to what the person just said.
- Do not ignore vivid details they already gave you.
- If they already shared a lot, narrow in on the single most useful missing visual detail.
- Keep continuity so the conversation feels like one thoughtful exchange.

${hasEnough ? `
Assessment: you now have ${exchangeNumber} exchanges.
- If you have enough visual detail for a strong ${style} portrait, write a warm closing in your voice and end with exactly [DONE].
- If not, ask one more focused visual question.
` : ''}
${mustClose ? `You must close now. Write your closing and end with [DONE].` : ''}

After your question or closing, always add this on a new line:
[CHIPS: chip1 | chip2 | chip3 | chip4]

Chips must be short, 2-5 words each, directly relevant to what you just asked, and feel like natural things the person might actually say.
Keep responses concise.
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
      historyForChat.slice(remainingHistoryStart).map((message: { role: string; text: string }) => ({
        role: message.role === 'ai' ? 'model' : 'user',
        parts: [{ text: message.text }],
      }))
    )

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: mirrorVoice === 'genz' ? 1.0 : mirrorVoice === 'poetic' ? 0.95 : 0.8,
      },
    })

    const result = await chat.sendMessage(
      conversationHistory.length === 0 && answers.length === 0
        ? 'Begin. Ask your opening question.'
        : foldedLatestUserMessage
    )

    let raw = result.response.text().trim()
    let isDone = raw.includes('[DONE]') || mustClose

    if (looksIncomplete(raw, isDone) || (!isDone && countWords(raw.replace(/\[CHIPS:[\s\S]*?\]/g, '')) > 20)) {
      raw = await repairMirrorReply(model, raw, foldedLatestUserMessage, isDone)
      isDone = raw.includes('[DONE]') || mustClose
    }

    const chipsMatch = raw.match(/\[CHIPS:\s*(.+?)\]/)
    const chips: string[] = chipsMatch
      ? chipsMatch[1].split('|').map((chip: string) => chip.trim()).filter(Boolean).slice(0, 4)
      : []

    const cleaned = stripFormatting(raw.replace('[DONE]', '').replace(/\[CHIPS:[\s\S]*?\]/g, '').trim())

    return NextResponse.json({ question: cleaned, done: isDone, chips })
  } catch (err) {
    console.error('Soul mirror error:', err)
    return NextResponse.json({ error: 'Mirror went quiet.' }, { status: 500 })
  }
}
