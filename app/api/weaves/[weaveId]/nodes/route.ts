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
  throw new Error('Could not parse JSON')
}

function sortNodes(nodes: any[]) {
  return [...nodes].sort((a, b) =>
    a.depth - b.depth || a.difficulty - b.difficulty || Number(a.is_scaffold) - Number(b.is_scaffold)
  )
}

async function runGapDetection(weaveId: string, nodes: any[], title: string, description: string) {
  try {
    const summary = nodes.map((n: any) => `- [${n.depth}/${n.difficulty}] ${n.title}`).join('\n')
    const prompt = `Review this learning map for missing prerequisites.

Existing nodes:
${summary}

New node: "${title}" — ${description}

If YES: {"gap_detected":true,"missing_concept":"name","scaffold_node":{"title":"short title","description":"1-2 sentences.","depth":<int>,"difficulty":<1-5>}}
If NO: {"gap_detected":false,"missing_concept":null,"scaffold_node":null}

Output ONLY the JSON.`

    const raw = await callAI(prompt)
    const gap = parseJSON(raw)

    if (gap.gap_detected && gap.scaffold_node) {
      const { data: current } = await supabase.from('weaves').select('nodes').eq('id', weaveId).single()
      if (current) {
        const s = gap.scaffold_node
        const scaffold = {
          id: randomUUID(), title: s.title, description: s.description,
          depth: Number(s.depth), difficulty: Number(s.difficulty),
          is_scaffold: true, contributed_by: null,
        }
        await supabase.from('weaves').update({ nodes: sortNodes([...current.nodes, scaffold]) }).eq('id', weaveId)
      }
    }
  } catch (e) {
    console.error('[gap detection]', e)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ weaveId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isPro(userId)) return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const { weaveId } = await params
  const body = await req.json()

  const { data: weave, error } = await supabase.from('weaves').select('*').eq('id', weaveId).single()
  if (error || !weave) return NextResponse.json({ error: 'Weave not found' }, { status: 404 })

  const newNode = {
    id: randomUUID(),
    title: body.title,
    description: body.description,
    depth: Math.max(...weave.nodes.map((n: any) => n.depth), 0) + 1,
    difficulty: 3,
    is_scaffold: false,
    contributed_by: body.contributed_by ?? 'anonymous',
  }

  const updatedNodes = sortNodes([...weave.nodes, newNode])
  const { error: updateErr } = await supabase.from('weaves').update({ nodes: updatedNodes }).eq('id', weaveId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({ weave_id: weaveId, node_id: newNode.id, username: userId, type: 'add_node', lumens_earned: 25 })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 25 })

  // Fire-and-forget gap detection — Supabase Realtime will push the scaffold to clients
  runGapDetection(weaveId, updatedNodes, body.title, body.description)

  return NextResponse.json({
    weave: { ...weave, nodes: updatedNodes },
    gap_detection: { gap_detected: false, missing_concept: null, scaffold_node: null },
  })
}
