import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncUser } from '@/lib/sync-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await syncUser(userId)
  const { messageId } = await params

  const { data: existing } = await supabase
    .from('community_upvotes')
    .select('username')
    .eq('username', userId).eq('target_id', messageId).eq('target_type', 'message')
    .maybeSingle()

  if (existing) {
    await supabase.from('community_upvotes')
      .delete().eq('username', userId).eq('target_id', messageId).eq('target_type', 'message')
    await supabase.rpc('decrement_message_upvotes', { p_message_id: messageId })
    const { data: msg } = await supabase.from('community_messages').select('upvotes').eq('id', messageId).single()
    return NextResponse.json({ upvotes: msg?.upvotes ?? 0 })
  } else {
    await supabase.from('community_upvotes')
      .insert({ username: userId, target_id: messageId, target_type: 'message' })
    await supabase.rpc('increment_message_upvotes', { p_message_id: messageId })
    const { data: msg } = await supabase.from('community_messages').select('upvotes').eq('id', messageId).single()
    await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 1 })
    return NextResponse.json({ upvotes: msg?.upvotes ?? 0 })
  }
}
