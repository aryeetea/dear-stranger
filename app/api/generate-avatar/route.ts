import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy:
    'Background mood: a grounded fantasy environment with real setting detail such as a forest path, quiet courtyard, stone hall, cliffside, market lane, or camp at dusk. Rich atmosphere, but not abstract or mystical by default.',
  modern:
    'Background mood: a believable contemporary place such as a studio, street, cafe, apartment, rooftop, or city walkway with soft natural depth.',
  'fantasy-modern':
    'Background mood: a grounded cinematic setting where modern life meets subtle fantasy, such as a city street, alley, station, or courtyard with only a light touch of enchantment.',
  celestial:
    'Background mood: moonlit, airy, and luminous, but still environmental and scene-based rather than abstract cosmic voids.',
  royal:
    'Background mood: elegant architectural spaces such as a palace corridor, noble garden, library, gallery, or terrace with refined detail.',
  streetwear:
    'Background mood: vivid urban environments such as sidewalks, murals, storefronts, train platforms, and city corners with strong personality.',
  futuristic:
    'Background mood: sleek futuristic environments such as transit hubs, observation decks, city streets, or interior corridors with clear spatial depth.',
  nature:
    'Background mood: a natural environment with real landscape detail such as forest clearings, coastlines, gardens, mountains, rain-soaked paths, or golden-hour trees.',
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
  return normalizeDetail(value || '').slice(0, 500)
}

function requestsWholeNewAvatar(feedback: string): boolean {
  if (!feedback) return false
  return /\b(whole new avatar|completely new avatar|entirely new avatar|totally new avatar|brand new avatar|start over|from scratch|completely different|totally different|change everything|different person|new character)\b/i.test(feedback)
}

function buildIdentityInstruction(details: string): string {
  const lower = details.toLowerCase()
  const feminineTerms =
    /\b(princess|queen|duchess|empress|goddess|girl|woman|lady|female|feminine|she\/her|she|her)\b/
  const masculineTerms =
    /\b(prince|king|duke|emperor|god\b|boy|man|male|masculine|he\/him|he|him)\b/
  const nonbinaryTerms =
    /\b(nonbinary|non-binary|genderfluid|androgynous|they\/them|they|them)\b/

  if (feminineTerms.test(lower) && !masculineTerms.test(lower)) {
    return 'GENDER: Render a feminine/female-presenting character. Never change to male, boy, prince, or king.'
  }
  if (masculineTerms.test(lower) && !feminineTerms.test(lower)) {
    return 'GENDER: Render a masculine/male-presenting character. Never change to female, woman, or princess.'
  }
  if (nonbinaryTerms.test(lower)) {
    return 'GENDER: Render as nonbinary/androgynous. Do not force a strictly male or female look.'
  }
  return 'GENDER: Preserve the gender, role, and identity words the user provided. Never swap roles (e.g. princess → prince).'
}

function buildAccuracyGuard(details: string): string {
  const lower = details.toLowerCase()
  const rules: string[] = []

  if (/\bblack\b/.test(lower)) {
    rules.push('If the user described a Black person, the character must visibly read as Black. Never change them to East Asian, white, racially ambiguous, or a different ethnicity.')
  }
  if (/\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bbrown skin\b/.test(lower)) {
    rules.push('Keep the skin tone richly dark/deep brown if that was described. Never lighten it.')
  }
  if (/\bblue\b/.test(lower) && /\bbraid|\bbraids|\bgoddess braids|\bplaits?/.test(lower)) {
    rules.push('If blue braids were described, the hair must stay long blue braids. Never swap to black hair, buns, loose waves, or straight hair.')
  }
  if (/\bhoodie\b/.test(lower) || /\bcargo pants?\b/.test(lower) || /\bstreetwear\b/.test(lower)) {
    rules.push('If the outfit was described as streetwear, hoodie, vest, or cargo pants, keep it as casual streetwear separates. Never turn it into fantasy robes, gowns, dresses, armor, or formalwear.')
  }
  if (/\bpokemon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b/.test(lower)) {
    rules.push('If a small companion creature was described, it must be clearly visible beside the character. Never omit it.')
  }

  rules.push('Do not drift toward a generic default pretty portrait. The result must match the user description specifically, not a nearby approximation.')
  return rules.join('\n')
}

