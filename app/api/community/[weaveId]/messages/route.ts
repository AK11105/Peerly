import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncUser } from '@/lib/sync-user'

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
    .select('*, users(display_name), community_replies(*, users(display_name))')
    .eq('weave_id', weaveId)
    .order('created_at', { ascending: true })

  if (channel) query = query.eq('channel', channel)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((m: any) => ({
    ...m,
    display_name: m.users?.display_name ?? null,
    community_replies: (m.community_replies ?? []).map((r: any) => ({
      ...r,
      display_name: r.users?.display_name ?? null,
    })),
  }))

  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: { params: Promise<{ weaveId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weaveId } = await params
  const body = await req.json()
  const { channel, text, is_question = false, attachments } = body

  // Sync user into Supabase with display_name from Clerk
  await syncUser(userId)

  const { data, error } = await supabase
    .from('community_messages')
    .insert({ weave_id: weaveId, channel, username: userId, text, is_question, attachments: attachments ?? null })
    .select()
    .single()

  if (error) {
    console.error('[community POST]', error.message, { userId, weaveId, channel })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const { data: earnData, error: earnErr } = await supabase.rpc('earn_lumens', { p_username: userId, p_amount: is_question ? 5 : 2 })
  if (earnErr) console.error('[earn_lumens FAILED]', earnErr.message, { userId })
  else console.log('[earn_lumens OK]', { userId, newBalance: earnData })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { data: msg } = await supabase.from('community_messages').select('username').eq('id', id).single()
  if (!msg || msg.username !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('community_messages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
