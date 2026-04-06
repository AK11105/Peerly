import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'

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

  const { data: target, error } = await supabase
    .from('nodes').select('*').eq('id', nodeId).eq('weave_id', weaveId).single()
  if (error || !target) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  const appended = `${target.description}\n\n---\n\n**${body.contributed_by ?? 'anonymous'}:** ${body.description}`
  const { error: updateErr } = await supabase
    .from('nodes').update({ description: appended }).eq('id', nodeId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({ weave_id: weaveId, node_id: nodeId, username: userId, type: 'perspective', lumens_earned: 25 })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 25 })

  return NextResponse.json({ success: true })
}