function buildAvatarPrompt(answers: string[], styleKey?: string): string {
  const details = answers.map((a) => normalizeDetail(a)).filter(Boolean).join(', ')
  const identityInstruction = buildIdentityInstruction(details)
  const accuracyGuard = buildAccuracyGuard(details)
  const normalizedStyle = normalizeStyleKey(styleKey)
  const customStyle = normalizeDetail(styleKey || '')
  const backgroundMood =
    STYLE_DESCRIPTORS[normalizedStyle] ||
    (customStyle
      ? `Background mood: ${customStyle} — use this only to shape the background environment and lighting.`
      : STYLE_DESCRIPTORS.fantasy)

  return `
SUBJECT — render this character EXACTLY as described:
${details || 'a mysterious figure'}

${identityInstruction}

CLOTHING & HAIR — CRITICAL:
Render every clothing item, hairstyle, hair color, and accessory EXACTLY as the user described them.
Do not substitute, reimagine, upgrade, or replace any described item with a thematic alternative.
Do not let the chosen background style or mood override what the user is wearing or how their hair looks.
Preserve every specific detail — fabric, fit, color, cut, and style — precisely as described.
If the user described modern clothes, streetwear, casualwear, or layered everyday clothing, keep that exact outfit category.
Do not change casual clothes into gowns, robes, strapless dresses, fantasy costumes, armor, formalwear, or generic "pretty" styling.
If the user described braids, locs, curls, or any specific hairstyle, keep that hairstyle exactly. Never replace it with a bun, loose waves, or straight hair.

SKIN TONE — CRITICAL:
Render the character's skin tone EXACTLY as described. Never lighten, darken, or approximate it.
If no skin tone is described, use a warm neutral tone. Do not let the background style or mood influence the skin tone — it must remain true to the user's description.

ART STYLE:
Semi-realistic cinematic illustration. Believable anatomy and lighting, but still clearly stylized and artistic.
Painterly finish, hand-crafted detail, cinematic color and atmosphere.
NOT a photograph, NOT hyperreal, NOT plastic-looking 3D, NOT cartoon. No watermarks, no text, no labels.

COMPOSITION:
Vertical portrait (taller than wide). Full body visible from head to toe. Character upright, facing viewer.
Head must be at the top of the frame and feet at the bottom. Never rotate sideways or 90 degrees.
Never produce a landscape, reference sheet, collage, split layout, or sideways composition.
Do not crop into a bust portrait unless the user explicitly asked for that.
The entire figure must fit comfortably inside the frame with visible shoes or feet and some space around the body.
Prefer slightly zoomed-out framing over any crop that cuts off legs, knees, arms, hair length, or companion.
This must read as a full-body portrait first, not a beauty shot.

BACKGROUND:
${backgroundMood}
The background must be coherent, specific, and match the character's vibe.
Prefer a distinct place with depth and environmental detail, not a generic glowing backdrop.
Avoid mystical halos, magic circles, portal rings, spotlight auras, abstract voids, centered sigils, random glitter, empty gradients, or unrelated particles unless the user explicitly asked for them.
Different characters should feel like they belong in different places rather than the same default background treatment.
Do not add visible signs, words, logos, storefront text, UI elements, or readable lettering anywhere in the image.

COMPANIONS:
If the user mentioned a pet, animal, familiar, mount, spirit creature, or companion, it is REQUIRED in the image.
Do not omit it. Do not replace it with a different animal or creature.
Keep the companion visually present with the character, clearly readable in the portrait, and consistent with the user's description.
Treat the companion as part of the avatar identity, not as background decoration.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}

FINAL REMINDER — HIGHEST PRIORITY:
The character must look EXACTLY like this: ${details || 'a mysterious figure'}
This overrides all style, background, and mood instructions above.
Skin tone, hair, clothing, and identity must match this description precisely.
Do not substitute, reimagine, or stylize away from these specifics.
If the output would contradict the user's race, skin tone, hairstyle, or outfit, regenerate internally and correct it before finalizing.
`.trim()
}

