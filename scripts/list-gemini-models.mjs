import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

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
console.log('API key length:', API_KEY?.length || 0)

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
const data = await res.json()

if (data.error) {
  console.log('Error:', JSON.stringify(data.error, null, 2))
  process.exit(1)
}

const models = data.models || []
console.log(`Total models: ${models.length}\n`)

for (const m of models) {
  const methods = (m.supportedGenerationMethods || []).join(', ')
  console.log(`${m.name}  |  ${methods}`)
}
