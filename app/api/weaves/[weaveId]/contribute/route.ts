import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  const { data: userRow } = await supabase.from('users').select('display_name').eq('username', userId).maybeSingle()
  const contributedBy = userRow?.display_name ?? body.contributed_by ?? 'anonymous'

  // Queue as a pending contribution — store proposed content alongside scaffold reference
  const pendingId = randomUUID()
  const { error: insertErr } = await supabase.from('nodes').insert({
    id: pendingId,
    weave_id: weaveId,
    title,
    description,
    depth: target.depth,
    difficulty: target.difficulty,
    is_scaffold: false,
    contributed_by: contributedBy,
    submitted_by: userId,
    status: 'PENDING_ADMIN',
    scaffold_source_id: target.id,
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
