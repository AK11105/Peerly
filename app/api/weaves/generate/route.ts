import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseJSON(raw: string): any {
  const cleaned = raw.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) try { return JSON.parse(fence[1].trim()) } catch {}
  const obj = cleaned.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/)
  if (obj) try { return JSON.parse(obj[0]) } catch {}
  throw new Error('Could not parse JSON from AI response')
}

async function callAI(prompt: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: prompt }], stream: false }),
  })
  const data = await res.json()
  return data.message.content
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isPro(userId)) return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const { topic, seed_nodes = [], field, include_scaffolds = true } = await req.json()

  let nodes: any[] = []

  if (include_scaffolds) {
    const seedHint = seed_nodes.length ? `\nInclude these concepts: ${seed_nodes.join(', ')}.` : ''
    const prompt = `You are a curriculum designer. Build a learning map for: "${topic}".${seedHint}

Generate 6-8 knowledge nodes ordered by prerequisite depth.
Rules: depth starts at 0 (foundation). difficulty 1-5. Each node: title (max 5 words) + 1-2 sentence description.

Output ONLY a JSON array:
[{"title":"..","description":"..","depth":0,"difficulty":1}, ...]`

    const raw = await callAI(prompt)
    const parsed = parseJSON(raw)
    nodes = parsed.map((item: any) => ({
      id: randomUUID(),
      title: item.title,
      description: item.description,
      depth: Number(item.depth),
      difficulty: Number(item.difficulty),
      is_scaffold: true,
      contributed_by: null,
    }))
  }

  const weave = { id: randomUUID(), topic, field: field ?? null, nodes }
  const { error } = await supabase.from('weaves').insert(weave)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Register creator as admin
  const creator = userId
  await supabase.rpc('ensure_user', { p_username: creator })
  await supabase.from('weave_admins').upsert({ weave_id: weave.id, username: creator })
  await supabase.from('user_weaves').upsert({ username: creator, weave_id: weave.id })

  return NextResponse.json(weave)
}
