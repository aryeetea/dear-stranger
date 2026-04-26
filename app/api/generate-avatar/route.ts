import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy:
    'Background mood: a grounded fantasy environment with real setting detail such as a forest path, quiet courtyard, stone hall, cliffside, market lane, or camp at dusk.',
  modern:
    'Background mood: a believable contemporary place such as a studio, street, cafe, apartment, rooftop, or city walkway with depth.',
  'fantasy-modern':
    'Background mood: a grounded cinematic setting where modern life meets subtle fantasy.',
  celestial:
    'Background mood: moonlit, airy, luminous, and environmental rather than abstract cosmic voids.',
  royal:
    'Background mood: elegant architectural spaces such as palace corridors, gardens, libraries, galleries, or terraces.',
  streetwear:
    'Background mood: vivid urban environments such as sidewalks, murals, storefronts, train platforms, and city corners.',
  futuristic:
    'Background mood: sleek futuristic environments such as transit hubs, observation decks, city streets, or interior corridors.',
  nature:
    'Background mood: a natural environment with real landscape detail such as forest clearings, coastlines, gardens, mountains, or rain-soaked paths.',
  default:
    'Background mood: a coherent environment with real depth and scene detail that fits the user’s chosen theme and character concept.',
}

function normalizeDetail(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').trim()
}

