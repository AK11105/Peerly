import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { callAI } from '@/lib/ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseJSON(raw: string): any {
  const c = raw.trim()
  try { return JSON.parse(c) } catch {}
  const fence = c.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) try { return JSON.parse(fence[1].trim()) } catch {}
  const obj = c.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/)
  if (obj) try { return JSON.parse(obj[0]) } catch {}
  throw new Error('Could not parse JSON from AI response')
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isPro(userId)) return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const { topic, seed_nodes = [], field, include_scaffolds = true } = await req.json()

  const weaveId = randomUUID()
  const { error: weaveErr } = await supabase.from('weaves').insert({ id: weaveId, topic, field: field ?? null })
  if (weaveErr) return NextResponse.json({ error: weaveErr.message }, { status: 500 })

  let nodes: any[] = []

  if (include_scaffolds) {
    const seedHint = seed_nodes.length ? `\nInclude these concepts: ${seed_nodes.join(', ')}.` : ''
    const prompt = `You are a curriculum designer. Build a learning map for: "${topic}".${seedHint}

Generate 6-8 knowledge nodes ordered by prerequisite depth.
Rules: depth starts at 0 (foundation). difficulty 1-5. Each node: title (max 5 words, non-empty) + 1-2 sentence description.

Output ONLY a JSON array:
[{"title":"..","description":"..","depth":0,"difficulty":1}, ...]`

    const raw = await callAI(prompt)
    const parsed = parseJSON(raw)

    const rows = parsed
      .filter((item: any) => item.title?.trim())
      .map((item: any) => ({
        id: randomUUID(),
        weave_id: weaveId,
        title: item.title.trim(),
        description: item.description ?? '',
        depth: Math.max(0, Number(item.depth) || 0),
        difficulty: Math.min(5, Math.max(1, Math.round(Number(item.difficulty) || 1))),
        is_scaffold: true,
        contributed_by: null,
        status: 'approved',
      }))

    if (rows.length > 0) {
      const { error: nodesErr } = await supabase.from('nodes').insert(rows)
      if (nodesErr) return NextResponse.json({ error: nodesErr.message }, { status: 500 })
      nodes = rows
    }
  }

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('weave_admins').upsert({ weave_id: weaveId, username: userId })
  await supabase.from('user_weaves').upsert({ username: userId, weave_id: weaveId })

  return NextResponse.json({ id: weaveId, topic, field: field ?? null, nodes })
}
