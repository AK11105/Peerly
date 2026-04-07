import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Requires these tables (add to schema if not present):
//   node_upvotes (node_id uuid FK nodes.id, username text, primary key (node_id, username))
//   nodes.upvotes int not null default 0

export async function POST(
  req: Request,
  { params }: { params: Promise<{ weaveId: string; nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId } = await params

  // Check if already voted
  const { data: existing } = await supabase
    .from('node_upvotes')
    .select('node_id')
    .eq('node_id', nodeId)
    .eq('username', userId)
    .maybeSingle()

  if (existing) {
    // Toggle off
    await supabase.from('node_upvotes').delete().eq('node_id', nodeId).eq('username', userId)
    const { data } = await supabase.rpc('decrement_node_upvotes', { p_node_id: nodeId })
    return NextResponse.json({ upvotes: data, voted: false })
  } else {
    // Toggle on
    await supabase.from('node_upvotes').insert({ node_id: nodeId, username: userId })
    const { data } = await supabase.rpc('increment_node_upvotes', { p_node_id: nodeId })
    return NextResponse.json({ upvotes: data, voted: true })
  }
}
