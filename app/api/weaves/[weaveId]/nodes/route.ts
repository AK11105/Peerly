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

function titleExists(nodes: any[], title: string): boolean {
  const t = title.toLowerCase()
  return nodes.some((n) => n.title.toLowerCase().includes(t) || t.includes(n.title.toLowerCase()))
}

async function runGapDetection(weaveId: string, topic: string, newTitle: string, newDesc: string) {
  try {
    const { data: existingNodes } = await supabase
      .from('nodes').select('title,depth,difficulty').eq('weave_id', weaveId).eq('status', 'approved')

    if (!existingNodes?.length) return

    const summary = existingNodes.map((n: any) => `- [depth:${n.depth}/diff:${n.difficulty}] ${n.title}`).join('\n')
    const prompt = `Learning map topic: "${topic}"

Existing approved nodes:
${summary}

Newly added node: "${newTitle}" — ${newDesc}

Is there a missing prerequisite concept NOT already in the list above?
If YES: {"gap_detected":true,"missing_concept":"name","scaffold_node":{"title":"short title (max 5 words)","description":"1-2 sentences.","depth":<int>,"difficulty":<1-5>}}
If NO: {"gap_detected":false,"missing_concept":null,"scaffold_node":null}

Output ONLY the JSON.`

    const raw = await callAI(prompt)
    const gap = parseJSON(raw)

    if (!gap.gap_detected || !gap.scaffold_node) return

    const s = gap.scaffold_node
    if (!s.title?.trim() || !s.description?.trim()) return
    if (titleExists(existingNodes, s.title)) {
      console.log('[gap-detection] skipped duplicate:', s.title)
      return
    }

    const maxDepth = Math.max(...existingNodes.map((n: any) => n.depth))
    const scaffold = {
      id: randomUUID(),
      weave_id: weaveId,
      title: s.title.trim(),
      description: s.description.trim(),
      depth: Math.min(Number(s.depth) || 0, maxDepth + 1),
      difficulty: Math.min(5, Math.max(1, Math.round(Number(s.difficulty) || 1))),
      is_scaffold: true,
      contributed_by: null,
      status: 'approved',
    }

    await supabase.from('nodes').insert(scaffold)
    console.log('[gap-detection] inserted scaffold:', scaffold.title, `depth:${scaffold.depth} diff:${scaffold.difficulty}`)
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
  const title: string = body.title?.trim()
  const description: string = body.description?.trim()

  if (!title || title.length < 3 || !description) {
    return NextResponse.json({ error: 'title (min 3 chars) and description are required' }, { status: 400 })
  }

  const { data: weave, error } = await supabase.from('weaves').select('topic').eq('id', weaveId).single()
  if (error || !weave) return NextResponse.json({ error: 'Weave not found' }, { status: 404 })

  // Duplicate check — block if similar title already exists (pending OR approved)
  const { data: existingAll } = await supabase
    .from('nodes').select('title').eq('weave_id', weaveId).in('status', ['pending', 'approved'])
  if (existingAll) {
    const t = title.toLowerCase()
    const duplicate = existingAll.find((n: any) => {
      const e = n.title.toLowerCase()
      return e === t || e.includes(t) || t.includes(e)
    })
    if (duplicate) {
      return NextResponse.json({ error: `A similar node already exists: "${duplicate.title}"` }, { status: 409 })
    }
  }

  // 1. Relevance check
  const relevancePrompt = `Weave topic: "${weave.topic}"
Proposed node — title: "${title}", description: "${description}"

Is this node relevant and appropriate for this learning map?
Reply ONLY JSON: {"relevant":true|false,"reason":"one sentence"}`

  try {
    const raw = await callAI(relevancePrompt)
    const check = parseJSON(raw)
    if (!check.relevant) {
      console.log('[relevance] rejected:', title, '—', check.reason)
      return NextResponse.json({ error: `Node rejected: ${check.reason}` }, { status: 422 })
    }
  } catch (e) {
    console.warn('[relevance] check failed, allowing through:', e)
  }

  // 2. Formatter agent — assign correct depth + difficulty
  const { data: existingNodes } = await supabase
    .from('nodes').select('title,depth,difficulty').eq('weave_id', weaveId).eq('status', 'approved')
  let depth = 0
  let difficulty = 3

  if (existingNodes?.length) {
    const summary = existingNodes.map((n: any) => `- [depth:${n.depth}/diff:${n.difficulty}] ${n.title}`).join('\n')
    const formatterPrompt = `Learning map topic: "${weave.topic}"

Existing nodes (depth/difficulty):
${summary}

New node: "${title}" — ${description}

Where does this node fit in the prerequisite tree?
Reply ONLY JSON: {"depth":<int>,"difficulty":<1-5>,"reasoning":"one sentence"}`

    try {
      const raw = await callAI(formatterPrompt)
      const fmt = parseJSON(raw)
      const maxDepth = Math.max(...existingNodes.map((n: any) => n.depth))
      depth = Math.min(Math.max(0, Number(fmt.depth) || 0), maxDepth + 1)
      difficulty = Math.min(5, Math.max(1, Math.round(Number(fmt.difficulty) || 3)))
      console.log('[formatter]', title, `→ depth:${depth} diff:${difficulty} |`, fmt.reasoning)
    } catch (e) {
      console.warn('[formatter] failed, using defaults:', e)
    }
  }

  // 3. Insert as pending — HITL
  const nodeId = randomUUID()

  // Resolve contributed_by from DB display_name to avoid storing raw Clerk IDs
  const { data: userRow } = await supabase.from('users').select('display_name').eq('username', userId).maybeSingle()
  const contributedBy = userRow?.display_name ?? body.contributed_by ?? 'anonymous'

  const newNode = {
    id: nodeId,
    weave_id: weaveId,
    title,
    description,
    depth,
    difficulty,
    is_scaffold: false,
    contributed_by: contributedBy,
    submitted_by: userId,
    status: 'pending',
  }

  const { error: insertErr } = await supabase.from('nodes').insert(newNode)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // 4. Notify weave admins
  const { data: admins } = await supabase.from('weave_admins').select('username').eq('weave_id', weaveId)
  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map((a: any) => ({
        weave_id: weaveId,
        type: 'pending_node',
        node_id: nodeId,
        username: a.username,
      }))
    )
  }

  await supabase.rpc('ensure_user', { p_username: userId })

  // 5. Fire-and-forget gap detection
  runGapDetection(weaveId, weave.topic, title, description)

  return NextResponse.json({ status: 'pending', node: newNode }, { status: 202 })
}
