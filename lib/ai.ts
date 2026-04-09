import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Groq free tier: 6000 TPM. Cap prompts at 16000 chars as a safety net.
const GROQ_CHAR_LIMIT = 16_000

async function callGroq(prompt: string, model = 'llama-3.1-8b-instant'): Promise<string> {
  const truncated = prompt.length > GROQ_CHAR_LIMIT
    ? prompt.slice(0, GROQ_CHAR_LIMIT) + '\n\n[content truncated — output JSON now]'
    : prompt
  const res = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: truncated }],
  })
  return res.choices[0].message.content ?? ''
}

async function callGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// Default: fast model for gap detection, explain, etc.
export async function callAI(prompt: string): Promise<string> {
  try {
    return await callGroq(prompt)
  } catch (e) {
    console.warn('[AI] Groq failed, falling back to Gemini:', (e as Error).message)
    return await callGemini(prompt)
  }
}

// Heavy model for import clustering — needs stronger reasoning over long content
export async function callAIStrong(prompt: string): Promise<string> {
  try {
    return await callGroq(prompt, 'llama-3.3-70b-versatile')
  } catch (e) {
    console.warn('[AI] Groq 70b failed, falling back to Gemini:', (e as Error).message)
    return await callGemini(prompt)
  }
}
