'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchAllWeaves } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'
import type { Weave, WeaveNode } from '@/lib/types'

export default function AdminPanel() {
  const { user } = useUser()
  const username = user?.id
  const [activeTab, setActiveTab] = useState('weaves')
  const [myWeaves, setMyWeaves] = useState<Weave[]>([])
  const [selectedWeave, setSelectedWeave] = useState<Weave | null>(null)
  const [loadingWeaves, setLoadingWeaves] = useState(true)
  const [pendingNodes, setPendingNodes] = useState<WeaveNode[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  useEffect(() => {
    if (!username) return
    ;(async () => {
      try {
        const { data: adminRows } = await supabase
          .from('weave_admins')
          .select('weave_id')
          .eq('username', username)
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
  }, [username])

  useEffect(() => {
    if (!selectedWeave) return
    // Always fetch pending count so badge is accurate regardless of active tab
    fetch(`/api/weaves/${selectedWeave.id}/pending-nodes`)
      .then((r) => r.json())
      .then((data) => setPendingNodes(Array.isArray(data) ? data : []))
      .catch(() => setPendingNodes([]))
  }, [selectedWeave])

  useEffect(() => {
    if (!selectedWeave || activeTab !== 'pending') return
    setLoadingPending(true)
    fetch(`/api/weaves/${selectedWeave.id}/pending-nodes`)
      .then((r) => r.json())
      .then((data) => setPendingNodes(Array.isArray(data) ? data : []))
      .catch(() => setPendingNodes([]))
      .finally(() => setLoadingPending(false))
  }, [selectedWeave, activeTab])

  async function reviewNode(nodeId: string, action: 'approve' | 'reject') {
    if (!selectedWeave) return
    await fetch(`/api/weaves/${selectedWeave.id}/pending-nodes/${nodeId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setPendingNodes((prev) => prev.filter((n) => n.id !== nodeId))
  }

  async function deleteWeave(weaveId: string) {
    if (!confirm('Delete this weave permanently? This cannot be undone.')) return
    await fetch(`/api/weaves/${weaveId}`, { method: 'DELETE' })
    const updated = myWeaves.filter((w) => w.id !== weaveId)
    setMyWeaves(updated)
    setSelectedWeave(updated[0] ?? null)
  }

  const weave = selectedWeave
  const totalNodes = weave?.nodes.length ?? 0
  const scaffoldCount = weave?.nodes.filter((n) => n.is_scaffold).length ?? 0
  const communityCount = totalNodes - scaffoldCount

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="min-h-screen">
      <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-background/50 md:sticky md:top-14 md:h-[calc(100vh-56px)] overflow-y-auto p-4 md:p-6">
            <h3 className="font-bold text-foreground mb-6">Admin Panel</h3>

            <nav className="flex md:flex-col gap-1 mb-4 md:mb-8 overflow-x-auto pb-2 md:pb-0">
              {[
                { id: 'weaves', label: 'My Weaves' },
                { id: 'pending', label: 'Pending Nodes', badge: pendingNodes.length > 0 ? pendingNodes.length : null },
                { id: 'proposals', label: 'Proposals' },
                { id: 'voting', label: 'Voting' },
                { id: 'history', label: 'Version History' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={` shrink-0 w-full text-left px-3 py-2 rounded text-sm transition-all flex items-center justify-between ${
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-l-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {item.badge ? <span className="ml-2 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">{item.badge}</span> : null}
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
                    <Button size="sm" variant="outline" className="shrink-0 w-full mt-2 border-border text-xs">Open Weave</Button>
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
                    <Link href="/create"><Button className="shrink-0 bg-primary hover:bg-primary/90">Create a Weave</Button></Link>
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
                          <div className="flex gap-2">
                            <Link href={`/weave/${w.id}`} onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" className="shrink-0 border-border text-xs">Open Weave →</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
                              onClick={(e) => { e.stopPropagation(); deleteWeave(w.id) }}
                            >
                              Delete
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pending Nodes Tab */}
            {activeTab === 'pending' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-8">Pending Nodes</h2>
                {!selectedWeave ? (
                  <p className="text-muted-foreground text-sm">Select a weave first.</p>
                ) : loadingPending ? (
                  <div className="space-y-3 max-w-3xl">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
                  </div>
                ) : pendingNodes.length === 0 ? (
                  <Card className="p-8 bg-card border-border text-center max-w-3xl">
                    <p className="text-muted-foreground">No pending submissions.</p>
                  </Card>
                ) : (
                  <div className="space-y-4 max-w-3xl">
                    {pendingNodes.map((node) => (
                      <Card key={node.id} className="p-5 bg-card border-border" style={node.flag ? { borderLeft: '3px solid #EF4444' } : {}}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">{node.title}</p>
                              {node.flag && (
                                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                  ! {node.flag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span>depth {node.depth}</span>
                              <span>difficulty {node.difficulty}</span>
                              <span>by {node.submitted_by ?? 'anonymous'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" className="shrink-0 bg-primary hover:bg-primary/90 text-xs" onClick={() => reviewNode(node.id, 'approve')}>Approve</Button>
                            <Button size="sm" variant="outline" className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 text-xs" onClick={() => reviewNode(node.id, 'reject')}>Reject</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Proposals Tab */}
            {activeTab === 'proposals' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Open Proposals</h2>
                <Card className="p-12 bg-card border-border text-center max-w-3xl">
                  <p className="text-lg font-semibold text-foreground mb-2">Coming Soon</p>
                  <p className="text-sm text-muted-foreground">Community edit proposals will appear here for admin review.</p>
                </Card>
              </div>
            )}

            {/* Voting Tab */}
            {activeTab === 'voting' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Active Votes</h2>
                <Card className="p-12 bg-card border-border text-center max-w-3xl">
                  <p className="text-lg font-semibold text-foreground mb-2">Coming Soon</p>
                  <p className="text-sm text-muted-foreground">Community voting on approved proposals will be available here.</p>
                </Card>
              </div>
            )}

            {/* Version History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Version History</h2>
                <Card className="p-12 bg-card border-border text-center max-w-3xl">
                  <p className="text-lg font-semibold text-foreground mb-2">Coming Soon</p>
                  <p className="text-sm text-muted-foreground">A full changelog of weave edits and restorable snapshots will appear here.</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
