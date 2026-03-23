import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

type GenerationMode = 'create' | 'reimagine'

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy:
    `Stylized semi-realistic fantasy character portrait. Three-quarter view with strong cinematic lighting — deep directional key light casting defined shadows across the face and body, with a contrasting rim light creating separation and depth. Rich volumetric rendering: prominent cheekbones catching light, deep eye sockets with shadow, nose bridge with sharp highlight, defined jawline. Flowing magical garments with fabric folds that have visible light-to-shadow transitions. Luminous magical accents with glowing depth. Rich jewel tones: deep plum, midnight blue, emerald, gold. Background: enchanted forest, moonlit ruins, or mystical archway with atmospheric depth haze. Premium fantasy fashion concept art — NOT cartoon, NOT flat, NOT 2D illustration.`,

  earthbound:
    `Stylized semi-realistic grounded portrait. Strong studio or golden-hour lighting with a defined key light source — sharp highlights on the nose, cheekbone, and brow creating clear form and depth. Deep shadows in the eye sockets and under the chin. Volumetric skin rendering with warmth and softness. Elegant, intimate styling: natural textures, thoughtful tailoring, subtle jewelry, lived-in beauty. Background: quiet architecture, a candlelit room, rain-softened streets, or a still interior with emotional atmosphere. Premium editorial portrait art — NOT flat, NOT cartoon, NOT 2D.`,

  'mythic-modern':
    `Stylized semi-realistic mythic-modern portrait. Dramatic three-quarter lighting — directional key light with deep shadows creating strong facial relief, rim light separating figure from background. Contemporary silhouettes touched by myth: symbolic jewelry, luminous trim, sacred motifs, ethereal layers, tailored pieces with a hint of magic. Rich volumetric rendering — defined form under fabric, hair with individual strand depth, skin with visible lighting transitions from highlight to ambient shadow. Background: modern architecture dissolving into dreamlike haze. Premium character concept art — NOT flat, NOT cartoon, NOT 2D.`,

  celestial:
    `Stylized semi-realistic celestial portrait. Divine directional lighting as if lit by moonlight and starlight — cool silver key light with deep indigo shadows, strong rim light creating a glowing halo effect around the silhouette. Volumetric face with prominent brow, deep-set luminous eyes, high cheekbones, defined nose bridge. Flowing fabrics with complex fold shadows. Cosmic details: moon motifs, star-scattered fabric, silver and indigo glowing accents with depth and particle glow. Background: nebula with atmospheric depth, celestial hall, or moonlit dreamscape. Ethereal and mature — NOT flat, NOT cartoon, NOT 2D.`,

  regal:
    `Stylized semi-realistic regal portrait. Candlelit palace or sanctuary lighting — warm golden key light from below or side, deep contrasting shadows, strong facial volume. Prominent cheekbones lit from the side, deep eye sockets, defined jaw. Rich velvet garments with depth: fabric pile catching light differently at different angles, embroidery with highlight and shadow, metallic accents with specular reflections. Deep jewel tones: crimson, navy, gold. Background: ceremonial hall, sacred chamber, or palace interior with atmospheric depth. High-end fantasy editorial — NOT flat, NOT cartoon, NOT 2D.`,

  nocturne:
    `Stylized semi-realistic nocturne portrait. Night-lit cinematic lighting — colored key light in indigo, amber, or rose creating dramatic highlights and deep shadow. Volumetric face: defined nose, cheekbones catching light, shadowed eye sockets, jawline with rim separation. Clothing should feel expressive and elegant, with layered fabrics, reflective trims, dark romance, and magnetic silhouette. Background: rain-slick streets, twilight balconies, glowing windows, or midnight architecture with atmospheric depth. Premium cinematic character art — NOT flat, NOT cartoon, NOT 2D.`,

  'luminous-future':
    `Stylized semi-realistic luminous-future portrait. Visionary dream-tech lighting — cool blue, pearl, or cyan key light from the side with warm secondary glow, creating strong facial depth and shadow. Volumetric rendering: iridescent fabrics, metallic accents, glowing seam details with depth glow, reflective surfaces that still feel elegant rather than mechanical. Defined facial structure with a soft futuristic aesthetic. Background: futuristic sanctuary, glowing observatory, dream-city skyline, or sci-fi interior with depth haze. High-end sci-fi fantasy concept art — NOT flat, NOT cartoon, NOT 2D.`,

  garden:
    `Stylized semi-realistic garden portrait. Dappled forest or greenhouse lighting — warm golden key light filtering through leaves, creating patterned highlights and deep natural shadows. Volumetric skin rendering with earthy warmth, defined facial structure. Botanical fashion: organic fabric textures with fold depth, floral appliqué with petal dimensionality, layered natural materials. Warm greens, terracotta, blush, and gold. Background: misty forest with atmospheric depth, sacred garden, greenhouse, or overgrown conservatory. Mature fantasy fashion — NOT flat, NOT cartoon, NOT 2D.`,

  sanctuary:
    `Stylized semi-realistic sanctuary portrait. Candlelit devotional lighting — warm amber key light, soft halos, and gentle shadow shaping across the face and body. Volumetric rendering with serene facial depth, elegant hands, and softly structured garments. Styling should feel sacred and contemplative: layered robes, antique jewelry, embroidered details, quiet symbolism. Background: hidden chapel, old library, sacred archive, or moonlit shrine with atmospheric depth. Premium spiritual portrait art — NOT flat, NOT cartoon, NOT 2D.`,

  'velvet-gothic':
    `Stylized semi-realistic velvet-gothic portrait. Dramatic low-key lighting — rich crimson, wine, plum, and candle-gold highlights cutting through deep shadow. Strong facial relief with sculptural cheekbones, expressive eyes, and elegant silhouette separation. Styling should feel darkly romantic: velvet, lace, antique metal, dramatic tailoring, and old-world glamour. Background: gothic interior, velvet-draped hall, moonlit manor, or shadowed balcony with atmospheric depth. Premium dark-romantic character art — NOT flat, NOT cartoon, NOT 2D.`,

  tideborn:
    `Stylized semi-realistic tideborn portrait. Moon-pulled ocean lighting — cool silver-blue key light, softened reflections, and layered watery glow creating depth across skin and fabric. Volumetric rendering with flowing garments, sea-glass tones, pearl accents, and drifting textures that feel tidal rather than literal costume. Background: moonlit shore, flooded ruin, misted harbor, or underwater-adjacent dreamscape with atmospheric depth. Ethereal oceanic portrait art — NOT flat, NOT cartoon, NOT 2D.`,
}

