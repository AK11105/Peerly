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

  const { amount } = await req.json()
  const { data, error } = await supabase.rpc('spend_lumens', { p_username: userId, p_amount: amount })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ balance: data })
}
