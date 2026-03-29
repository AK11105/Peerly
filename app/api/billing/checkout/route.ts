import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createCheckoutUrl } from '@/lib/billing'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('username', userId)
    .single()

  if (user?.plan === 'pro') {
    return NextResponse.json({ error: 'Already on Pro' }, { status: 400 })
  }

  try {
    const url = await createCheckoutUrl(userId)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Payment provider not configured yet' }, { status: 503 })
  }
}
