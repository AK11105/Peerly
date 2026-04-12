'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { WeaveNode } from '@/lib/types'

interface VoteStats {
  node_id: string
  status: string
  accept_count: number
  reject_count: number
  total_votes: number
}

export function VotingPool() {
  const [pendingNodes, setPendingNodes] = useState<WeaveNode[]>([])
  const [voteStats, setVoteStats] = useState<Record<string, VoteStats>>({})
  const [loading, setLoading] = useState(true)
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})
  const currentUser = useCurrentUser()

  useEffect(() => {
    fetchPendingNodes()
    const subscription = supabase
      .channel('voting-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes' }, () => {
        fetchPendingNodes()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchPendingNodes = async () => {
    try {
      const { data: nodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('status', 'PENDING_VOTE')
        .order('created_at', { ascending: false })

      if (nodes) {
        setPendingNodes(nodes)
        // Fetch vote stats for each node
        for (const node of nodes) {
          fetchVoteStats(node.id)
          fetchUserVote(node.id)
        }
      }
    } catch (e) {
      console.error('[voting-pool] fetch failed:', e)
      toast.error('Failed to load voting pool')
    } finally {
      setLoading(false)
    }
  }

  const fetchVoteStats = async (nodeId: string) => {
    try {
      const res = await fetch(`/api/nodes/${nodeId}/vote`)
      const data = await res.json()
      setVoteStats((prev) => ({ ...prev, [nodeId]: data }))
    } catch (e) {
      console.error('[voting-pool] stats fetch failed:', e)
    }
  }

  const fetchUserVote = async (nodeId: string) => {
    if (!currentUser) return
    try {
      const { data: vote } = await supabase
        .from('node_votes')
        .select('vote')
        .eq('node_id', nodeId)
        .eq('username', currentUser.id)
        .maybeSingle()

      if (vote) {
        setUserVotes((prev) => ({ ...prev, [nodeId]: vote.vote }))
      }
    } catch (e) {
      console.error('[voting-pool] user vote fetch failed:', e)
    }
  }

  const handleVote = async (nodeId: string, voteType: 'accept' | 'reject') => {
    if (!currentUser) {
      toast.error('Please sign in to vote')
      return
    }

    try {
      const res = await fetch(`/api/nodes/${nodeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: voteType }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Vote failed')
        return
      }

      const data = await res.json()
      toast.success(`Vote recorded! (${data.vote_stats?.totalVotes} votes so far)`)
      setUserVotes((prev) => ({ ...prev, [nodeId]: voteType }))
      fetchVoteStats(nodeId)

      if (data.node_status === 'approved' || data.node_status === 'rejected') {
        toast.success(data.message)
        fetchPendingNodes()
      }
    } catch (e) {
      console.error('[voting-pool] vote failed:', e)
      toast.error('Failed to submit vote')
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading voting pool...</div>
  }

  if (pendingNodes.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No nodes pending community votes</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Community Voting Pool</h2>
      <div className="grid gap-4">
        {pendingNodes.map((node) => {
          const stats = voteStats[node.id]
          const userVote = userVotes[node.id]
          const progressPercent = stats && stats.total_votes > 0 ? (stats.accept_count / stats.total_votes) * 100 : 0

          return (
            <div
              key={node.id}
              className="rounded-lg border border-border bg-card p-5 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-foreground">{node.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{node.description}</p>
              </div>

              {stats && (
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {stats.total_votes}/10
                    </span>
                  </div>

                  {/* Vote counts */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-green-500">✓ {stats.accept_count} accept</span>
                    <span className="text-red-500">✗ {stats.reject_count} reject</span>
                  </div>
                </div>
              )}

              {/* Voting buttons */}
              <div className="flex gap-2">
                <Button
                  variant={userVote === 'accept' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVote(node.id, 'accept')}
                  className="flex-1"
                >
                  {userVote === 'accept' ? '✓ Voted Accept' : 'Accept'}
                </Button>
                <Button
                  variant={userVote === 'reject' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleVote(node.id, 'reject')}
                  className="flex-1"
                >
                  {userVote === 'reject' ? '✗ Voted Reject' : 'Reject'}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Submitted by {node.contributed_by || 'anonymous'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}