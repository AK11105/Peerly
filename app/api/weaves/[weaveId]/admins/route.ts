import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ weaveId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weaveId } = await params
  const { username } = await req.json()
  if (!username?.trim()) return NextResponse.json({ error: 'username is required' }, { status: 400 })

  // Only existing admins can add new admins
  const { data: adminRow } = await supabase
    .from('weave_admins').select('weave_id').eq('weave_id', weaveId).eq('username', userId).single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.rpc('ensure_user', { p_username: username.trim() })
  const { error } = await supabase
    .from('weave_admins').upsert({ weave_id: weaveId, username: username.trim() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
