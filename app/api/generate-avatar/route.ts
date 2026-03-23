import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy:
    `Stylized semi-realistic fantasy character portrait. Three-quarter view with strong cinematic lighting — deep directional key light casting defined shadows across the face and body, with a contrasting rim light creating separation and depth. Rich volumetric rendering: prominent cheekbones catching light, deep eye sockets with shadow, nose bridge with sharp highlight, defined jawline. Flowing magical garments with fabric folds that have visible light-to-shadow transitions. Luminous magical accents with glowing depth. Rich jewel tones: deep plum, midnight blue, emerald, gold. Background: enchanted forest, moonlit ruins, or mystical archway with atmospheric depth haze. Premium fantasy fashion concept art — NOT cartoon, NOT flat, NOT 2D illustration.`,

  modern:
    `Stylized semi-realistic contemporary fashion portrait. Strong studio or golden-hour lighting with a defined key light source — sharp highlights on the nose, cheekbone, and brow creating clear form and depth. Deep shadows in the eye sockets and under the chin. Volumetric skin rendering with subsurface warmth and pore detail. Clean editorial fashion — clothing with fabric fold depth, button and seam detail, material texture. Neutral palette with one strong accent color. Background: moody city architecture, luxury interior, or dusk street. Premium editorial fashion illustration — NOT flat, NOT cartoon, NOT 2D.`,

  'fantasy-modern':
    `Stylized semi-realistic fantasy-modern portrait. Dramatic three-quarter lighting — hard directional key light with deep shadows creating strong facial relief, rim light separating figure from background. Contemporary fashion pieces with subtle magical details: glowing jewelry, luminous trim, celestial motifs, ethereal texture overlays. Rich volumetric rendering — defined muscle form under fabric, hair with individual strand depth, skin with visible lighting transitions from highlight to shadow to ambient. Background: city lights merging with mystical atmospheric haze. Premium character concept art — NOT flat, NOT cartoon, NOT 2D.`,

  celestial:
    `Stylized semi-realistic celestial portrait. Divine directional lighting as if lit by moonlight and starlight — cool silver key light with deep indigo shadows, strong rim light creating a glowing halo effect around the silhouette. Volumetric face with prominent brow, deep-set luminous eyes, high cheekbones, defined nose bridge. Flowing fabrics with complex fold shadows. Cosmic details: moon motifs, star-scattered fabric, silver and indigo glowing accents with depth and particle glow. Background: nebula with atmospheric depth, celestial hall, or moonlit dreamscape. Ethereal and mature — NOT flat, NOT cartoon, NOT 2D.`,

  royal:
    `Stylized semi-realistic regal portrait. Candlelit palace lighting — warm golden key light from below or side, deep contrasting shadows, strong facial volume. Prominent cheekbones lit from the side, deep eye sockets, defined jaw. Rich velvet garments with depth: fabric pile catching light differently at different angles, embroidery with highlight and shadow, metallic accents with specular reflections. Deep jewel tones: crimson, navy, gold. Background: palace interior with depth and candlelight atmosphere. High-end fantasy editorial — NOT flat, NOT cartoon, NOT 2D.`,

  streetwear:
    `Stylized semi-realistic streetwear fashion portrait. Neon-urban lighting — strong colored key light (neon pink, blue, or amber) creating dramatic highlights and deep complementary shadows. Volumetric face: defined nose, cheekbones catching neon light, shadowed eye sockets, jawline with rim light. Premium streetwear: fabric weight and texture visible in folds, reflective material panels, layered depth. Background: wet pavement reflections, neon signs, nightlife urban glow with atmospheric depth. Premium character fashion art — NOT flat, NOT cartoon, NOT 2D.`,

  futuristic:
    `Stylized semi-realistic futuristic portrait. Sci-fi lighting — cool blue or cyan key light from the side with warm secondary fill, creating strong facial depth and shadow. Volumetric rendering: metal and synthetic fabric with specular highlights, glowing seam details with depth glow, reflective material surfaces showing environment. Defined facial structure with high-tech aesthetic. Background: neon city at night, sci-fi interior with depth haze, or glowing skyline. High-end sci-fi fashion concept art — NOT flat, NOT cartoon, NOT 2D.`,

  nature:
    `Stylized semi-realistic nature-inspired portrait. Dappled forest or greenhouse lighting — warm golden key light filtering through leaves, creating patterned highlights and deep natural shadows. Volumetric skin rendering with earthy warmth, defined facial structure. Botanical fashion: organic fabric textures with fold depth, floral appliqué with petal dimensionality, layered natural materials. Warm greens, terracotta, gold. Background: misty forest with atmospheric depth, sacred garden, or greenhouse. Mature fantasy fashion — NOT flat, NOT cartoon, NOT 2D.`,
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
  const styleDirection = STYLE_DIRECTIONS[styleKey] || STYLE_DIRECTIONS.modern

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
- Background with atmospheric perspective/depth haze to separate figure from scene`,

    `The result must feel like premium 3D character concept art or high-end CGI fashion render. Avoid flat cel-shading, avoid uniform lighting, avoid 2D illustration look, avoid cartoon proportions, avoid anime-flat rendering.`,

    `Face: beautiful, well-defined features with strong bone structure readable through lighting and shadow. Body: elegant believable proportions. Clothing: intentional, stylish, with material depth.`,

    `Composition: character centered and fully visible head to toe, vertical portrait, strong readable silhouette with rim light separation from background.`,

    `No text, no watermark, no logo, no extra characters.`,

    details ? `Character details from the user's self-description:\n${details}` : '',
    feedbackLine,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithGptImage(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'high',
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

async function generateWithDalle(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    quality: 'hd',
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
    const { answers, feedback, userId, style } = await req.json()

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

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      console.warn('gpt-image-1 failed, falling back to dall-e-3:', primaryError)
      const fallback = await generateWithDalle(openai, imagePrompt, userId)
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