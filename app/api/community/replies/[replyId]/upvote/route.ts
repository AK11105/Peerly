import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ replyId: string }> }) {
  const { replyId } = await params
  const { username } = await req.json()
  const { data, error } = await supabase.rpc('toggle_reply_upvote', {
    p_username: username,
    p_reply_id: replyId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ upvotes: data })
}
