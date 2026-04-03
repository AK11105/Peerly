import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function callGroq(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0].message.content ?? ''
}

async function callOllama(prompt: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: prompt }], stream: false }),
  })
  const data = await res.json()
  return data.message.content
}

export async function callAI(prompt: string): Promise<string> {
  try {
    return await callGroq(prompt)
  } catch (e) {
    console.warn('[AI] Groq failed, falling back to Ollama:', (e as Error).message)
    return await callOllama(prompt)
  }
}
