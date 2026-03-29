import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'

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

  if (event.type === 'user.deleted') {
    const userId = event.data.id
    // Cascade deletes handle related rows via FK ON DELETE CASCADE
    await supabase.from('users').delete().eq('username', userId)
  }

  return NextResponse.json({ received: true })
}
