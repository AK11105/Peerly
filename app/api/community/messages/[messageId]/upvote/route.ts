import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params
  const { username } = await req.json()
  const { data, error } = await supabase.rpc('toggle_message_upvote', {
    p_username: username,
    p_message_id: messageId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ upvotes: data })
}
