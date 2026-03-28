'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchAllWeaves } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Weave } from '@/lib/types'

const PROPOSALS = [
  {
    id: 1, proposer: 'alex_learns', timestamp: '2 hours ago',
    change: {
      old: 'Neural Networks are computational models inspired by biological neurons.',
      new: 'Neural Networks are computational models inspired by biological neurons. They consist of interconnected layers of nodes.',
    },
    status: 'pending' as const,
  },
  {
    id: 2, proposer: 'math_wizard', timestamp: '5 hours ago',
    change: {
      old: 'Linear Algebra: The study of vectors and matrices.',
      new: 'Linear Algebra: The mathematical study of vectors, matrices, and linear transformations.',
    },
    status: 'pending' as const,
  },
  {
    id: 3, proposer: 'physics_fan', timestamp: '1 day ago',
    change: {
      old: 'Quantum mechanics deals with atoms.',
      new: 'Quantum mechanics is the branch of physics that describes phenomena at atomic and subatomic scales.',
    },
    status: 'approved' as const,
  },
]

const ACTIVE_VOTES = [
  { id: 1, proposal: 'Update Machine Learning definition', yesVotes: 24, noVotes: 6, minRequired: 30, userVoted: true, userChoice: 'yes' as const },
  { id: 2, proposal: 'Add new Calculus section', yesVotes: 18, noVotes: 4, minRequired: 30, userVoted: false, userChoice: null as null },
]

