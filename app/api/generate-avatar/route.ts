import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

interface StyleOption {
  id?: string
  label?: string
  desc?: string
}

export async function POST(req: Request) {
  try {
    const { answers, selectedStyle, feedback } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!geminiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
    }

    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(geminiKey)
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const answersText = Object.entries(answers || {})
      .map(([i, a]) => `${String(i)}: ${String(a)}`)
      .join('\n')

    const style = (selectedStyle || {}) as StyleOption
    const styleLabel = style.label?.trim() || 'Fantasy Modern'
    const styleDesc = style.desc?.trim() || 'a mix of magical and modern style'
    const feedbackText = typeof feedback === 'string' && feedback.trim() ? feedback.trim() : 'None'

    const promptResult = await textModel.generateContent(`
Create a polished image-generation prompt for a full-body Soul Mirror avatar.

User profile and answers:
${answersText || 'No answers provided.'}

Selected avatar style:
- Style name: ${styleLabel}
- Style description: ${styleDesc}

Regeneration feedback:
${feedbackText}

Requirements:
- Full-body character, clearly visible from head to toe
- Character centered and dominant in frame
- The avatar's outfit, fashion, silhouette, styling, and accessories must strongly reflect what the user wants
- Prioritize the user's fashion preferences, aesthetic preferences, and identity cues from their answers
- Prioritize the selected style in the final design
- Make the outfit highly visible, not hidden by framing
- Strong visibility of clothing, footwear, accessories, layers, and overall silhouette
- Beautiful, cohesive, striking styling
- Clean supporting background that enhances the character without overpowering the fashion
- Calm, powerful, introspective presence
- Cinematic, polished digital art
- High detail
- Do not make it just a face portrait or close-up
- Do not crop out legs, shoes, or major outfit details
- Do not mention artist names, copyrighted franchises, camera brands, or platform names

Style guidance:
- Modern = current, stylish, fashion-forward, realistic details
- Fantasy = magical, ethereal, mythical elements
- Fantasy Modern = blend fantasy elements with modern clothing/fashion
- Celestial = cosmic, moonlit, divine, star-inspired design
- Royal = luxurious, elegant, noble, commanding
- Streetwear = trendy, bold, cool, expressive fashion
- Futuristic = sleek, sci-fi, advanced materials, glowing details
- Nature Inspired = earthy, organic, floral, soft natural beauty

Return only the final image prompt.
Keep it under 170 words.
`)

    const imagePrompt = promptResult.response.text().trim()
    console.log('Avatar prompt:', imagePrompt)

    const openai = new OpenAI({ apiKey: openaiKey })

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size: '1024x1536',
    })

    const imageBase64 = imageResponse.data?.[0]?.b64_json

    if (!imageBase64) {
      throw new Error('No image returned')
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`

    return NextResponse.json({
      imageUrl,
      prompt: imagePrompt,
      selectedStyle: {
        label: styleLabel,
        desc: styleDesc,
      },
    })
  } catch (error) {
    console.error('generate-avatar error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}