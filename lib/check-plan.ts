import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Returns true if the user has an active pro plan. */
export async function isPro(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('plan')
    .eq('username', userId)
    .single()
  return data?.plan === 'pro'
}
