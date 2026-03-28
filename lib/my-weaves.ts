import { supabase } from './supabase'

const DEMO_USER = 'demo_user'

export async function getMyWeaveIds(): Promise<string[]> {
  const { data } = await supabase
    .from('user_weaves')
    .select('weave_id')
    .eq('username', DEMO_USER)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r: any) => r.weave_id)
}

export async function addMyWeaveId(weaveId: string) {
  await supabase.rpc('ensure_user', { p_username: DEMO_USER })
  await supabase.from('user_weaves').upsert({ username: DEMO_USER, weave_id: weaveId })
}

export async function removeMyWeaveId(weaveId: string) {
  await supabase.from('user_weaves').delete().eq('username', DEMO_USER).eq('weave_id', weaveId)
}
