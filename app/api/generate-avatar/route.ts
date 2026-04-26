import { NextResponse } from 'next/server'
import OpenAI from 'openai'
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

function hasCompanionSignal(details: string): boolean {
  const lower = details.toLowerCase()
  return /\bpok[eé]mon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b|\banimal companion\b|\bspirit companion\b|\bsidekick\b|\bby her side\b|\bby his side\b|\bby their side\b|\bon her shoulder\b|\bon his shoulder\b|\bon their shoulder\b|\bfloating beside\b|\borbiting around\b|\bcircling around\b|\brabbit\b|\bbunny\b|\bhare\b|\bfox\b|\bwolf\b|\bcat\b|\bkitten\b|\bdog\b|\bpuppy\b|\bowl\b|\bbird\b|\bcrow\b|\braven\b|\bfalcon\b|\bhawk\b|\bbutterfly\b|\bmoth\b|\bdragon\b|\bdragonet\b|\bserpent\b|\bsnake\b|\bferret\b|\bdeer\b|\bstag\b|\bgoat\b|\blamb\b|\btiger\b|\blion\b|\bleopard\b|\bpanther\b/.test(lower)
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
  const hasCompanion = hasCompanionSignal(details)

  if (!hasCompanion) return []

  const rules = [
    'The companion is a required part of the character design, not optional background decoration.',
    'The companion must be clearly visible, readable, and intentionally placed in the composition.',
    'Treat this as a two-subject composition: the main character plus the companion.',
    'Reserve visible frame space for the companion instead of letting the main figure fill the entire composition.',
    'The companion must not be tiny, hidden, cropped out, merged into the background, or reduced to an unreadable silhouette.',
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
  if (/\bsmall\b|\btiny\b|\blittle\b/.test(lower)) {
    rules.push('If the companion was described as small, keep it small but still clearly readable in the frame.')
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
  if (hasCompanionSignal(details)) {
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
  if (hasCompanionSignal(details)) {
    rules.push('A companion is required in the image if it was described.')
    rules.push('If necessary, make the main figure slightly smaller in frame so both the character and companion are clearly visible.')
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
  // Force all avatars to use Arcane 3D style, regardless of user input or styleKey
  return [
    'High-end cinematic stylized 3D character illustration with painterly surfaces, sculpted forms, rich atmospheric depth, and prestige animated energy in the spirit of Arcane.',
    'The image must read clearly as stylized 3D fantasy art, not photography, not semi-realistic portrait art, and not a live-action person.',
    'Use hand-painted texture treatment, graphic shape language, intentional stylization, expressive features, and art-directed lighting.',
    'Avoid photo-like skin texture, hyper-real pores, naturalistic camera realism, generic beauty-retouch realism, or soft semi-real portrait rendering.',
    'Keep facial structure, skin rendering, hair rendering, and costume rendering visibly stylized and illustrative while still polished, dimensional, and high-end.',
    'Not photoreal. Not semi-realistic. Not flat cartoon.',
  ].join('\n')
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

  return `
SUBJECT:
Render this character exactly as described: ${details || 'a mysterious figure'}.

IDENTITY:
${identityInstruction}
The user description is the source of truth. If any later instruction conflicts with the user description, follow the user description.

CLOTHING, HAIR, FEATURES:
Render every clothing item, hairstyle, hair color, skin tone, glasses, shoes, companion, and held object exactly as described.
Do not substitute, simplify, modernize, fantasy-wash, or pretty-wash away specific details.
Do not let the background or style override the user's outfit, hair, skin, race, or companion description.
Do not borrow traits, species, outfits, colors, companions, or aesthetics from prior examples, other users, or hidden references.
Do not invent extra accessories, props, hairstyles, makeup, tattoos, armor pieces, jewelry, companions, or background story elements unless the user asked for them.

ART STYLE:
${artStyleInstruction}
Lean toward bold stylization over realism in every part of the rendering.
No watermarks. No text. No labels.

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
If the user did not describe a background, keep the background supportive and secondary so the avatar itself stays faithful and readable.

COMPANION:
If a companion, pet, familiar, or creature was described, it is required in the image and must be clearly visible.
If a companion was described as flying, fluttering, circling, or orbiting, show that motion clearly instead of placing it like a static prop.
If a companion was described, compose the image so the companion is immediately readable on first glance.
Reduce the character's scale slightly if needed so the companion fits naturally in frame.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim()
}

function buildVisionAnchoredEditPrompt(currentAvatarSummary: string, feedback: string, identityDescription?: string, styleKey?: string) {
  const normalizedFeedback = softenPromptForImageSafety(normalizeFeedback(feedback))
  const normalizedIdentity = softenPromptForImageSafety(normalizeDetail(identityDescription || ''))
  const normalizedSummary = softenPromptForImageSafety(normalizeDetail(currentAvatarSummary))
  const combinedDetails = [normalizedIdentity, normalizedSummary, normalizedFeedback].filter(Boolean).join(' ')
  const artStyleInstruction = buildArtStyleInstruction(combinedDetails, styleKey)
  const accuracyGuard = buildAccuracyGuard(combinedDetails)

  return `
TASK:
Create an updated version of the same avatar character while preserving the same core identity.

CURRENT AVATAR IDENTITY:
${normalizedSummary}

ORIGINAL USER DESCRIPTION:
${normalizedIdentity || 'Use the current avatar image summary as the identity source of truth.'}

EDIT GOAL:
${normalizedFeedback || 'Refine the avatar while preserving the same character.'}

RULES:
This is an edit, not a new person.
The original user description is the source of truth. If the current image and the original description conflict, prefer the original user description unless the edit request explicitly changes it.
Preserve the same person, same face identity, same species, same skin tone, same hairstyle, same body type, same overall styling direction, and same magical/fantasy role unless the user explicitly asked to change one of those things.
Do not drift into a different ethnicity, a different species, a different hairstyle, or unrelated fashion.
Keep the result recognizably the same avatar.
If the original user description included a companion, familiar, pet, or creature, restore or preserve it even if the current avatar image under-emphasized it or omitted it.
If the user asked to add or restore a companion, the companion is required and must be clearly visible.
If the user asked for the companion to feel like it is flying, circling, fluttering, or orbiting, show that motion clearly and intentionally.
Do not omit the companion when it was requested.
Treat a requested companion as a second subject in the composition, not a minor accessory.
Reduce the character's scale slightly if needed so the companion is fully visible and readable.
Do not invent extra accessories, props, hairstyles, makeup, tattoos, armor pieces, jewelry, companions, or design elements unless the user asked for them or the edit request explicitly adds them.

STYLE:
${artStyleInstruction}
Lean toward bold stylization over realism in every part of the rendering.

COMPOSITION:
Keep it vertical, full body, upright, and clearly readable unless the user explicitly asked for another crop.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim()
}

function sanitizeAnswers(raw: Record<string, unknown>): string[] {
  return Object.entries(raw)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => normalizeDetail(String(value ?? '')))
    .filter(Boolean)
}

async function describeCurrentAvatarWithVision(openai: OpenAI, previousImageUrl: string, identityDescription?: string) {
  const prompt = [
    'Describe this avatar so it can be regenerated as the same character after a requested edit.',
    'Focus on identity-preserving details only: visible skin tone, face identity, species/fantasy identity, hairstyle, hair color, body type/proportions, outfit category, distinctive features, tattoos, wings/ears/horns, companion presence, and overall vibe.',
    'Do not invent missing details.',
    'Keep it concise but specific.',
    identityDescription ? `Original user description for reference: ${softenPromptForImageSafety(normalizeDetail(identityDescription))}` : '',
  ].filter(Boolean).join('\n')

  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: previousImageUrl, detail: 'high' },
        ],
      },
    ],
  })

  const summary = normalizeDetail(response.output_text || '')
  if (!summary) {
    throw new Error('Could not read the current avatar well enough to edit it.')
  }
  return summary
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

    const normalizedIdentityDescription =
      typeof identityDescription === 'string' ? normalizeDetail(identityDescription) : ''
    const promptAnswers =
      isReimagineMode && wantsFreshCharacter && sanitizedFeedback
        ? [normalizedIdentityDescription, sanitizedFeedback].filter(Boolean)
        : orderedAnswers

    if (!shouldEditExisting && promptAnswers.length === 0) {
      return NextResponse.json({ error: 'No avatar description provided.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    let response
    if (shouldEditExisting) {
      const currentAvatarSummary = await describeCurrentAvatarWithVision(
        openai,
        previousImageUrl,
        normalizedIdentityDescription || undefined,
      )

      response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: buildVisionAnchoredEditPrompt(
          currentAvatarSummary,
          sanitizedFeedback,
          normalizedIdentityDescription || undefined,
          typeof style === 'string' ? style : undefined,
        ),
        size: '1024x1536',
        quality: 'high',
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
