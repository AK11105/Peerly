import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Payment provider webhook endpoint.
 *
 * TODO: when you pick a provider, implement:
 *   1. Verify the webhook signature using the provider's SDK/secret
 *   2. Parse the event type (subscription activated / cancelled / payment failed)
 *   3. Update the user's `plan` column in Supabase accordingly
 *
 * The DB columns you'll need on the `users` table:
 *   - plan: 'free' | 'pro'
 *   - billing_customer_id: string   (provider's customer ID)
 *   - billing_subscription_id: string | null
 */
export async function POST(_req: Request) {
  // TODO: implement webhook verification and event handling
  return NextResponse.json({ received: true })
}

// Exported for use in webhook handlers once implemented
export { supabase }
