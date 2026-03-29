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

  const { data: reply } = await supabase
    .from('community_replies').select('upvotes').eq('id', replyId).single()
  if (!reply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 })

  if (existing) {
    await supabase.from('community_upvotes')
      .delete().eq('username', userId).eq('target_id', replyId).eq('target_type', 'reply')
    const upvotes = Math.max(0, reply.upvotes - 1)
    await supabase.from('community_replies').update({ upvotes }).eq('id', replyId)
    return NextResponse.json({ upvotes })
  } else {
    await supabase.from('community_upvotes')
      .insert({ username: userId, target_id: replyId, target_type: 'reply' })
    const upvotes = reply.upvotes + 1
    await supabase.from('community_replies').update({ upvotes }).eq('id', replyId)
    await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 1 })
    return NextResponse.json({ upvotes })
  }
}
