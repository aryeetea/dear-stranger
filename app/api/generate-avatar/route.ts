import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

// --- PROMPT CONSTANTS (The "Secret Sauce" for your style) ---
const STYLE_CONSTANTS = {
  BASE_RENDER: 
    "Semi-realistic 3D render with 2.5D depth. NOT flat illustration, NOT anime, NOT cartoon. " +
    "Style: high-quality CG character art, volumetric lighting, subsurface skin scattering, fine hair strands, realistic fabric texture, and cinematic depth of field. " +
    "Visual Quality: Unreal Engine 5 MetaHuman meets cinematic concept art—photorealistic proportions, soft dramatic lighting.",
  
  COMPOSITION: 
    "Composition: full body visible head to toe, vertical portrait orientation, face clearly lit. " +
    "IMPORTANT: depict exactly ONE single character. No duplicate figures, no mirror images, no side-by-side poses. " +
    "Technical: No text, no watermark, no logo, no flat shading, no cel-shading, no cartoon outlines.",

  THEMES: {
    fantasy: "Fantasy theme: magical environment, ethereal glow, otherworldly atmosphere.",
    modern: "Modern theme: clean contemporary setting, stylish urban or studio environment.",
    celestial: "Celestial theme: cosmic starfield, moonlit atmosphere, divine radiant energy.",
    futuristic: "Futuristic theme: sleek sci-fi environment, holographic elements, neon-lit corridors.",
    nature: "Nature-inspired theme: lush forest, flowing water, golden-hour light."
  }
}

// Helper to clean up user input
function normalizeDetail(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').trim()
}

/**
 * Builds the final prompt sent to ChatGPT/DALL-E
 */
function buildFinalPrompt(answers: string[], styleKey: string = 'fantasy'): string {
  const details = answers.map(a => normalizeDetail(a)).filter(Boolean).join(', ')
  const selectedTheme = STYLE_CONSTANTS.THEMES[styleKey as keyof typeof STYLE_CONSTANTS.THEMES] || STYLE_CONSTANTS.THEMES.fantasy

  return [
    `Character Description: ${details || 'A mysterious figure'}.`,
    STYLE_CONSTANTS.BASE_RENDER,
    selectedTheme,
    STYLE_CONSTANTS.COMPOSITION
  ].join('\n\n')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { answers, style, userId } = body

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 1. Parse answers into a clean array
    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, val]) => String(val))

    // 2. Build the high-detail prompt
    const finalPrompt = buildFinalPrompt(orderedAnswers, style)

    // 3. Call DALL-E 3 (The engine behind ChatGPT images)
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: finalPrompt,
      size: "1024x1792", // Vertical aspect ratio for full-body avatars
      quality: "hd",
      response_format: "b64_json",
      user: userId,
    })

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${response.data?.[0]?.b64_json}`,
      revisedPrompt: response.data?.[0]?.revised_prompt,
    })

  } catch (error: any) {
    console.error("Generation Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}