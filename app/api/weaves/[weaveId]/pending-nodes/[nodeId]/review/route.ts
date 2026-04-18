import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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

  const { weaveId, nodeId } = await params
  const { action } = await req.json()

  if (!['approve', 'reject', 'send_to_vote'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, reject, or send_to_vote' }, { status: 400 })
  }

  const { data: adminRow } = await supabase
    .from('weave_admins').select('weave_id').eq('weave_id', weaveId).eq('username', userId).single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const newStatus = action === 'approve' ? 'approved' : action === 'send_to_vote' ? 'PENDING_VOTE' : 'rejected'
  const { error } = await supabase.from('nodes').update({ status: newStatus }).eq('id', nodeId).eq('weave_id', weaveId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'approve') {
    const { data: node } = await supabase.from('nodes').select('submitted_by').eq('id', nodeId).single()
    if (node?.submitted_by) {
      await supabase.from('contributions').insert({ weave_id: weaveId, node_id: nodeId, username: node.submitted_by, type: 'add_node', lumens_earned: 25 })
      await supabase.rpc('earn_lumens', { p_username: node.submitted_by, p_amount: 25 })
    }
  }

  await supabase.from('notifications').update({ read: true }).eq('node_id', nodeId).eq('weave_id', weaveId)

  return NextResponse.json({ status: newStatus })
}
