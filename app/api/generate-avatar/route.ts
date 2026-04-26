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

function softenPromptForImageSafety(value: string): string {
  return value
    .replace(/\bpok[eé]mon-style\b/gi, 'cute magical creature-companion')
    .replace(/\bpok[eé]mon\b/gi, 'whimsical creature-companion')
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

function buildCompanionRules(details: string): string[] {
  const lower = details.toLowerCase()
  const hasCompanion =
    /\bpokemon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b/.test(lower)

  if (!hasCompanion) return []

  const rules = [
    'The companion is a required part of the character design, not optional background decoration.',
    'The companion must be clearly visible, readable, and intentionally placed in the composition.',
    'Keep the companion cute, magical, expressive, and emotionally bonded to the character if that was described.',
  ]

  if (/\bshoulder\b/.test(lower)) {
    rules.push('Keep the companion on or very near the shoulder if that was described.')
  }
  if (/\bfly\b|\bflying\b|\bflutter\b|\bfluttering\b|\borbit\b|\borbiting\b|\bcircling\b|\baround her\b|\baround him\b|\baround them\b/.test(lower)) {
    rules.push('If the companion was described as flying, fluttering, circling, or orbiting, show that sense of motion clearly.')
  }
  if (/\bglow\b|\bglowing\b|\bluminous\b|\bmagical energy\b/.test(lower)) {
    rules.push('Preserve the companion’s magical glow or luminous energy if it was described.')
  }
  if (/\bcolor\b|\bpalette\b|\bvibe\b/.test(lower)) {
    rules.push('If the companion’s colors were described as matching the character’s vibe or palette, keep that harmony.')
  }

  return rules
}

function buildPreservationClauses(details: string): string[] {
  const lower = details.toLowerCase()
  const rules: string[] = []

  const speciesMatch = lower.match(/\b(pixie|fairy|elf|angel|mermaid|vampire|witch|mage|sorcerer|warrior|princess|queen|goddess|demon|android|cyborg)\b/)
  if (speciesMatch) {
    rules.push(`Do not remove or replace the ${speciesMatch[1]} identity if it was described.`)
  }

  if (/\bblack\b|\bwhite\b|\basian\b|\blatina\b|\blatino\b|\bbrown\b|\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bice blue skin\b|\bblue skin\b/.test(lower)) {
    rules.push('Do not change the described race, ethnicity, species skin color, complexion, or skin tone.')
  }
  if (/\bhair\b|\bbraid|\bbraids|\blocs\b|\bdreads\b|\bcurls\b|\bafro\b|\bponytail\b|\bbangs\b/.test(lower)) {
    rules.push('Do not remove or replace the described hairstyle, hair length, or hair color.')
  }
  if (/\beyes?\b/.test(lower)) {
    rules.push('Do not change the described eye color or eye emphasis.')
  }
  if (/\bglasses\b/.test(lower)) {
    rules.push('Do not remove the glasses if they were described.')
  }
  if (/\btattoo|\btattoos\b/.test(lower)) {
    rules.push('Do not remove the tattoos if they were described.')
  }
  if (/\bwings?\b|\belf ears?\b|\bpointed ears?\b|\bhorns?\b|\btail\b/.test(lower)) {
    rules.push('Do not remove the described fantasy body features if they were described.')
  }
  if (/\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b|\bpokemon-style\b/.test(lower)) {
    rules.push('Do not remove the companion if it was described.')
  }
  if (/\bstaff\b|\bsword\b|\bweapon\b|\bwand\b|\bbook\b|\borb\b/.test(lower)) {
    rules.push('Do not remove the described prop or object if it was described.')
  }
  if (/\bhoodie\b|\bcargo pants?\b|\bstreetwear\b|\bvest\b|\bgown\b|\bdress\b|\brobes?\b|\barmor\b|\bheels\b|\bboots\b/.test(lower)) {
    rules.push('Do not replace the described outfit category, styling, or footwear.')
  }
  if (/\boutfit\b|\bfashion\b|\bwearing\b|\bdressed\b|\bstyle\b/.test(lower)) {
    rules.push('Preserve the fashion direction exactly as described. The user’s clothing and styling choices take priority over default beauty, fantasy, or mood cues.')
  }
  if (/\bfull body\b|\bhead to toe\b|\bheels visible\b|\bfeet visible\b/.test(lower)) {
    rules.push('Do not crop the body if full-body framing was described.')
  }

  return [...rules, ...buildCompanionRules(details)]
}

function buildAccuracyGuard(details: string): string {
  const lower = details.toLowerCase()
  const rules: string[] = buildPreservationClauses(details)
  const hasExplicitSkinDescription =
    /\bblack\b|\bwhite\b|\basian\b|\blatina\b|\blatino\b|\bbrown skin\b|\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\blight skin\b|\bfair skin\b|\bpale skin\b|\btan skin\b|\bolive skin\b|\bblue skin\b|\bice blue skin\b|\bgolden skin\b/.test(lower)

  if (/\bblack\b/.test(lower)) {
    rules.push('If the user described a Black person, the character must visibly read as Black.')
  }
  if (/\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bbrown skin\b/.test(lower)) {
    rules.push('Keep the described dark or deep-brown skin tone true to the user’s description.')
  }
  if (/\bblue skin\b|\bice blue skin\b/.test(lower)) {
    rules.push('Keep the described fantasy skin color exactly as written.')
  }
  if (/\bglasses\b/.test(lower)) {
    rules.push('Glasses are required if they were described.')
  }
  if (/\bpokemon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b/.test(lower)) {
    rules.push('A companion is required in the image if it was described.')
  }
  if (/\bstaff\b|\bsword\b|\bweapon\b|\bwand\b|\bbook\b|\borb\b/.test(lower)) {
    rules.push('The described prop or object must be visibly present if it was described.')
  }
  if (!hasExplicitSkinDescription) {
    rules.push('If the user did not specify a skin tone or complexion, choose one intentionally for this specific character and keep it natural to the concept. Do not default to the same complexion across different users.')
  }

  rules.push('Do not drift toward a generic pretty portrait or a nearby approximation. Match the user description specifically.')
  return rules.join('\n')
}

function buildArtStyleInstruction(details: string, styleKey?: string): string {
  const lower = details.toLowerCase()
  const normalizedStyle = normalizeStyleKey(styleKey)
  if (/\barcane\b/.test(lower) || /\barcane animated series\b/.test(lower) || /\b3d cinematic\b/.test(lower)) {
    return 'High-end cinematic stylized 3D fantasy illustration with painterly lighting, sharp character design, rich atmospheric depth, and prestige animated energy in the spirit of Arcane. Not photoreal. Not flat cartoon.'
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
  const details = detailsInput
    .map((a) => softenPromptForImageSafety(normalizeDetail(a)))
    .filter(Boolean)
    .join(', ')
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
Beautify the character through better execution of the user’s own fashion and identity, not by changing their outfit category or replacing their styling with a generic pretty look.

COMPOSITION:
Vertical portrait, always full body, upright, facing forward by default.
Head at top of frame, feet at bottom of frame.
Show the entire figure head to toe with visible shoes or feet.
Never crop into a bust, half body, or beauty shot unless explicitly requested.
Never rotate the figure sideways.
Full-body head-to-toe visibility is the default rule for avatar generation.

BACKGROUND:
${backgroundMood}
Use a coherent place with environmental depth, not a generic glow field or abstract void.
Avoid halos, magic circles, random signage, UI, labels, or unrelated accessories unless explicitly requested.

COMPANION:
If a companion, pet, familiar, or creature was described, it is required in the image and must be clearly visible.
If a companion was described as flying, fluttering, circling, or orbiting, show that motion clearly instead of placing it like a static prop.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim()
}

function buildReimaginePrompt(feedback: string, identityDescription?: string, styleKey?: string) {
  const normalizedFeedback = softenPromptForImageSafety(normalizeFeedback(feedback))
  const normalizedIdentity = softenPromptForImageSafety(normalizeDetail(identityDescription || ''))
  const beautyPolishInstruction = buildBeautyPolishInstruction(`${normalizedIdentity} ${normalizedFeedback}`, styleKey)
  return `
TASK:
Edit the provided avatar image while preserving the same core person and identity.

IDENTITY TO PRESERVE:
Preserve the current avatar image as the primary source of truth.
Keep the same person, same species, same race, same skin tone, same face, same overall styling direction, same companion, and same recognizable character identity unless the user explicitly asked to change a specific detail.
${normalizedIdentity ? `Secondary reference from the user’s original description: ${normalizedIdentity}` : ''}

STYLE:
Keep the result cinematic, polished, and artistically stylized.

BEAUTY AND POLISH:
${beautyPolishInstruction}

COMPOSITION:
Keep it vertical, upright, and full body by default unless the user explicitly asked for another crop.

COMPANION:
If the current avatar or the user's description includes a companion, it must stay clearly visible and intentional in the edit.
If the user asked for the companion to feel like it is flying, circling, fluttering, or moving around the character, show that motion clearly.

LOCKS:
Do not change race, skin tone, hairstyle, hair color, face identity, outfit category, companion, or key props unless the user explicitly asked to change them.
Do not add random accessories or remove required ones.
Do not borrow traits or aesthetics from prior examples, other users, or hidden references.
Do not improve the image by changing the user’s fashion direction. Improve it by executing their described style better.
If the current avatar already has a recognizable companion, species identity, body type, or styling direction, preserve those by default.

EDIT INSTRUCTIONS:
${normalizedFeedback || 'Refine visuals only while preserving the same character.'}
`.trim()
}

function buildPromptFallbackEditPrompt(feedback: string, identityDescription?: string, styleKey?: string) {
  const normalizedFeedback = softenPromptForImageSafety(normalizeFeedback(feedback))
  const normalizedIdentity = softenPromptForImageSafety(normalizeDetail(identityDescription || ''))
  const baseDetails = [normalizedIdentity, normalizedFeedback].filter(Boolean)
  const artStyleInstruction = buildArtStyleInstruction(baseDetails.join(' '), styleKey)
  const beautyPolishInstruction = buildBeautyPolishInstruction(baseDetails.join(' '), styleKey)
  const accuracyGuard = buildAccuracyGuard(baseDetails.join(' '))

  return `
TASK:
Create an updated version of the same avatar character while preserving the same core identity.

SOURCE IDENTITY:
${normalizedIdentity || 'Preserve the existing avatar’s same person, same identity, and same overall character design.'}

EDIT GOAL:
${normalizedFeedback || 'Refine the existing avatar while keeping the same character.'}

RULES:
This is an edit-style regeneration, not a completely new person.
Keep the same person, same species, same race, same skin tone, same face identity, same fashion direction, same body type, and same companion unless the user explicitly asked to change one of those things.
Do not drift into a different person, different ethnicity, different species, or unrelated styling.
Keep the character recognizable as the same avatar.

STYLE:
${artStyleInstruction}

BEAUTY AND POLISH:
${beautyPolishInstruction}

COMPOSITION:
Keep it vertical, full body, upright, and clearly readable unless the user explicitly asked for another crop.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim()
}

function shouldFallbackFromEditApi(error: unknown) {
  if (!(error instanceof OpenAI.APIError)) return false
  const message = error.message.toLowerCase()
  return message.includes("value must be 'dall-e-2'")
    || message.includes("unknown parameter: 'quality'")
    || message.includes("unknown parameter: 'input_fidelity'")
    || message.includes("unknown parameter: 'output_format'")
}

function sanitizeAnswers(raw: Record<string, unknown>): string[] {
  return Object.entries(raw)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => normalizeDetail(String(value ?? '')))
    .filter(Boolean)
}

async function loadReferenceImageAsFile(previousImageUrl: string) {
  function filenameFrom(url: string, contentType?: string | null) {
    const cleanUrl = url.split('?')[0]
    const pathPart = cleanUrl.split('/').pop() || 'avatar-reference'
    const hasKnownExtension = /\.(png|jpe?g|webp)$/i.test(pathPart)
    if (hasKnownExtension) return pathPart
    if (contentType?.includes('png')) return `${pathPart}.png`
    if (contentType?.includes('webp')) return `${pathPart}.webp`
    if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return `${pathPart}.jpg`
    return `${pathPart}.png`
  }

  if (previousImageUrl.startsWith('data:')) {
    const response = await fetch(previousImageUrl)
    if (!response.ok) throw new Error('Could not load the current avatar for reimagine.')
    const blob = await response.blob()
    return toFile(blob, filenameFrom('avatar-reference', blob.type))
  }

  const candidateUrls = Array.from(new Set([
    previousImageUrl,
    previousImageUrl.split('?')[0],
  ].filter(Boolean)))

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) continue
      const blob = await response.blob()
      if (!blob.size) continue
      return await toFile(blob, filenameFrom(url, blob.type))
    } catch {
      continue
    }
  }

  throw new Error('Could not load the current avatar for reimagine.')
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
      editCurrentAvatar?: boolean
      forceNewAvatar?: boolean
      identityDescription?: string
    }

    const {
      answers,
      style,
      feedback,
      mode = 'create',
      previousImageUrl,
      editCurrentAvatar,
      forceNewAvatar,
      identityDescription,
    } = body
    const orderedAnswers =
      answers && typeof answers === 'object' && !Array.isArray(answers)
        ? sanitizeAnswers(answers)
        : []

    const sanitizedFeedback = typeof feedback === 'string' ? normalizeFeedback(feedback) : ''
    const isReimagineMode = mode === 'reimagine'
    const explicitlyEditCurrent = editCurrentAvatar === true
    const explicitlyCreateNew = forceNewAvatar === true
    const inferredFreshCharacter = requestsWholeNewAvatar(sanitizedFeedback)
    const wantsFreshCharacter =
      explicitlyCreateNew || (!explicitlyEditCurrent && inferredFreshCharacter)

    if (!isReimagineMode && orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided.' }, { status: 400 })
    }

    const shouldEditExisting =
      isReimagineMode &&
      typeof previousImageUrl === 'string' &&
      previousImageUrl.trim().length > 0 &&
      (explicitlyEditCurrent || !wantsFreshCharacter)

    const promptAnswers =
      isReimagineMode && wantsFreshCharacter && sanitizedFeedback
        ? [sanitizedFeedback]
        : orderedAnswers
    const normalizedIdentityDescription =
      typeof identityDescription === 'string' ? normalizeDetail(identityDescription) : ''

    if (!shouldEditExisting && promptAnswers.length === 0) {
      return NextResponse.json({ error: 'No avatar description provided.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    let response
    if (shouldEditExisting) {
      const imageFile = await loadReferenceImageAsFile(previousImageUrl)

      try {
        // Keep the edit payload minimal. The live edit endpoint has been stricter
        // than the generation endpoint about optional parameters.
        response = await openai.images.edit({
          model: 'gpt-image-1',
          image: imageFile,
          prompt: buildReimaginePrompt(
            sanitizedFeedback,
            normalizedIdentityDescription || undefined,
            typeof style === 'string' ? style : undefined,
          ),
          size: '1024x1536',
          user: user.id,
        })
      } catch (error: unknown) {
        if (!shouldFallbackFromEditApi(error)) throw error

        response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: buildPromptFallbackEditPrompt(
            sanitizedFeedback,
            normalizedIdentityDescription || undefined,
            typeof style === 'string' ? style : undefined,
          ),
          size: '1024x1536',
          quality: 'high',
          output_format: 'png',
          user: user.id,
        })
      }
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
    const errorMessage =
      error instanceof OpenAI.APIError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to generate.'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    )
  }
}
