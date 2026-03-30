import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'
import type { BillingSubscriptionItemWebhookEvent } from '@clerk/backend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })

  const payload = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let event: any
  try {
    event = new Webhook(secret).verify(payload, headers)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event

  // subscriptionItem.active → user upgraded to a paid plan
  if (type === 'subscriptionItem.active') {
    const userId = data.payer_id ?? data.subscription?.payer_id
    if (userId) {
      await supabase
        .from('users')
        .update({ plan: 'pro', stripe_subscription_id: data.id })
        .eq('username', userId)
    }
  }

  // subscriptionItem.canceled / ended → user downgraded / cancelled
  if (type === 'subscriptionItem.canceled' || type === 'subscriptionItem.ended') {
    const userId = data.payer_id ?? data.subscription?.payer_id
    if (userId) {
      await supabase
        .from('users')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('username', userId)
    }
  }

  // user.deleted — cascade handled by FK, but clean up explicitly
  if (type === 'user.deleted') {
    await supabase.from('users').delete().eq('username', data.id)
  }

  return NextResponse.json({ received: true })
}
