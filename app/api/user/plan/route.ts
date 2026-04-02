import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('users').select('plan, has_paid').eq('username', userId).single()
  return NextResponse.json({ plan: data?.plan ?? 'free', has_paid: data?.has_paid ?? false })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  if (!['free', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({ plan })
    .eq('username', userId)

  if (error) console.error('[plan] supabase error:', error)
  return NextResponse.json({ plan })
}