function buildAvatarPrompt(answers: string[], style?: string, feedback?: string) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 10)

  const details = trimmedAnswers
    .map((a, i) => `${i + 1}. ${a}`)
    .join('\n')

  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  const styleDirection = STYLE_DIRECTIONS[styleKey] || STYLE_DIRECTIONS.earthbound

  const feedbackLine = feedback?.trim()
    ? `Revision note to follow carefully: ${normalizeDetail(feedback)}.`
    : ''

  return [
    `Create a single vertical full-body character portrait. ${styleDirection}`,

    // Core 3D/volume instructions
    `CRITICAL RENDERING REQUIREMENTS: The image must look three-dimensional, sculptural, and volumetric — NOT flat or illustrative. Achieve this through:
- Strong single directional key light with clearly visible shadow falloff across the face and body
- Deep eye socket shadows, nose shadow cast on upper lip, defined jaw shadow
- Subsurface scattering on skin (ears, nose tip, lips appear slightly translucent with warmth)
- Hair rendered with individual strand groups catching light at different angles
- Fabric with fold highlights, fold shadows, and material-specific texture (silk sheen vs matte cotton vs leather specular)
- Background with atmospheric perspective/depth haze to separate figure from scene
- Ambient occlusion where forms meet: jaw to neck, collar to clothing, fingers to fabric, hair overlapping the face
- Real camera depth cues: slight lens compression, believable perspective, foreground/background separation, no flat front-lit passport framing`,

    `The result must feel like premium 3D character concept art or high-end CGI fashion render, but still unmistakably otherworldly. Aim for stylized realism: ethereal, dreamlike, elevated, slightly magical, with elegant exaggeration in atmosphere and styling. Avoid mundane everyday selfie realism, avoid uncanny hyper-detailed hyperrealism, avoid flat cel-shading, avoid uniform lighting, avoid 2D illustration look, avoid cartoon proportions, avoid anime-flat rendering, avoid paper-doll posing, avoid sticker-like cutout silhouettes, avoid blank flat backgrounds.`,

    `Face: beautiful, well-defined features with strong bone structure readable through lighting and shadow. Body: elegant believable proportions with anatomical volume. Clothing: intentional, stylish, with material depth and layered silhouettes. The overall presence should feel hauntingly beautiful, mythic, and emotionally charged rather than ordinary.`,

    `Composition: character centered and fully visible head to toe, vertical portrait, strong readable silhouette with rim light separation from background. Pose should feel grounded and cinematic, not stiff or front-flat.`,

    `No text, no watermark, no logo, no extra characters.`,

    details ? `Character details from the user's self-description:\n${details}` : '',
    feedbackLine,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId?: string,
  mode: GenerationMode = 'create',
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1536',
    quality: mode === 'reimagine' ? 'medium' : 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('gpt-image-1 returned no image data.')

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

async function generateWithDalle(
  openai: OpenAI,
  prompt: string,
  userId?: string,
  mode: GenerationMode = 'create',
) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1792',
    quality: mode === 'reimagine' ? 'standard' : 'hd',
    style: 'vivid',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = response.data?.[0]
  if (image?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  throw new Error('dall-e-3 returned no image data.')
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style, mode } = await req.json()

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => normalizeDetail(String(answer)))
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No answers provided.' }, { status: 400 })
    }

    const imagePrompt = buildAvatarPrompt(orderedAnswers, style, feedback)
    const openai = new OpenAI({ apiKey: openaiKey })
    const generationMode: GenerationMode = mode === 'reimagine' ? 'reimagine' : 'create'

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId, generationMode)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      if (generationMode === 'reimagine') {
        console.warn('gpt-image-1 failed during reimagine:', primaryError)
        throw primaryError
      }

      console.warn('gpt-image-1 failed, falling back to dall-e-3:', primaryError)
      const fallback = await generateWithDalle(openai, imagePrompt, userId, generationMode)
      return NextResponse.json({
        imageUrl: fallback.imageUrl,
        prompt: fallback.revisedPrompt,
      })
    }
  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}
