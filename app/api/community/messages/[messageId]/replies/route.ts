import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params
  const { username, text } = await req.json()
  await supabase.rpc('ensure_user', { p_username: username })

  const { data, error } = await supabase
    .from('community_replies')
    .insert({ message_id: messageId, username, text })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.rpc('earn_lumens', { p_username: username, p_amount: 2 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { id, username } = await req.json()
  // Verify ownership before deleting
  const { data: reply } = await supabase.from('community_replies').select('username').eq('id', id).single()
  if (!reply || reply.username !== username) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('community_replies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