const VERSION_HISTORY = [
  { version: 5, date: 'Today 2:30 PM', summary: 'Updated definitions and examples', current: true },
  { version: 4, date: 'Yesterday 10:15 AM', summary: 'Added new scaffold nodes', current: false },
  { version: 3, date: '2 days ago', summary: 'Approved community contributions', current: false },
  { version: 2, date: '3 days ago', summary: 'Initial structure refinement', current: false },
  { version: 1, date: '1 week ago', summary: 'Weave created', current: false },
]

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('weaves')
  const [proposals, setProposals] = useState(PROPOSALS)
  const [votes, setVotes] = useState(ACTIVE_VOTES)
  const [myWeaves, setMyWeaves] = useState<Weave[]>([])
  const [selectedWeave, setSelectedWeave] = useState<Weave | null>(null)
  const [loadingWeaves, setLoadingWeaves] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        // Query weave_admins directly for the current user
        const { data: adminRows } = await supabase
          .from('weave_admins')
          .select('weave_id')
          .eq('username', 'demo_user')
        const adminIds = (adminRows ?? []).map((r: any) => r.weave_id)
        if (adminIds.length > 0) {
          const all = await fetchAllWeaves()
          const mine = all.filter((w) => adminIds.includes(w.id))
          setMyWeaves(mine)
          if (mine.length > 0) setSelectedWeave(mine[0])
        }
      } catch {}
      setLoadingWeaves(false)
    })()
  }, [])

  const handleApprove = (id: number) => {
    setProposals(proposals.map((p) => p.id === id ? { ...p, status: 'approved' as const } : p))
    toast.success('Proposal approved! Moving to vote...')
  }

  const handleVote = (id: number, choice: 'yes' | 'no') => {
    setVotes(votes.map((v) => v.id === id ? { ...v, userVoted: true, userChoice: choice, yesVotes: choice === 'yes' ? v.yesVotes + 1 : v.yesVotes, noVotes: choice === 'no' ? v.noVotes + 1 : v.noVotes } : v))
    toast.success(`Vote recorded: ${choice.toUpperCase()}`)
  }

  const weave = selectedWeave
  const totalNodes = weave?.nodes.length ?? 0
  const scaffoldCount = weave?.nodes.filter((n) => n.is_scaffold).length ?? 0
  const communityCount = totalNodes - scaffoldCount

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="min-h-screen">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 border-r border-border bg-background/50 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto p-6">
            <h3 className="font-bold text-foreground mb-6">Admin Panel</h3>

            <nav className="space-y-1 mb-8">
              {[
                { id: 'weaves', label: 'My Weaves' },
                { id: 'proposals', label: 'Proposals' },
                { id: 'voting', label: 'Voting' },
                { id: 'history', label: 'Version History' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-l-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Live Weave Info */}
            <Card className="p-4 bg-card border-border">
              <h4 className="font-bold text-foreground text-sm mb-3">Weave Info</h4>
              {loadingWeaves ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}
                </div>
              ) : weave ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Topic</p>
                    <p className="text-foreground font-medium truncate">{weave.topic}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Nodes</p>
                    <p className="text-foreground font-medium">{totalNodes}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scaffolds</p>
                    <p className="text-foreground font-medium">{scaffoldCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Community</p>
                    <p className="text-foreground font-medium">{communityCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your Role</p>
                    <Badge className="bg-primary/20 text-primary text-xs mt-1">Admin</Badge>
                  </div>
                  <Link href={`/weave/${weave.id}`}>
                    <Button size="sm" variant="outline" className="w-full mt-2 border-border text-xs">Open Weave</Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No weaves found</p>
              )}
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 px-8 py-12">

            {/* My Weaves Tab */}
            {activeTab === 'weaves' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-8">Manage Weaves</h2>
                {loadingWeaves ? (
                  <div className="space-y-3 max-w-3xl">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
                  </div>
                ) : myWeaves.length === 0 ? (
                  <Card className="p-8 bg-card border-border text-center">
                    <p className="text-muted-foreground mb-4">No weaves to admin yet.</p>
                    <Link href="/create"><Button className="bg-primary hover:bg-primary/90">Create a Weave</Button></Link>
                  </Card>
                ) : (
                  <div className="space-y-4 max-w-3xl">
                    {myWeaves.map((w) => {
                      const total = w.nodes.length
                      const scaffolds = w.nodes.filter((n) => n.is_scaffold).length
                      const community = total - scaffolds
                      const pct = total > 0 ? Math.round((community / total) * 100) : 0
                      const isSelected = selectedWeave?.id === w.id
                      return (
                        <Card
                          key={w.id}
                          onClick={() => setSelectedWeave(w)}
                          className={`p-5 bg-card cursor-pointer transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-foreground">{w.topic}</h3>
                            {isSelected && <Badge className="bg-primary/20 text-primary text-xs">Selected</Badge>}
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                            <span>{total} nodes</span>
                            <span>{scaffolds} scaffolds</span>
                            <span>{community} community</span>
                          </div>
                          <div className="h-1.5 bg-background rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <Link href={`/weave/${w.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="border-border text-xs">Open Weave →</Button>
                          </Link>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Proposals Tab */}
            {activeTab === 'proposals' && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-foreground">
                    Open Proposals{' '}
                    <Badge className="ml-2 bg-primary/20 text-primary">
                      {proposals.filter((p) => p.status === 'pending').length}
                    </Badge>
                  </h2>
                </div>
                <div className="space-y-4 max-w-3xl">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id} className={`p-6 bg-card border transition-all ${proposal.status === 'approved' ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                      {proposal.status === 'approved' && (
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="text-xs text-primary font-medium">Approved — put to vote</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground text-xs font-bold">
                          {proposal.proposer[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{proposal.proposer}</p>
                          <p className="text-xs text-muted-foreground">{proposal.timestamp}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground font-medium mb-2">Proposed change:</p>
                        <div className="space-y-2 rounded bg-background p-3 text-sm">
                          <p className="text-destructive line-through">{proposal.change.old}</p>
                          <p className="text-primary">{proposal.change.new}</p>
                        </div>
                      </div>
                      {proposal.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprove(proposal.id)} className="flex-1 bg-primary hover:bg-primary/90">Approve</Button>
                          <Button variant="outline" className="flex-1 border-border">Request Changes</Button>
                        </div>
                      ) : (
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-1/3" />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Voting Tab */}
            {activeTab === 'voting' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-8">Active Votes</h2>
                <div className="space-y-4 max-w-3xl">
                  {votes.map((vote) => {
                    const totalVotes = vote.yesVotes + vote.noVotes
                    const yesPercentage = (vote.yesVotes / totalVotes) * 100
                    const readyToMerge = vote.yesVotes >= 15 && totalVotes >= vote.minRequired
                    return (
                      <Card key={vote.id} className="p-6 bg-card border-border">
                        <h3 className="font-bold text-foreground mb-4">{vote.proposal}</h3>
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{vote.yesVotes} / {vote.minRequired} minimum</span>
                            <span className="text-sm font-semibold text-primary">{yesPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${yesPercentage}%` }} />
                          </div>
                        </div>
                        {readyToMerge && (
                          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-sm text-primary font-medium">Ready to merge</p>
                          </div>
                        )}
                        {vote.userVoted ? (
                          <div className="flex gap-2">
                            <Button disabled variant="outline" className={`flex-1 border-border ${vote.userChoice === 'yes' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                              Yes {vote.userChoice === 'yes' && '✓'}
                            </Button>
                            <Button disabled variant="outline" className={`flex-1 border-border ${vote.userChoice === 'no' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`}>
                              No {vote.userChoice === 'no' && '✓'}
                            </Button>
                            {readyToMerge && <Button className="flex-1 bg-primary hover:bg-primary/90">Merge</Button>}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={() => handleVote(vote.id, 'yes')} className="flex-1 bg-primary hover:bg-primary/90">Vote Yes</Button>
                            <Button onClick={() => handleVote(vote.id, 'no')} variant="outline" className="flex-1 border-border">Vote No</Button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Version History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-8">Version History</h2>
                <div className="space-y-3 max-w-2xl">
                  {VERSION_HISTORY.map((version, i) => (
                    <Card key={version.version} className={`p-4 bg-card border transition-all ${version.current ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {i === 0 && <Clock className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-bold text-foreground">v{version.version}</span>
                            {version.current && <Badge className="bg-primary/20 text-primary text-xs">Current</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{version.date}</p>
                          <p className="text-sm text-foreground">{version.summary}</p>
                        </div>
                        {!version.current && (
                          <Button variant="outline" size="sm" className="border-border ml-4 shrink-0">Restore</Button>
                        )}
                      </div>
                      {i < VERSION_HISTORY.length - 1 && <div className="ml-2 mt-3 h-6 border-l border-dashed border-border" />}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
