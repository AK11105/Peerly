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
  const { data } = await supabase.from('users').select('plan').eq('username', userId).single()
  return NextResponse.json({ plan: data?.plan ?? 'free' })
}

/** POST — update plan. In production this should only be called by the billing webhook. */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  if (!['free', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  await supabase
    .from('users')
    .update({ plan, billing_subscription_id: plan === 'free' ? null : undefined })
    .eq('username', userId)

  return NextResponse.json({ plan })
}
