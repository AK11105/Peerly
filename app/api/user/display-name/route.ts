import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { displayName } = await req.json()
  const trimmed = (displayName ?? '').trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
    return NextResponse.json({ error: 'Display name must be 2–30 characters' }, { status: 400 })
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('display_name', trimmed)
    .neq('username', userId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'That name is already taken' }, { status: 409 })

  await supabase
    .from('users')
    .update({ display_name: trimmed })
    .eq('username', userId)

  return NextResponse.json({ displayName: trimmed })
}
