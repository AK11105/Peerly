import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ weaveId: string; nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isPro(userId)) return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const { weaveId, nodeId } = await params
  const body = await req.json()

  const { data: target, error: fetchErr } = await supabase
    .from('nodes')
    .select('id, title, description')
    .eq('id', nodeId)
    .eq('weave_id', weaveId)
    .single()

  if (fetchErr || !target) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  const { data: userRow } = await supabase.from('users').select('display_name').eq('username', userId).maybeSingle()
  const contributedBy = userRow?.display_name ?? body.contributed_by ?? 'anonymous'

  // Queue perspective as pending — admin approves or sends to community vote
  const pendingId = randomUUID()
  const { error: insertErr } = await supabase.from('nodes').insert({
    id: pendingId,
    weave_id: weaveId,
    title: target.title,
    description: body.description,
    is_scaffold: false,
    contributed_by: contributedBy,
    submitted_by: userId,
    status: 'PENDING_ADMIN',
    perspective_source_id: nodeId,
    attachments: body.attachments ?? null,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Notify weave admins
  const { data: admins } = await supabase.from('weave_admins').select('username').eq('weave_id', weaveId)
  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map((a: any) => ({
        weave_id: weaveId,
        type: 'pending_node',
        node_id: pendingId,
        username: a.username,
      }))
    )
  }

  await supabase.rpc('ensure_user', { p_username: userId })

  return NextResponse.json({ status: 'PENDING_ADMIN', node_id: pendingId }, { status: 202 })
}
