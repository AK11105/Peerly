import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VOTE_THRESHOLD = 10 // Approve/reject if 10 votes received
const ACCEPT_THRESHOLD = 0.6 // 60% need to accept for approval

export async function POST(
  req: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeId } = await params
  const body = await req.json()
  const vote = body.vote // 'accept' or 'reject'

  if (!vote || !['accept', 'reject'].includes(vote)) {
    return NextResponse.json({ error: 'vote must be "accept" or "reject"' }, { status: 400 })
  }

  // Get node details
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('id, status, submitted_by')
    .eq('id', nodeId)
    .single()

  if (nodeError || !node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  // Only allow voting on PENDING_VOTE nodes
  if (node.status !== 'PENDING_VOTE') {
    return NextResponse.json({ error: 'Node is not in voting phase' }, { status: 422 })
  }

  // Prevent users from voting on their own submissions
  if (node.submitted_by === userId) {
    return NextResponse.json({ error: 'Cannot vote on your own submissions' }, { status: 422 })
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from('node_votes')
    .select('id, vote')
    .eq('node_id', nodeId)
    .eq('username', userId)
    .maybeSingle()

  if (existingVote) {
    // User already voted — toggle or update their vote
    if (existingVote.vote === vote) {
      // Same vote again: remove it (toggle off)
      await supabase.from('node_votes').delete().eq('id', existingVote.id)
    } else {
      // Different vote: update it
      await supabase
        .from('node_votes')
        .update({ vote })
        .eq('id', existingVote.id)
    }
  } else {
    // New vote: insert it
    const { error: insertErr } = await supabase.from('node_votes').insert({
      node_id: nodeId,
      username: userId,
      vote,
    })
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
  }

  // Check vote counts and threshold
  const { data: votes } = await supabase
    .from('node_votes')
    .select('vote')
    .eq('node_id', nodeId)

  if (!votes) {
    return NextResponse.json({ status: 'voted', node_status: 'PENDING_VOTE' })
  }

  const acceptCount = votes.filter((v: any) => v.vote === 'accept').length
  const rejectCount = votes.filter((v: any) => v.vote === 'reject').length
  const totalVotes = votes.length

  let newStatus: string | null = null

  // Check if threshold reached
  if (totalVotes >= VOTE_THRESHOLD) {
    if (acceptCount >= Math.ceil(VOTE_THRESHOLD * ACCEPT_THRESHOLD)) {
      newStatus = 'approved'
    } else if (rejectCount >= Math.ceil(VOTE_THRESHOLD * (1 - ACCEPT_THRESHOLD))) {
      newStatus = 'rejected'
    }
  }

  // If threshold reached, update node status
  if (newStatus) {
    const { error: updateErr } = await supabase
      .from('nodes')
      .update({ status: newStatus })
      .eq('id', nodeId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Notify submitter if approved
    if (newStatus === 'approved') {
      try {
        await supabase.from('notifications').insert({
          username: node.submitted_by,
          type: 'node_approved_by_community',
          node_id: nodeId,
          created_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error('[notification] failed:', e)
      }
    }

    return NextResponse.json({
      status: 'voted',
      node_status: newStatus,
      vote_stats: { acceptCount, rejectCount, totalVotes },
      message: `Node ${newStatus} by community vote!`,
    })
  }

  return NextResponse.json({
    status: 'voted',
    node_status: 'PENDING_VOTE',
    vote_stats: { acceptCount, rejectCount, totalVotes },
  })
}

// GET endpoint to fetch vote stats for a node
export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params

  const { data: node } = await supabase
    .from('nodes')
    .select('status')
    .eq('id', nodeId)
    .single()

  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  const { data: votes } = await supabase
    .from('node_votes')
    .select('vote')
    .eq('node_id', nodeId)

  const acceptCount = votes?.filter((v: any) => v.vote === 'accept').length || 0
  const rejectCount = votes?.filter((v: any) => v.vote === 'reject').length || 0
  const totalVotes = votes?.length || 0

  return NextResponse.json({
    node_id: nodeId,
    status: node.status,
    accept_count: acceptCount,
    reject_count: rejectCount,
    total_votes: totalVotes,
  })
}