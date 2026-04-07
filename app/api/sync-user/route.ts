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

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('display_name, has_seen_tour')
    .eq('username', userId)
    .single()

  let displayName: string | null = existing?.display_name ?? null

  if (!displayName) {
    // Pull from Clerk
    try {
      const { createClerkClient } = await import('@clerk/nextjs/server')
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
      const clerkUser = await clerk.users.getUser(userId)
      displayName =
        clerkUser.username ??
        (clerkUser.firstName ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`.trim() : null) ??
        clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ??
        null
    } catch (e) {
      console.error('[sync-user] Failed to fetch from Clerk:', e)
    }
  }

  // Upsert user - new users get has_seen_tour = false, existing users keep their value
  await supabase.from('users').upsert(
    {
      username: userId,
      display_name: displayName,
      has_seen_tour: existing?.has_seen_tour ?? false
    },
    { onConflict: 'username' }
  )

  // Ensure lumens record exists
  await supabase
    .from('lumens')
    .upsert({ username: userId, balance: 0 }, { onConflict: 'username', ignoreDuplicates: true })

  return NextResponse.json({ success: true, has_seen_tour: existing?.has_seen_tour ?? false })
}
