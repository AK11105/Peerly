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

  const { messageId } = await params
  const { text } = await req.json()
  await syncUser(userId)

  const { data, error } = await supabase
    .from('community_replies')
    .insert({ message_id: messageId, username: userId, text })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.rpc('earn_lumens', { p_username: userId, p_amount: 2 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { data: reply } = await supabase.from('community_replies').select('username').eq('id', id).single()
  if (!reply || reply.username !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('community_replies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
