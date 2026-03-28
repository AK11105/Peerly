import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request, { params }: { params: Promise<{ weaveId: string }> }) {
  const { weaveId } = await params
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel')

  let query = supabase
    .from('community_messages')
    .select('*, community_replies(*)')
    .eq('weave_id', weaveId)
    .order('created_at', { ascending: true })

  if (channel) query = query.eq('channel', channel)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: Promise<{ weaveId: string }> }) {
  const { weaveId } = await params
  const body = await req.json()
  const { channel, username, text, is_question = false } = body

  await supabase.rpc('ensure_user', { p_username: username })

  const { data, error } = await supabase
    .from('community_messages')
    .insert({ weave_id: weaveId, channel, username, text, is_question })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.rpc('earn_lumens', { p_username: username, p_amount: is_question ? 5 : 2 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { id, username } = await req.json()
  // Verify ownership before deleting
  const { data: msg } = await supabase.from('community_messages').select('username').eq('id', id).single()
  if (!msg || msg.username !== username) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('community_messages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
