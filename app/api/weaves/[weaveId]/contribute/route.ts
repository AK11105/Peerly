import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isPro } from '@/lib/check-plan'
import { createClient } from '@supabase/supabase-js'

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

  const { data: target, error: fetchErr } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', body.scaffold_node_id)
    .eq('weave_id', weaveId)
    .single()

  if (fetchErr || !target) return NextResponse.json({ error: 'Scaffold node not found' }, { status: 404 })
  if (!target.is_scaffold) return NextResponse.json({ error: 'Target is not a scaffold' }, { status: 400 })

  const { data: updated, error: updateErr } = await supabase
    .from('nodes')
    .update({
      title: body.title,
      description: body.description,
      is_scaffold: false,
      contributed_by: body.contributed_by ?? userId,
    })
    .eq('id', target.id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({
    weave_id: weaveId, node_id: target.id, username: userId, type: 'scaffold_fill', lumens_earned: 50,
  })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 50 })

  return NextResponse.json(updated)
}
