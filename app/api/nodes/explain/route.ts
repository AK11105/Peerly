import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, topic, depth = 0, difficulty = 1, weaveId, nodeId } = await req.json()

  const level = ['foundational', 'core', 'intermediate', 'advanced', 'expert'][Math.min(depth, 4)]
  const diffLabel = ['', 'beginner', 'easy', 'intermediate', 'advanced', 'expert'][Math.min(difficulty, 5)]

  const prompt = `You are an expert teacher writing a deep-dive explanation for a learning platform.

Topic: ${topic}
Node: ${title}
Summary: ${description}
Level: ${level} (${diffLabel} difficulty)

Write a clear, engaging 400-600 word explanation of "${title}" for someone learning ${topic}.

## What it is
## Why it matters
## How it works
## Key takeaway

Plain English, concrete examples, no bullet lists in body, ## headers only.`

  try {
    const explainer = await callAI(prompt)

    if (weaveId && nodeId) {
      await supabase.from('nodes').update({ explainer } as any).eq('id', nodeId).eq('weave_id', weaveId)
    }

    return NextResponse.json({ explainer })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
