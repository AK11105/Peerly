import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REWARDS: Record<string, { partner: string; cost: number }> = {
  'coursera-1':  { partner: 'COURSERA',  cost: 500  },
  'datacamp-1':  { partner: 'DATACAMP',  cost: 750  },
  'aws-1':       { partner: 'AWS',       cost: 1000 },
  'notion-1':    { partner: 'NOTION',    cost: 400  },
  'github-1':    { partner: 'GITHUB',    cost: 1200 },
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rewardId } = await req.json()
  const reward = REWARDS[rewardId]
  if (!reward) return NextResponse.json({ error: 'Invalid reward' }, { status: 400 })

  // Atomically spend lumens
  const { error } = await supabase.rpc('spend_lumens', { p_username: userId, p_amount: reward.cost })
  if (error) return NextResponse.json({ error: 'insufficient_lumens' }, { status: 400 })

  // Generate code server-side
  const code = `PEERLY-${reward.partner}-${randomBytes(3).toString('hex').toUpperCase()}`
  return NextResponse.json({ code })
}