function normalizeStyleKey(styleKey?: string): string {
  return normalizeDetail(styleKey || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
}

function normalizeFeedback(value?: string): string {
  return normalizeDetail(value || '').slice(0, 1200)
}

function looksLikeFullAvatarDescription(feedback: string): boolean {
  const lower = feedback.toLowerCase()
  const wordCount = lower.split(/\s+/).filter(Boolean).length
  const signals = [
    /\bfull body\b|\bhead to toe\b|\bupright\b|\bfacing forward\b/.test(lower),
    /\bwearing\b|\bdressed\b|\boutfit\b|\bgown\b|\bhoodie\b|\bcargo\b|\bheels\b/.test(lower),
    /\bhair\b|\beyes\b|\bskin\b|\bglasses\b/.test(lower),
    /\bstaff\b|\bsword\b|\bholding\b|\bweapon\b/.test(lower),
    /\bcompanion\b|\bcreature\b|\bpokemon-style\b|\bfamiliar\b/.test(lower),
    /\bbackground\b|\bforest\b|\barcane\b|\bcinematic\b|\b3d\b/.test(lower),
  ].filter(Boolean).length

  return wordCount >= 25 && signals >= 3
}

function requestsWholeNewAvatar(feedback: string): boolean {
  if (!feedback) return false
  return /\b(whole new avatar|completely new avatar|entirely new avatar|totally new avatar|brand new avatar|start over|from scratch|completely different|totally different|change everything|different person|new character)\b/i.test(feedback)
    || looksLikeFullAvatarDescription(feedback)
}

function buildIdentityInstruction(details: string): string {
  const lower = details.toLowerCase()
  if (/\b(princess|queen|duchess|empress|goddess|girl|woman|lady|female|feminine|she\/her|she|her)\b/.test(lower)) {
    return 'Render a feminine female-presenting character if that is what the user described. Never swap to a male character.'
  }
  if (/\b(prince|king|duke|emperor|god\b|boy|man|male|masculine|he\/him|he|him)\b/.test(lower)) {
    return 'Render a masculine male-presenting character if that is what the user described. Never swap to a female character.'
  }
  return 'Preserve the gender and identity words the user provided. Never swap roles or identity markers.'
}

function buildAccuracyGuard(details: string): string {
  const lower = details.toLowerCase()
  const rules: string[] = []

  if (/\bblack\b/.test(lower)) {
    rules.push('If the user described a Black person, the character must visibly read as Black. Never change them to another ethnicity.')
  }
  if (/\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bbrown skin\b/.test(lower)) {
    rules.push('Keep the skin tone richly dark/deep brown if that was described. Never lighten it.')
  }
  if (/\bblue skin\b|\bice blue skin\b/.test(lower)) {
    rules.push('If blue or ice-blue skin was described, keep that exact fantasy skin color. Never replace it with natural human skin tones.')
  }
  if (/\bblue\b/.test(lower) && /\bbraid|\bbraids|\bgoddess braids|\bplaits?/.test(lower)) {
    rules.push('If blue braids were described, the hair must stay long blue braids. Never swap to another hairstyle or color.')
  }
  if (/\bwhite hair\b|\blong straight white hair\b/.test(lower)) {
    rules.push('If long straight white hair was described, keep that exact hair color and style.')
  }
  if (/\bglasses\b/.test(lower)) {
    rules.push('If glasses were described, glasses are required in the image.')
  }
  if (/\bhoodie\b|\bcargo pants?\b|\bstreetwear\b|\bvest\b/.test(lower)) {
    rules.push('If the outfit was described as streetwear, hoodie, vest, or cargo pants, keep it as casual streetwear separates. Never turn it into robes, gowns, dresses, armor, or formalwear.')
  }
  if (/\bgown\b|\bmullet-style gown\b/.test(lower)) {
    rules.push('If a gown was described, keep it as a dramatic gown in that exact fashion category. Never replace it with casualwear.')
  }
  if (/\bheels\b|\bhigh heels\b/.test(lower)) {
    rules.push('If heels were described, heels must be visible at the bottom of the full-body portrait.')
  }
  if (/\bstaff\b/.test(lower)) {
    rules.push('If a magical staff was described, it must be present and visibly held in hand.')
  }
  if (/\bpokemon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b/.test(lower)) {
    rules.push('If a small companion creature was described, it must be clearly visible. Never omit it.')
  }
  if (/\bshoulder\b/.test(lower) && /\bcompanion\b|\bcreature\b|\bpokemon-style\b/.test(lower)) {
    rules.push('If the companion was described on the shoulder, keep it on or very near the shoulder.')
  }

  rules.push('Do not drift toward a generic pretty portrait or a nearby approximation. Match the user description specifically.')
  return rules.join('\n')
}

function buildArtStyleInstruction(details: string, styleKey?: string): string {
  const lower = details.toLowerCase()
  const normalizedStyle = normalizeStyleKey(styleKey)
  if (/\barcane\b/.test(lower) || /\barcane animated series\b/.test(lower) || /\b3d cinematic\b/.test(lower)) {
    return 'High-end cinematic stylized 3D fantasy illustration with painterly lighting, sharp design, rich atmospheric depth, and prestige-animated energy in the spirit of Arcane. Not photoreal. Not flat cartoon.'
  }
  if (normalizedStyle === 'modern' || normalizedStyle === 'streetwear') {
    return 'Cinematic stylized contemporary illustration with believable anatomy, polished editorial styling, rich atmosphere, and strong visual design. Not a photograph, not hyperreal, not flat cartoon.'
  }
  if (normalizedStyle === 'futuristic') {
    return 'Cinematic stylized futuristic illustration with sleek design, believable lighting, strong atmosphere, and premium sci-fi polish. Not photoreal and not flat cartoon.'
  }
  if (normalizedStyle === 'royal') {
    return 'Cinematic stylized regal illustration with luxurious detail, rich atmosphere, elegant character design, and painterly lighting. Not photoreal and not flat cartoon.'
  }
  if (normalizedStyle === 'celestial') {
    return 'Cinematic stylized luminous illustration with airy atmosphere, refined magical elegance, painterly lighting, and rich depth. Not photoreal and not flat cartoon.'
  }
  if (normalizedStyle === 'nature') {
    return 'Cinematic stylized nature-inspired illustration with organic beauty, atmospheric depth, painterly lighting, and grounded elegance. Not photoreal and not flat cartoon.'
  }
  if (/\b3d\b/.test(lower)) {
    return 'Stylized cinematic 3D illustration with believable lighting, painterly atmosphere, and handcrafted polish. Not photoreal and not cheap plastic 3D.'
  }
  return 'Semi-realistic cinematic illustration with believable anatomy and lighting, painterly finish, and clear stylization. Not a photograph, not hyperreal, not cartoon.'
}

function buildBeautyPolishInstruction(details: string, styleKey?: string): string {
  const lower = details.toLowerCase()
  const normalizedStyle = normalizeStyleKey(styleKey)
  const lines = [
    'Make the character feel like the most beautiful, visually striking, fully realized version of what the user described.',
    'Elevate styling, fabric detail, color harmony, silhouette, lighting, and atmosphere without changing any explicitly requested traits.',
    'Favor main-character energy, theme-appropriate polish, strong composition, and intentional beauty over bland or generic results.',
    'Do not default to any repeated palette, signature accent color, or recurring lighting treatment across different users.',
    'Only use colors that are explicitly described by the user or that naturally follow from the user’s own concept, setting, and mood.',
    'If the user did not specify colors, choose a palette that fits their concept without relying on a fixed house palette.',
  ]

  if (normalizedStyle === 'fantasy' || normalizedStyle === 'fantasy-modern' || normalizedStyle === 'celestial' || normalizedStyle === 'royal' || normalizedStyle === 'nature' || /\bpixie\b|\bfairy\b|\belf\b|\bmage\b|\bqueen\b|\bprincess\b/.test(lower)) {
    lines.push('If the concept is fantasy, render it as high-fantasy character design with glamorous, art-directed polish and magical elegance.')
  }
  if (normalizedStyle === 'modern' || normalizedStyle === 'streetwear' || /\bstreetwear\b|\bhoodie\b|\bcargo\b|\bmodern\b/.test(lower)) {
    lines.push('If the concept is modern or streetwear, make it fashion-editorial, cool, and sharply styled rather than plain everyday clothing.')
  }
  if (normalizedStyle === 'futuristic') {
    lines.push('If the concept is futuristic, make it sleek, intentional, high-design, and visually advanced rather than default fantasy.')
  }
  if (normalizedStyle === 'royal') {
    lines.push('If the concept is royal, emphasize elegance, luxury, stature, and refined visual richness.')
  }
  if (normalizedStyle === 'nature') {
    lines.push('If the concept is nature-inspired, keep it organic, graceful, grounded, and naturally beautiful rather than default arcane fantasy.')
  }
  if (/\bhappy\b|\bjoyful\b|\bpretty\b|\bsoft\b/.test(lower)) {
    lines.push('If the user asked for a happy or gentle mood, keep the beauty soft and luminous without forcing any default color family.')
  }
  if (/\bdark\b|\bmysterious\b|\bseductive\b|\bsexy\b/.test(lower)) {
    lines.push('If the user asked for a darker or more seductive mood, keep it moody and glamorous without forcing any default color family.')
  }

  return lines.join('\n')
}

function buildAvatarPrompt(detailsInput: string[], styleKey?: string): string {
  const details = detailsInput.map((a) => normalizeDetail(a)).filter(Boolean).join(', ')
  const normalizedStyle = normalizeStyleKey(styleKey)
  const backgroundMood = STYLE_DESCRIPTORS[normalizedStyle] || STYLE_DESCRIPTORS.default
  const identityInstruction = buildIdentityInstruction(details)
  const accuracyGuard = buildAccuracyGuard(details)
  const artStyleInstruction = buildArtStyleInstruction(details, styleKey)
  const beautyPolishInstruction = buildBeautyPolishInstruction(details, styleKey)

  return `
SUBJECT:
Render this character exactly as described: ${details || 'a mysterious figure'}.

IDENTITY:
${identityInstruction}

CLOTHING, HAIR, FEATURES:
Render every clothing item, hairstyle, hair color, skin tone, glasses, shoes, companion, and held object exactly as described.
Do not substitute, simplify, modernize, fantasy-wash, or pretty-wash away specific details.
Do not let the background or style override the user's outfit, hair, skin, race, or companion description.
Do not borrow traits, species, outfits, colors, companions, or aesthetics from prior examples, other users, or hidden references.

ART STYLE:
${artStyleInstruction}
No watermarks. No text. No labels.

BEAUTY AND POLISH:
${beautyPolishInstruction}

COMPOSITION:
Vertical portrait, full body, upright, facing forward.
Head at top of frame, feet at bottom of frame.
Show the entire figure head to toe with visible shoes or feet.
Never crop into a bust, half body, or beauty shot unless explicitly requested.
Never rotate the figure sideways.

BACKGROUND:
${backgroundMood}
Use a coherent place with environmental depth, not a generic glow field or abstract void.
Avoid halos, magic circles, random signage, UI, labels, or unrelated accessories unless explicitly requested.

COMPANION:
If a companion, pet, familiar, or creature was described, it is required in the image and must be clearly visible.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim()
}

function buildReimaginePrompt(feedback: string, identityDescription?: string, styleKey?: string) {
  const normalizedFeedback = normalizeFeedback(feedback)
  const normalizedIdentity = normalizeDetail(identityDescription || '')
  const beautyPolishInstruction = buildBeautyPolishInstruction(`${normalizedIdentity} ${normalizedFeedback}`, styleKey)
  return `
TASK:
Edit the provided avatar image while preserving the same core person and identity.

IDENTITY TO PRESERVE:
${normalizedIdentity || 'Preserve the current avatar identity exactly unless the user explicitly asked to change a specific detail.'}

STYLE:
Keep the result cinematic, polished, and artistically stylized.

BEAUTY AND POLISH:
${beautyPolishInstruction}

COMPOSITION:
Keep it vertical, upright, and full body unless the user explicitly asked for another crop.

LOCKS:
Do not change race, skin tone, hairstyle, hair color, face identity, outfit category, companion, or key props unless the user explicitly asked to change them.
Do not add random accessories or remove required ones.
Do not borrow traits or aesthetics from prior examples, other users, or hidden references.

EDIT INSTRUCTIONS:
${normalizedFeedback || 'Refine visuals only while preserving the same character.'}
`.trim()
}

function sanitizeAnswers(raw: Record<string, unknown>): string[] {
  return Object.entries(raw)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => normalizeDetail(String(value ?? '')))
    .filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!supabaseUrl || !supabaseAnonKey || !openaiKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      answers?: Record<string, unknown>
      style?: string
      feedback?: string
      mode?: 'create' | 'reimagine'
      previousImageUrl?: string
      forceNewAvatar?: boolean
      identityDescription?: string
    }

    const { answers, style, feedback, mode = 'create', previousImageUrl, forceNewAvatar, identityDescription } = body
    const orderedAnswers =
      answers && typeof answers === 'object' && !Array.isArray(answers)
        ? sanitizeAnswers(answers)
        : []

    const sanitizedFeedback = typeof feedback === 'string' ? normalizeFeedback(feedback) : ''
    const wantsFreshCharacter = forceNewAvatar === true || requestsWholeNewAvatar(sanitizedFeedback)
    const isReimagineMode = mode === 'reimagine'

    if (!isReimagineMode && orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided.' }, { status: 400 })
    }

    const shouldEditExisting =
      isReimagineMode &&
      typeof previousImageUrl === 'string' &&
      previousImageUrl.trim().length > 0 &&
      !wantsFreshCharacter

    const promptAnswers =
      isReimagineMode && wantsFreshCharacter && sanitizedFeedback
        ? [sanitizedFeedback]
        : orderedAnswers

    if (!shouldEditExisting && promptAnswers.length === 0) {
      return NextResponse.json({ error: 'No avatar description provided.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    let response
    if (shouldEditExisting) {
      const imageResponse = await fetch(previousImageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Could not load the current avatar for reimagine.' }, { status: 400 })
      }
      const imageBlob = await imageResponse.blob()
      const imageFile = await toFile(imageBlob, 'avatar-reference.png')

      response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt: buildReimaginePrompt(
          sanitizedFeedback,
          typeof identityDescription === 'string' ? identityDescription : undefined,
          typeof style === 'string' ? style : undefined,
        ),
        size: '1024x1536',
        quality: 'high',
        input_fidelity: 'high',
        output_format: 'png',
        user: user.id,
      })
    } else {
      response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: buildAvatarPrompt(promptAnswers, typeof style === 'string' ? style : undefined),
        size: '1024x1536',
        quality: 'high',
        output_format: 'png',
        user: user.id,
      })
    }

    const image = response.data?.[0]
    if (!image?.b64_json) {
      return NextResponse.json({ error: 'Image generation returned no data.' }, { status: 502 })
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt,
    })
  } catch (error: unknown) {
    console.error('Generation Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate.' },
      { status: 500 },
    )
  }
}
