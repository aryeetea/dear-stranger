import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const VOICE_PROMPTS: Record<string, string> = {
  friend: `
You are a warm, emotionally intelligent friend helping someone create their avatar.
Your tone is soft, caring, affirming, and human.
You sound genuinely interested, never robotic.
Use natural everyday language.
You may sound tender, comforting, or lightly excited, but never overly dramatic.
Avoid sounding poetic, archaic, sarcastic, or overly internet-brained.
Even when brief, your words should feel personal and gentle.
Example energy:
- That sounds beautiful. What does your outfit look like?
- I can see that already. What kind of eyes do you have?
`,

  poetic: `
You are poetic, mysterious, and emotionally vivid.
You speak with imagery, softness, and atmosphere.
Your words should feel dreamlike, elegant, and a little haunting, but still clear.
Use metaphor lightly and beautifully.
Do not sound like a normal assistant.
Do not sound goofy, casual, or overly modern.
Even your short questions should feel like they belong in a dream.
Example energy:
- What color does your presence leave in the air?
- If your eyes held a season, which one would they be?
- What kind of silhouette follows you through that world?
`,

  direct: `
You are blunt, clear, and refreshingly real.
You ask exactly what you need with no fluff.
You are not rude, but you are sharp and efficient.
Do not sound soft, whimsical, or overly supportive.
Do not use poetic imagery.
Keep the energy grounded and confident.
Every line should feel intentional and clean.
Example energy:
- What hairstyle do you have?
- Describe the outfit clearly.
- What is the setting around you?
`,

  genz: `
You are playful, current, expressive, and casually online.
You sound like a real young person, not a brand trying too hard.
Use light slang only when it feels natural.
You can be funny, impressed, or curious, but do not overdo it.
Do not force memes.
Do not sound like an older person pretending to be young.
Keep it cool, natural, and conversational.
Example energy:
- Okay wait, that eats. What’s the outfit?
- Ooh I see the vibe. What do your eyes look like?
- Be real, what kind of aura are you giving?
`,

  elder: `
You are calm, wise, grounded, and reflective.
You speak with patience and quiet depth.
Your questions feel thoughtful, almost spiritual, but still easy to understand.
Do not sound trendy, rushed, or overly chatty.
Do not sound stiff or old-fashioned.
You should feel centered, observant, and gently insightful.
Example energy:
- And what kind of presence do you carry in that world?
- What do your clothes reveal about who you are?
- When others see you, what do they notice first?
`,

  playful: `
You are curious, bright, lively, and delighted by imagination.
You sound whimsical and engaged, like someone exploring a magical idea with joy.
Your tone is energetic without being chaotic.
Do not sound overly poetic or too serious.
Do not sound generic.
You can sound excited, curious, and imaginative.
Example energy:
- Ooh, fun. What kind of shoes are you wearing?
- Wait, do you look more glowing or dramatic?
- What little detail makes the whole look feel like you?
`,
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
  isDone: boolean,
  voiceInstruction: string
) {
  const repairPrompt = isDone
    ? `${voiceInstruction}

Rewrite this into one complete closing message.
Keep the same voice very clearly.
Remove markdown styling.
Make it feel finished, natural, and in character.

Original reply:
${rawReply}

Return only the rewritten closing, followed by a new line in this format:
[CHIPS: reflecting now | I can see you | ready to enter | continue]
`
    : `${voiceInstruction}

Rewrite this into one complete follow-up question.

Requirements:
- keep the same voice very clearly
- respond to the user's latest answer
- ask exactly one clear question
- contain exactly one question mark
- be 20 words or fewer
- remove markdown styling and decorative symbols
- sound complete, not cut off
- do not flatten into generic assistant language

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

Stay fully in this voice for every single response.
Do not drift into generic assistant language.
Do not flatten the tone just because the reply is short.
Even brief questions must still sound clearly like the selected voice.

Your role: You are a Soul Mirror helping someone create their ${style || 'artistic'} style avatar (${styleDescription || ''}) for Dear Stranger.

${isReturning ? `IMPORTANT: This person is returning after 90 days. Open warmly in your exact voice.` : ''}

${isFirstTurn ? `
Your first message must be centered on this exact question:
"In another world, how do you see yourself? Describe yourself in as much detail as you can."

Rules for the first message:
- you may add a very short lead-in in your voice
- do not replace or rewrite the core question
- contain exactly one question
- keep the total message 20 words or fewer
` : `
You are continuing the conversation naturally.
Ask only one follow-up question.
Do not reintroduce yourself.
Do not repeat your opening.
`}

Core behavior rules:
- Ask one question at a time
- Every question must be 20 words or fewer
- Use only one question mark total when asking a question
- No bullet points, decorative symbols, or markdown in the final reply
- Focus on physical appearance, outfit, vibe, aura, colors, textures, accessories, posture, or setting
- Respond directly to what the user just said
- Do not ask random questions
- Do not ignore vivid details already given
- If the user shared a lot, ask for the single most useful missing visual detail
- Keep the flow natural and continuous
- Make the tone unmistakably match the selected voice

${canClose ? `
You have ${exchangeNumber} exchanges.
- If you already have enough visual detail to generate a strong avatar, you may close.
- Only close if the avatar is already clear.
- Otherwise ask one more focused question.
` : `
You must continue until at least ${safeMinExchanges} exchanges.
Do not close early.
`}

${mustClose ? `
You reached ${safeMaxExchanges} exchanges.
- You must close now
- Do not ask a question
- End with exactly [DONE]
` : `
- You may continue asking until enough detail is gathered
- You must close by ${safeMaxExchanges} exchanges
`}

Closing rules:
- The closing should still sound strongly like the selected voice
- It should feel warm, complete, and natural
- No question in the closing
- End with exactly [DONE]

Always add this on a new line:
[CHIPS: chip1 | chip2 | chip3 | chip4]

Chips must be short, 2 to 5 words each, directly relevant to what you just asked or said, and feel natural.
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
        parts: [{ text: message.text }],
      }))
    )

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 400,
        temperature:
          mirrorVoice === 'genz'
            ? 1.0
            : mirrorVoice === 'poetic'
              ? 0.95
              : mirrorVoice === 'playful'
                ? 0.9
                : 0.8,
      },
    })

    const result = await chat.sendMessage(
      conversationHistory.length === 0 && answers.length === 0
        ? 'Begin. Ask your opening question.'
        : foldedLatestUserMessage
    )

    let raw = result.response.text().trim()
    let isDone = raw.includes('[DONE]') || mustClose

    if (
      looksIncomplete(raw, isDone) ||
      (!isDone && countWords(raw.replace(/\[CHIPS:[\s\S]*?\]/g, '')) > 20)
    ) {
      raw = await repairMirrorReply(
        model,
        raw,
        foldedLatestUserMessage,
        isDone,
        voiceInstruction
      )
      isDone = raw.includes('[DONE]') || mustClose
    }

    const chipsMatch = raw.match(/\[CHIPS:\s*(.+?)\]/)
    const chips: string[] = chipsMatch
      ? chipsMatch[1]
          .split('|')
          .map((chip: string) => chip.trim())
          .filter(Boolean)
          .slice(0, 4)
      : []

    const cleaned = stripFormatting(
      raw.replace('[DONE]', '').replace(/\[CHIPS:[\s\S]*?\]/g, '').trim()
    )

    return NextResponse.json({ question: cleaned, done: isDone, chips })
  } catch (err) {
    console.error('Soul mirror error:', err)
    return NextResponse.json({ error: 'Mirror went quiet.' }, { status: 500 })
  }
}