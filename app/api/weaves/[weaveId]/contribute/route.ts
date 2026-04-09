import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { callAI } from '@/lib/ai'
import { parseJSON } from '@/lib/parse-json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runGapDetection(weaveId: string, topic: string, newTitle: string, newDesc: string) {
  try {
    const { data: existingNodes } = await supabase
      .from('nodes').select('title,depth,difficulty').eq('weave_id', weaveId).eq('status', 'approved')
    if (!existingNodes?.length) return

    const summary = existingNodes.map((n: any) => `- [depth:${n.depth}/diff:${n.difficulty}] ${n.title}`).join('\n')
    const prompt = `Learning map topic: "${topic}"
Existing approved nodes:
${summary}
Newly filled scaffold: "${newTitle}" — ${newDesc}
Missing prerequisite NOT already listed?
If YES: {"gap_detected":true,"missing_concept":"name","scaffold_node":{"title":"short title","description":"1-2 sentences.","depth":<int>,"difficulty":<1-5>}}
If NO: {"gap_detected":false,"missing_concept":null,"scaffold_node":null}
Output ONLY the JSON.`

    const raw = await callAI(prompt)
    const gap = parseJSON(raw)
    if (!gap.gap_detected || !gap.scaffold_node) return

    const s = gap.scaffold_node
    if (!s.title?.trim() || !s.description?.trim()) return
    const t = s.title.toLowerCase()
    if (existingNodes.some((n: any) => n.title.toLowerCase().includes(t) || t.includes(n.title.toLowerCase()))) {
      console.log('[gap-detection] skipped duplicate:', s.title)
      return
    }

    const maxDepth = Math.max(...existingNodes.map((n: any) => n.depth))
    await supabase.from('nodes').insert({
      id: randomUUID(), weave_id: weaveId,
      title: s.title.trim(), description: s.description.trim(),
      depth: Math.min(Number(s.depth) || 0, maxDepth + 1),
      difficulty: Math.min(5, Math.max(1, Math.round(Number(s.difficulty) || 1))),
      is_scaffold: true, contributed_by: null, status: 'approved',
    })
  } catch (e) {
    console.error('[gap-detection]', e)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ weaveId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isPro(userId)) return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const { weaveId } = await params
  const body = await req.json()

  const { data: weave, error } = await supabase.from('weaves').select('topic').eq('id', weaveId).single()
  if (error || !weave) return NextResponse.json({ error: 'Weave not found' }, { status: 404 })

  const { data: target, error: nodeErr } = await supabase
    .from('nodes').select('*').eq('id', body.scaffold_node_id).eq('weave_id', weaveId).single()
  if (nodeErr || !target) return NextResponse.json({ error: 'Scaffold node not found' }, { status: 404 })
  if (!target.is_scaffold) return NextResponse.json({ error: 'Target is not a scaffold' }, { status: 400 })

  const title = body.title?.trim() || target.title
  const description = body.description?.trim()
  if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })

  // Resolve contributed_by from DB display_name — never trust client-sent value
  const { data: userRow } = await supabase.from('users').select('display_name').eq('username', userId).maybeSingle()
  const contributedBy = userRow?.display_name ?? body.contributed_by ?? 'anonymous'

  const { error: updateErr } = await supabase
    .from('nodes')
    .update({ title, description, is_scaffold: false, contributed_by: contributedBy, status: 'approved' })
    .eq('id', target.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({ weave_id: weaveId, node_id: target.id, username: userId, type: 'scaffold_fill', lumens_earned: 50 })
  const { data: earnData, error: earnErr } = await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 50 })
  if (earnErr) console.error('[earn_lumens contribute FAILED]', earnErr.message, { userId })
  else console.log('[earn_lumens contribute OK]', { userId, newBalance: earnData })

  runGapDetection(weaveId, weave.topic, title, description)

  return NextResponse.json({ success: true, node_id: target.id })
}
