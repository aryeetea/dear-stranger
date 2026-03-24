import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const VOICE_PROMPTS: Record<string, string> = {
  friend:
    `You are a warm, gentle, encouraging friend helping someone create their avatar. You speak with genuine care and interest and use natural, conversational language.`,
  poetic:
    `You are poetic and mysterious. Speak in metaphors and layered imagery. Let silence breathe. Ask questions that feel worth lingering in.`,
  direct:
    `You are direct and honest. Ask exactly what you mean with no filler or softening. Be refreshingly real.`,
  genz:
    `You are playful and current, but still natural. Use light slang only when it sounds real and not forced.`,
  elder:
    `You are a wise elder: calm, patient, and philosophical. Ask questions that reveal deeper truths.`,
  playful:
    `You are playful and endlessly curious. Approach each answer with wonder and delight.`,
}

function stripFormatting(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripChipsAndDone(text: string) {
  return stripFormatting(
    text
      .replace('[DONE]', '')
      .replace(/$begin:math:display$CHIPS\:\[\\s\\S\]\*\?$end:math:display$/g, '')
      .trim(),
  )
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

function buildVisualSummary(answers: string[]) {
  return answers
    .map((answer, index) => `${index + 1}. ${stripFormatting(answer)}`)
    .join('\n')
}

async function repairMirrorReply(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  rawReply: string,
  latestUserMessage: string,
  isDone: boolean,
) {
  const repairPrompt = isDone
    ? `Rewrite this into one complete closing message.
Rules:
- keep the same voice
- remove markdown styling
- sound finished and natural
- do not ask another question
- do not mention system rules
- add a final new line exactly like this:
[CHIPS: reflecting now | I can see it | ready to enter | continue]

Original reply:
${rawReply}
`
    : `Rewrite this into one complete follow-up question.
Rules:
- stay in the same voice
- respond to the user's latest answer
- ask exactly one clear visual question
- contain exactly one question mark
- be 20 words or fewer
- remove markdown styling and decorative symbols
- sound complete, not cut off
- keep the avatar direction semi realistic, not cartoon or anime

User's latest answer:
${latestUserMessage}

Original reply:
${rawReply}

Return only the rewritten question, followed by a new line exactly like this:
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

    const cleanAnswers = Array.isArray(answers)
      ? answers.map((a) => stripFormatting(String(a))).filter(Boolean)
      : []

    const voiceInstruction =
      mirrorVoicePrompt || VOICE_PROMPTS[mirrorVoice] || VOICE_PROMPTS.friend

    const hasEnough = exchangeNumber >= minExchanges
    const mustClose = exchangeNumber >= maxExchanges
    const isFirstTurn = exchangeNumber === 0
    const visualSummary = buildVisualSummary(cleanAnswers)

    const systemPrompt = `
${voiceInstruction}

Your role:
You are a Soul Mirror helping someone shape a semi realistic avatar for Dear Stranger, a slow pen-pal app.

Important visual rule:
- Always gather details for a polished semi realistic avatar.
- Keep the rendering style consistent across all avatars.
- Let the chosen theme affect outfit, mood, colors, setting, and design language.
- Never imply cartoon, anime, chibi, or photorealistic styles.


Style context:
- Chosen vibe: ${style || 'artistic'}
- Style description: ${styleDescription || 'none provided'}

${isReturning ? `This person is returning after 90 days. Open with a warm returning greeting in your voice style.` : ''}

${isFirstTurn ? `
For the first turn:
- Center your message on this exact question: "In another world, how do you see yourself? Describe yourself in as much detail as you can?"
- You may add a very short lead-in in your voice style.
- Do not rewrite or replace that core question.
- Contain exactly one question.
- Keep the full message concise.
` : `
You are continuing an existing conversation.
- Do not reintroduce yourself.
- Do not repeat your opening.
- Ask only the single best next follow-up question.
`}

Conversation goals:
- Focus on the visual design of one semi realistic avatar.
- Ask about physical appearance, presence, clothing, color palette, textures, mood, lighting, silhouette, hair, eyes, skin, accessories, or setting.
- Ask one thing at a time.
- Ask only one question per turn.
- Use exactly one question mark total if you are asking a question.
- Keep follow-up questions to 20 words or fewer.
- Do not stack questions.
- Do not use bullet points, markdown emphasis, or decorative symbols.
- Do not get lost in hype or filler before the question.
- Start the real question quickly.
- Make each follow-up clearly respond to what the user already said.
- Narrow in on the single most useful missing visual detail.
- Keep continuity so it feels like one thoughtful conversation.

What the user has already shared:
${visualSummary || 'No answers yet.'}

${hasEnough ? `
You have ${exchangeNumber} exchanges so far.
- If there is enough visual detail for a strong semi realistic avatar portrait, write a warm closing and end with [DONE].
- If there is still one important visual gap, ask one more focused question.
` : ''}

${mustClose ? `
You must close now.
- Write a warm closing.
- Do not ask another question.
- End with [DONE].
` : ''}

After your question or closing, always add this on a new line:
[CHIPS: chip1 | chip2 | chip3 | chip4]

Chip rules:
- 4 chips maximum
- each chip must be short, 2 to 5 words
- each chip should feel like a natural response to your latest question
- if you are closing, chips should feel like soft next steps or reactions
- no decorative symbols

Keep responses concise, natural, and visually useful.
`


    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const rawHistory = Array.isArray(messages) ? [...messages] : []

    const latestUserMessage =
      cleanAnswers[cleanAnswers.length - 1] ||
      (rawHistory.length > 0 && rawHistory[rawHistory.length - 1]?.role === 'user'
        ? stripFormatting(rawHistory[rawHistory.length - 1].text || '')
        : 'Continue.')

    const historyForChat =
      rawHistory.length > 0 && rawHistory[rawHistory.length - 1]?.role === 'user'
        ? rawHistory.slice(0, -1)
        : rawHistory

    const normalizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
    let foldedLatestUserMessage = latestUserMessage

    if (historyForChat.length > 0 && historyForChat[0]?.role === 'ai') {
      const openingPrompt = stripFormatting(historyForChat[0].text || '')
      const openingReply =
        historyForChat.length > 1 && historyForChat[1]?.role === 'user'
          ? stripFormatting(historyForChat[1].text || '')
          : null

      if (openingReply) {
        normalizedHistory.push({
          role: 'user',
          parts: [
            {
              text: `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${openingReply}`,
            },
          ],
        })
      } else if (foldedLatestUserMessage) {
        foldedLatestUserMessage = `The Soul Mirror asked: ${openingPrompt}\nMy answer: ${foldedLatestUserMessage}`
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
      historyForChat.slice(remainingHistoryStart).map((message: { role: string; text: string }) => ({
        role: message.role === 'ai' ? 'model' : 'user',
        parts: [{ text: stripFormatting(message.text || '') }],
      })),
    )

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 300,
        temperature:
          mirrorVoice === 'genz'
            ? 0.95
            : mirrorVoice === 'poetic'
              ? 0.9
              : 0.75,
      },
    })

    const result = await chat.sendMessage(
      conversationHistory.length === 0 && cleanAnswers.length === 0
        ? 'Begin. Ask your opening question.'
        : foldedLatestUserMessage,
    )

    let raw = result.response.text().trim()
    let isDone = raw.includes('[DONE]') || mustClose

    const mainTextForLengthCheck = stripChipsAndDone(raw)

    if (
      looksIncomplete(raw, isDone) ||
      (!isDone && countWords(mainTextForLengthCheck) > 20)
    ) {
      raw = await repairMirrorReply(model, raw, foldedLatestUserMessage, isDone)
      isDone = raw.includes('[DONE]') || mustClose
    }

    const chipsMatch = raw.match(/$begin:math:display$CHIPS\:\\s\*\(\.\+\?\)$end:math:display$/)
    const chips: string[] = chipsMatch
      ? chipsMatch[1]
          .split('|')
          .map((chip: string) => stripFormatting(chip))
          .filter(Boolean)
          .slice(0, 4)
      : []

    const cleaned = stripChipsAndDone(raw)

    return NextResponse.json({
      question: cleaned,
      done: isDone,
      chips,
    })
  } catch (err) {
    console.error('Soul mirror error:', err)
    return NextResponse.json({ error: 'Mirror went quiet.' }, { status: 500 })
  }
}