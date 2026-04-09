import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('users')
    .update({ has_seen_tour: false })
    .eq('username', userId)

  if (error) {
    console.error('[tour-reset] error:', error)
    return NextResponse.json({ error: 'Failed to reset tour' }, { status: 500 })
  }

  return NextResponse.json({ success: true, has_seen_tour: false })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('has_seen_tour')
    .eq('username', userId)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tour status' }, { status: 500 })
  }

  return NextResponse.json({ has_seen_tour: data?.has_seen_tour })
}
