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

  const { data: msg } = await supabase
    .from('community_messages').select('upvotes').eq('id', messageId).single()
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  if (existing) {
    await supabase.from('community_upvotes')
      .delete().eq('username', userId).eq('target_id', messageId).eq('target_type', 'message')
    const upvotes = Math.max(0, msg.upvotes - 1)
    await supabase.from('community_messages').update({ upvotes }).eq('id', messageId)
    return NextResponse.json({ upvotes })
  } else {
    await supabase.from('community_upvotes')
      .insert({ username: userId, target_id: messageId, target_type: 'message' })
    const upvotes = msg.upvotes + 1
    await supabase.from('community_messages').update({ upvotes }).eq('id', messageId)
    const { data: earnData, error: earnErr } = await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 1 })
    if (earnErr) console.error('[earn_lumens upvote FAILED]', earnErr.message, { userId })
    else console.log('[earn_lumens upvote OK]', { userId, newBalance: earnData })
    return NextResponse.json({ upvotes })
  }
}
