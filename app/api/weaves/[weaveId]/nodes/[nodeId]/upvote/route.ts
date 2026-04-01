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
  const { blockIndex } = await req.json()
  const voterKey = `${blockIndex}:${userId}`

  // Atomic read-check-write using Postgres to avoid race conditions
  const { data, error } = await supabase.rpc('upvote_node_explanation', {
    p_weave_id: weaveId,
    p_node_id: nodeId,
    p_voter_key: voterKey,
    p_block_index: blockIndex,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data === null) return NextResponse.json({ error: 'Weave or node not found' }, { status: 404 })
  if (data === -1) return NextResponse.json({ error: 'already_voted' }, { status: 409 })

  return NextResponse.json({ upvotes: data })
}
