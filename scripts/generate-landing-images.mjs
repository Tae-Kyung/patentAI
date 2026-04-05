/**
 * Gemini API를 사용하여 랜딩페이지 일러스트레이션 이미지를 생성합니다.
 *
 * Usage: node scripts/generate-landing-images.mjs
 *
 * 필요: GOOGLE_AI_API_KEY 환경변수 (.env 파일)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'images', 'landing')

// .env에서 API 키 읽기
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
  console.error('ERROR: GOOGLE_AI_API_KEY not found in .env')
  process.exit(1)
}

// 사용할 모델 목록 (순서대로 시도)
const MODELS = [
  'nano-banana-pro-preview',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-exp-image-generation',
]

const STYLE_PREFIX = `Flat modern vector illustration style, clean minimal design, soft pastel color palette with blue and purple tones, suitable for a SaaS landing page. No text or words in the image. White or light gradient background.`

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
    prompt: `${STYLE_PREFIX} Automatic document generation: Multiple floating documents (business plan, pitch deck, landing page) being assembled by AI robotic arms or magic sparkles. Documents show abstract layouts with charts, text blocks, and images. Blue and warm orange accents.`,
  },
  {
    name: 'feature-deploy',
    prompt: `${STYLE_PREFIX} One-click deployment concept: A laptop screen showing a landing page with a rocket launching from the screen into the cloud. Share icons, link icons, and notification bells floating around. Mentor avatar giving a thumbs up. Green and blue accents.`,
  },
  {
    name: 'ai-orchestration',
    prompt: `${STYLE_PREFIX} Multi-AI orchestration: Three distinct AI models represented as glowing orbs (blue, purple, green) connected to a central orchestrator hub. Data flows between them showing collaboration. Abstract neural network patterns in the background. Dark theme with glowing neon accents on dark blue-gray background.`,
  },
]

async function generateImage(imageConfig, modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`

  const body = {
    contents: [
      {
        parts: [{ text: `Generate an illustration image: ${imageConfig.prompt}` }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  if (!data.candidates || !data.candidates[0]?.content?.parts) {
    throw new Error(`No candidates in response: ${JSON.stringify(data).slice(0, 500)}`)
  }

  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      const ext = part.inlineData.mimeType?.includes('png') ? 'png' : 'webp'
      const outputPath = path.join(OUTPUT_DIR, `${imageConfig.name}.${ext}`)
      fs.writeFileSync(outputPath, buffer)
      console.log(`  ✓ Saved: ${imageConfig.name}.${ext} (${(buffer.length / 1024).toFixed(1)} KB)`)
      return ext
    }
  }

  throw new Error('No image data found in response')
}

async function findWorkingModel() {
  console.log('Finding working model for image generation...')
  for (const model of MODELS) {
    try {
      console.log(`  Testing model: ${model}`)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Generate a simple blue circle illustration' }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const hasImage = data.candidates?.[0]?.content?.parts?.some(p => p.inlineData)
        if (hasImage) {
          console.log(`  ✓ Model ${model} works for image generation!`)
          return model
        } else {
          console.log(`  ✗ Model ${model} responded but no image data`)
        }
      } else {
        const err = await response.text()
        console.log(`  ✗ Model ${model} error: ${err.slice(0, 200)}`)
      }
    } catch (e) {
      console.log(`  ✗ Model ${model} failed: ${e.message}`)
    }
  }
  return null
}

async function main() {
  console.log('=== CASA Landing Page Image Generator ===\n')

  // 출력 디렉토리 확인
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 동작하는 모델 찾기
  const model = await findWorkingModel()
  if (!model) {
    console.error('\n✗ No working model found for image generation.')
    console.error('Available models might have changed. Check https://ai.google.dev/gemini-api/docs/image-generation')
    process.exit(1)
  }

  console.log(`\nUsing model: ${model}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  const results = []
  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i]
    console.log(`[${i + 1}/${IMAGES.length}] Generating: ${img.name}`)
    try {
      const ext = await generateImage(img, model)
      results.push({ name: img.name, ext, success: true })
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message.slice(0, 200)}`)
      results.push({ name: img.name, success: false, error: e.message })
    }

    // API 속도 제한 방지 - 5초 대기
    if (i < IMAGES.length - 1) {
      console.log('  Waiting 5s...')
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log('\n=== Results ===')
  for (const r of results) {
    if (r.success) {
      console.log(`  ✓ ${r.name}.${r.ext}`)
    } else {
      console.log(`  ✗ ${r.name} - FAILED`)
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log(`\nDone: ${successCount}/${IMAGES.length} images generated`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