function buildReimaginePrompt(feedback: string, identityDescription?: string) {
  const normalizedFeedback = normalizeFeedback(feedback)
  const normalizedIdentity = normalizeDetail(identityDescription || '')
  const identityInstruction = normalizedIdentity
    ? `ORIGINAL DESCRIPTION TO PRESERVE:\n${normalizedIdentity}\n\nTreat those identity details as non-negotiable unless the user explicitly asked to change them.`
    : 'ORIGINAL DESCRIPTION TO PRESERVE:\nPreserve the existing avatar identity exactly unless the user explicitly asked to change a specific detail.'
  return `
TASK:
Edit the provided avatar image. Preserve the same person, same identity, same face, same hairstyle, same general character design, and same overall vibe.

GOAL:
This is a reimagination of the existing avatar, not a replacement with a different person.
Make the result feel refined, cohesive, and slightly more cinematic while keeping the character recognizably the same.
If the current avatar includes a pet, animal, or companion, preserve that companion unless the user explicitly asked to remove or change it.

STYLE:
Semi-realistic cinematic illustration. Believable anatomy and lighting, but still clearly stylized and artistic.
Painterly finish, not photoreal, not plastic 3D, not cartoon.

${identityInstruction}

COMPOSITION:
Keep it vertical portrait orientation and upright. Never rotate the character sideways.
Preserve or improve full-body framing. Do not crop the character into a half-body, bust, or close-up portrait.
Head-to-toe visibility is required unless the user explicitly asked for a different crop.

IDENTITY LOCKS:
Never change race, ethnicity, or skin tone.
Never change the hair color, hairstyle, or outfit category unless the user explicitly asked for that exact change.
If the original description says Black, dark-skinned, blue braids, hoodie, vest, cargo pants, or companion creature, keep those details unless the user explicitly requested a different version of them.
Do not add headphones, random accessories, or unrelated styling not requested by the user.

EDIT INSTRUCTIONS:
${normalizedFeedback || 'Do a gentle reimagination only: improve polish, styling, atmosphere, and coherence while preserving the character.'}

SAFETY CHECK:
Do not replace the person with a different character unless the user explicitly asked for a whole new avatar.
Do not randomize race, skin tone, facial structure, or hair identity.
Do not drop an existing companion/pet unless the user explicitly asked for that change.
`.trim()
}

function sanitizeAnswers(raw: Record<string, unknown>): string[] {
  return Object.entries(raw)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, val]) => String(val).slice(0, 300))
    .filter(Boolean)
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
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

    const { answers, style, feedback, mode, previousImageUrl, forceNewAvatar, identityDescription } = body

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers payload.' }, { status: 400 })
    }

    const orderedAnswers = sanitizeAnswers(answers)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided.' }, { status: 400 })
    }

    const sanitizedStyle = typeof style === 'string' ? style.slice(0, 100) : undefined
    const sanitizedFeedback = typeof feedback === 'string' ? normalizeFeedback(feedback) : ''
    const shouldEditExisting =
      mode === 'reimagine' &&
      typeof previousImageUrl === 'string' &&
      previousImageUrl.trim().length > 0 &&
      forceNewAvatar !== true &&
      !requestsWholeNewAvatar(sanitizedFeedback)

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

    const openai = new OpenAI({ apiKey: openaiKey })

    let response
    if (shouldEditExisting) {
      const imageResponse = await fetch(previousImageUrl!)
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Could not load the current avatar for reimagine.' }, { status: 400 })
      }
      const imageBlob = await imageResponse.blob()
      const imageFile = await toFile(imageBlob, 'avatar-reference.png')

      response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt: buildReimaginePrompt(sanitizedFeedback, typeof identityDescription === 'string' ? identityDescription : undefined),
        size: '1024x1536',
        quality: 'high',
        input_fidelity: 'high',
        output_format: 'png',
        user: user.id,
      })
    } else {
      const finalPrompt = buildAvatarPrompt(orderedAnswers, sanitizedStyle)
      response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: finalPrompt,
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
