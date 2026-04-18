import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai'
import { parseJSON } from '@/lib/parse-json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ weaveId: string; nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weaveId, nodeId } = await params

  const { data: adminRow } = await supabase
    .from('weave_admins').select('weave_id').eq('weave_id', weaveId).eq('username', userId).single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: delErr } = await supabase.from('nodes').delete().eq('id', nodeId).eq('weave_id', weaveId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Restructure remaining approved nodes
  const { data: weave } = await supabase.from('weaves').select('topic').eq('id', weaveId).single()
  const { data: remaining } = await supabase
    .from('nodes').select('id,title,description,depth,difficulty').eq('weave_id', weaveId).eq('status', 'approved')

  if (weave && remaining && remaining.length > 0) {
    try {
      const summary = remaining.map((n: any) => `- "${n.title}": ${n.description?.slice(0, 80)}`).join('\n')
      const prompt = `Learning map topic: "${weave.topic}"

Remaining nodes after a deletion:
${summary}

Re-assign depth (0-based integer, 0 = beginner) and difficulty (1-5) for each node so the prerequisite order is coherent.
Reply ONLY as a JSON array: [{"id":"...","depth":<int>,"difficulty":<1-5>}, ...]`

      const raw = await callAI(prompt)
      const updates: { id: string; depth: number; difficulty: number }[] = parseJSON(raw)

      if (Array.isArray(updates)) {
        await Promise.all(
          updates.map((u) =>
            supabase.from('nodes')
              .update({ depth: u.depth, difficulty: u.difficulty })
              .eq('id', u.id)
              .eq('weave_id', weaveId)
          )
        )
      }
    } catch (e) {
      console.error('[restructure] failed:', e)
    }
  }

  return NextResponse.json({ success: true })
}
