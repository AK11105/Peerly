import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Groq free tier: 6000 TPM. Cap prompts at 16000 chars as a safety net.
const GROQ_CHAR_LIMIT = 16_000

async function callGroq(prompt: string): Promise<string> {
  const truncated = prompt.length > GROQ_CHAR_LIMIT
    ? prompt.slice(0, GROQ_CHAR_LIMIT) + '\n\n[content truncated — output JSON now]'
    : prompt
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: truncated }],
  })
  return res.choices[0].message.content ?? ''
}

async function callGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function callAI(prompt: string): Promise<string> {
  try {
    return await callGroq(prompt)
  } catch (e) {
    console.warn('[AI] Groq failed, falling back to Gemini:', (e as Error).message)
    return await callGemini(prompt)
  }
}
