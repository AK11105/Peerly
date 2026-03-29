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

  const { data: weave, error } = await supabase.from('weaves').select('*').eq('id', weaveId).single()
  if (error || !weave) return NextResponse.json({ error: 'Weave not found' }, { status: 404 })

  const target = weave.nodes.find((n: any) => n.id === nodeId)
  if (!target) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  const updatedNode = {
    ...target,
    description: `${target.description}\n\n---\n\n**${body.contributed_by ?? 'anonymous'}:** ${body.description}`,
  }

  const updatedNodes = weave.nodes.map((n: any) => n.id === nodeId ? updatedNode : n)
  const { error: updateErr } = await supabase.from('weaves').update({ nodes: updatedNodes }).eq('id', weaveId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('contributions').insert({ weave_id: weaveId, node_id: nodeId, username: userId, type: 'perspective', lumens_earned: 25 })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 25 })

  return NextResponse.json({ ...weave, nodes: updatedNodes })
}
