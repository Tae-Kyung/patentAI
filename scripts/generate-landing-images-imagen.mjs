/**
 * Imagen 4.0 API를 사용하여 랜딩페이지 일러스트레이션 이미지를 생성합니다.
 * (Gemini 이미지 생성 쿼터와 별도)
 *
 * Usage: node scripts/generate-landing-images-imagen.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'landing')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnv()

const API_KEY = process.env.GOOGLE_AI_API_KEY
if (!API_KEY) {
  console.error('ERROR: GOOGLE_AI_API_KEY not found')
  process.exit(1)
}

const STYLE_PREFIX = `Flat modern vector illustration style, clean minimal design, soft pastel color palette with blue and purple tones, suitable for a tech SaaS landing page. No text, letters, or words in the image. White or light gradient background.`

const IMAGES = [
  {
    name: 'hero-dashboard',
    prompt: `${STYLE_PREFIX} A modern AI-powered startup accelerator dashboard floating in isometric perspective. Shows glowing analytics charts, neural network nodes connecting data points, a lightbulb icon transforming into structured business documents, and progress bars. Gradient accents in blue, purple, and teal.`,
  },
  {
    name: 'feature-idea',
    prompt: `${STYLE_PREFIX} AI idea expansion concept: A glowing lightbulb on the left side sending energy beams to organized floating cards on the right. The cards show abstract icons for problem, solution, target customer, and differentiation. Sparkle effects around the transformation. Blue and teal accents.`,
  },
  {
    name: 'feature-eval',
    prompt: `${STYLE_PREFIX} Three AI expert avatars (represented as abstract geometric figures) analyzing a startup idea from different angles. One with a magnifying glass (investor), one with bar charts (market analyst), one with a gear/circuit (tech expert). Radar chart in the center showing scores. Purple and indigo accents.`,
  },
  {
    name: 'feature-docs',
    prompt: `${STYLE_PREFIX} Automatic document generation: Multiple floating documents (business plan, pitch deck, landing page wireframe) being assembled by magic sparkles and AI glow effects. Documents show abstract layouts with charts, text blocks, and images. Blue and warm orange accents.`,
  },
  {
    name: 'feature-deploy',
    prompt: `${STYLE_PREFIX} One-click deployment concept: A laptop screen showing a landing page with a rocket launching from the screen into the cloud. Share icons, link icons, and notification bells floating around. A mentor figure giving a thumbs up. Green and blue accents.`,
  },
  {
    name: 'ai-orchestration',
    prompt: `${STYLE_PREFIX} Multi-AI orchestration: Three distinct AI models represented as glowing orbs (blue, purple, green) connected to a central orchestrator hub with flowing data streams. Abstract neural network patterns. Dark blue-gray background with glowing neon accents.`,
  },
]

// Imagen 모델 목록 (순서대로 시도)
const IMAGEN_MODELS = [
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-generate-001',
  'imagen-4.0-generate-preview-06-06',
]

async function testImagenModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`
  const body = {
    instances: [{ prompt: 'A simple blue circle on white background' }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9',
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`${response.status}: ${err.slice(0, 300)}`)
  }

  const data = await response.json()
  if (data.predictions?.[0]?.bytesBase64Encoded) {
    return true
  }
  throw new Error('No image data in response')
}

async function generateWithImagen(imageConfig, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`

  const body = {
    instances: [{ prompt: imageConfig.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9',
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err.slice(0, 300)}`)
  }

  const data = await response.json()

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error(`No image data: ${JSON.stringify(data).slice(0, 300)}`)
  }

  const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64')
  const mimeType = data.predictions[0].mimeType || 'image/png'
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'png'
  const outputPath = path.join(OUTPUT_DIR, `${imageConfig.name}.${ext}`)
  fs.writeFileSync(outputPath, buffer)
  console.log(`  ✓ Saved: ${imageConfig.name}.${ext} (${(buffer.length / 1024).toFixed(1)} KB)`)
  return ext
}

// Gemini native image generation (fallback)
async function generateWithGemini(imageConfig) {
  const models = [
    'nano-banana-pro-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
  ]

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
      const body = {
        contents: [{ parts: [{ text: `Generate an illustration: ${imageConfig.prompt}` }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) continue

      const data = await response.json()
      for (const part of (data.candidates?.[0]?.content?.parts || [])) {
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data, 'base64')
          const ext = part.inlineData.mimeType?.includes('png') ? 'png' : 'webp'
          const outputPath = path.join(OUTPUT_DIR, `${imageConfig.name}.${ext}`)
          fs.writeFileSync(outputPath, buffer)
          console.log(`  ✓ Saved (Gemini ${model}): ${imageConfig.name}.${ext} (${(buffer.length / 1024).toFixed(1)} KB)`)
          return ext
        }
      }
    } catch {
      continue
    }
  }
  throw new Error('All Gemini models failed')
}

async function main() {
  console.log('=== CASA Landing Page Image Generator (Imagen + Gemini) ===\n')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 1. Imagen 모델 테스트
  let imagenModel = null
  console.log('Testing Imagen models...')
  for (const model of IMAGEN_MODELS) {
    try {
      console.log(`  Testing: ${model}`)
      await testImagenModel(model)
      console.log(`  ✓ ${model} works!`)
      imagenModel = model
      break
    } catch (e) {
      console.log(`  ✗ ${model}: ${e.message.slice(0, 150)}`)
    }
  }

  // 2. Gemini 이미지 생성 테스트 (Imagen 실패 시)
  let useGemini = false
  if (!imagenModel) {
    console.log('\nImagen not available. Testing Gemini image generation...')
    try {
      await generateWithGemini({ name: '_test', prompt: 'A simple blue circle' })
      useGemini = true
      fs.unlinkSync(path.join(OUTPUT_DIR, '_test.png')).catch(() => {})
      fs.unlinkSync(path.join(OUTPUT_DIR, '_test.webp')).catch(() => {})
      console.log('  ✓ Gemini image generation available')
    } catch {
      console.error('\n✗ Neither Imagen nor Gemini image generation available.')
      console.error('Check your API quota at: https://aistudio.google.com/apikey')
      process.exit(1)
    }
  }

  const method = imagenModel ? `Imagen (${imagenModel})` : 'Gemini'
  console.log(`\nUsing: ${method}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  const results = []
  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i]
    console.log(`[${i + 1}/${IMAGES.length}] Generating: ${img.name}`)
    try {
      let ext
      if (imagenModel) {
        ext = await generateWithImagen(img, imagenModel)
      } else {
        ext = await generateWithGemini(img)
      }
      results.push({ name: img.name, ext, success: true })
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message.slice(0, 200)}`)
      results.push({ name: img.name, success: false, error: e.message })
    }

    // Rate limit 방지
    if (i < IMAGES.length - 1) {
      const waitMs = imagenModel ? 3000 : 8000
      console.log(`  Waiting ${waitMs / 1000}s...`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }

  console.log('\n=== Results ===')
  for (const r of results) {
    console.log(r.success ? `  ✓ ${r.name}.${r.ext}` : `  ✗ ${r.name} - FAILED`)
  }

  const successCount = results.filter(r => r.success).length
  console.log(`\nDone: ${successCount}/${IMAGES.length} images generated`)

  if (successCount > 0) {
    console.log('\nNext step: Run the component update to use these images.')
  }
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
