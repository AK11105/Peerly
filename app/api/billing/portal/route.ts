import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createPortalUrl } from '@/lib/billing'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = await createPortalUrl(userId)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Payment provider not configured yet' }, { status: 503 })
  }
}
