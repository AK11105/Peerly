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

async function runGapDetection(weaveId: string, newTitle: string, newDescription: string) {
  try {
    const { data: nodes } = await supabase
      .from('nodes')
      .select('depth, difficulty, title')
      .eq('weave_id', weaveId)
      .eq('status', 'approved')

    if (!nodes?.length) return

    const summary = nodes.map((n) => `- [${n.depth}/${n.difficulty}] ${n.title}`).join('\n')
    const prompt = `Review this learning map for missing prerequisites.

Existing nodes:
${summary}

New node: "${newTitle}" — ${newDescription}

If YES: {"gap_detected":true,"missing_concept":"name","scaffold_node":{"title":"short title","description":"1-2 sentences.","depth":<int>,"difficulty":<1-5>}}
If NO: {"gap_detected":false,"missing_concept":null,"scaffold_node":null}

Output ONLY the JSON.`

    const raw = await callAI(prompt)
    const gap = parseJSON(raw)

    if (gap.gap_detected && gap.scaffold_node) {
      const s = gap.scaffold_node
      await supabase.from('nodes').insert({
        id: randomUUID(),
        weave_id: weaveId,
        title: s.title,
        description: s.description,
        depth: Number(s.depth),
        difficulty: Number(s.difficulty),
        is_scaffold: true,
        contributed_by: null,
        status: 'approved',
      })
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

  const { data: existingNodes } = await supabase
    .from('nodes')
    .select('depth')
    .eq('weave_id', weaveId)
    .eq('status', 'approved')

  if (!existingNodes) return NextResponse.json({ error: 'Weave not found' }, { status: 404 })

  const maxDepth = existingNodes.reduce((max, n) => Math.max(max, n.depth), 0)

  const newNode = {
    id: randomUUID(),
    weave_id: weaveId,
    title: body.title,
    description: body.description,
    depth: maxDepth + 1,
    difficulty: 3,
    is_scaffold: false,
    contributed_by: body.contributed_by ?? userId,
    status: 'approved',
  }

  const { error } = await supabase.from('nodes').insert(newNode)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({
    weave_id: weaveId, node_id: newNode.id, username: userId, type: 'add_node', lumens_earned: 25,
  })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 25 })

  runGapDetection(weaveId, body.title, body.description)

  return NextResponse.json({ node: newNode })
}
