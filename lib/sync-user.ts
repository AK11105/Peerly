import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Upserts a Clerk user into Supabase, seeding display_name from Clerk if not already set. */
export async function syncUser(userId: string): Promise<void> {
  // Check if user already has a display_name set
  const { data: existing } = await supabase
    .from('users')
    .select('display_name')
    .eq('username', userId)
    .single()

  let displayName: string | null = existing?.display_name ?? null

  // If no display_name yet, pull from Clerk
  if (!displayName) {
    try {
      const clerk = await clerkClient()
      const clerkUser = await clerk.users.getUser(userId)
      displayName =
        clerkUser.username ??
        (clerkUser.firstName ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`.trim() : null) ??
        clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ??
        null
    } catch {}
  }

  await supabase
    .from('users')
    .upsert({ username: userId, display_name: displayName }, { onConflict: 'username' })
  await supabase
    .from('lumens')
    .upsert({ username: userId, balance: 0 }, { onConflict: 'username', ignoreDuplicates: true })
}
