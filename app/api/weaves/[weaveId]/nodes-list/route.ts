import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ weaveId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weaveId } = await params

  const { data: adminRow } = await supabase
    .from('weave_admins').select('weave_id').eq('weave_id', weaveId).eq('username', userId).single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('nodes')
    .select('id,title,description,depth,difficulty,is_scaffold,contributed_by,status')
    .eq('weave_id', weaveId)
    .eq('status', 'approved')
    .order('depth', { ascending: true })
    .order('difficulty', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
