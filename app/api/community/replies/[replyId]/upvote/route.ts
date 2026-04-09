import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncUser } from '@/lib/sync-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ replyId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await syncUser(userId)
  const { replyId } = await params

  const { data: existing } = await supabase
    .from('community_upvotes')
    .select('username')
    .eq('username', userId).eq('target_id', replyId).eq('target_type', 'reply')
    .maybeSingle()

  if (existing) {
    await supabase.from('community_upvotes')
      .delete().eq('username', userId).eq('target_id', replyId).eq('target_type', 'reply')
    await supabase.rpc('decrement_reply_upvotes', { p_reply_id: replyId })
    const { data: reply } = await supabase.from('community_replies').select('upvotes').eq('id', replyId).single()
    return NextResponse.json({ upvotes: reply?.upvotes ?? 0 })
  } else {
    await supabase.from('community_upvotes')
      .insert({ username: userId, target_id: replyId, target_type: 'reply' })
    await supabase.rpc('increment_reply_upvotes', { p_reply_id: replyId })
    const { data: reply } = await supabase.from('community_replies').select('upvotes').eq('id', replyId).single()
    await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 1 })
    return NextResponse.json({ upvotes: reply?.upvotes ?? 0 })
  }
}
