import { supabase } from './supabase'

export async function getMyWeaveIds(username: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_weaves')
    .select('weave_id')
    .eq('username', username)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r: any) => r.weave_id)
}

export async function addMyWeaveId(username: string, weaveId: string) {
  await supabase.rpc('ensure_user', { p_username: username })
  await supabase.from('user_weaves').upsert({ username, weave_id: weaveId })
}

export async function removeMyWeaveId(username: string, weaveId: string) {
  await supabase.from('user_weaves').delete().eq('username', username).eq('weave_id', weaveId)
}
