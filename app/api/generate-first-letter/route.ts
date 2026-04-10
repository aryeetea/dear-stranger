import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function stripFormatting(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, hubName } = await req.json() as {
      answers: string[]
      hubName?: string
    }

    if (!Array.isArray(answers) || answers.length < 4) {
      return NextResponse.json({ error: 'Four answers required' }, { status: 400 })
    }

    const [brought, carry, know, seeking] = answers.map(a => String(a).trim().slice(0, 50))

    const prompt = `You are writing a short, lyrical introduction letter for someone entering a universe of anonymous letters called "Dear Stranger."

They answered four questions when they arrived. Use their exact words and feelings to write their first letter — a quiet, personal note addressed to no one in particular, drifting out into the world as an introduction.

Their answers:
1. What brought them here: "${brought}"
2. What they carry quietly: "${carry}"
3. What a stranger should know about them: "${know}"
4. What they are looking for: "${seeking}"
${hubName ? `Their name in this universe: "${hubName}"` : ''}

Write a first-person letter (100–150 words). Start with "Dear Stranger," and end with a single line signature — their name in the universe or just "A stranger." The tone should be honest, a little vulnerable, and beautifully written. Do not summarize their answers literally — weave them into something that reads like it was meant to be found by someone who needed to read it. No markdown, no headers, no bullet points, no quotes.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 320,
      temperature: 0.88,
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const letter = stripFormatting(raw)

    if (!letter) {
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ letter })
  } catch (err) {
    console.error('[generate-first-letter]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
