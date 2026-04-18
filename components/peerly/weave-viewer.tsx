'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { List, Network, Share2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { CommunityProgressBar } from './community-progress-bar'
import { NodeCard } from './node-card'
import { NodeDetailDrawer } from './node-detail-drawer'
import { ContributeModal } from './contribute-modal'
import { AddPerspectiveModal } from './add-perspective-modal'
import { ExportModal } from './export-modal'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'
import type { Weave, WeaveNode } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/constants'

const MindMapView = dynamic(
  () => import('./mind-map-view').then((m) => m.MindMapView),
  { ssr: false, loading: () => <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">Loading mind map…</div> }
)

interface WeaveViewerProps {
  weave: Weave
  onUnlock: (node: WeaveNode) => void
  onRefresh: () => void
}

export function WeaveViewer({ weave, onUnlock, onRefresh }: WeaveViewerProps) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedNode, setSelectedNode] = useState<WeaveNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scaffoldNode, setScaffoldNode] = useState<WeaveNode | null>(null)
  const [scaffoldModalOpen, setScaffoldModalOpen] = useState(false)
  const [communityNode, setCommunityNode] = useState<WeaveNode | null>(null)
  const [perspectiveModalOpen, setPerspectiveModalOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const { user } = useUser()
  const [votingNodes, setVotingNodes] = useState<WeaveNode[]>([])
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('nodes').select('*').eq('weave_id', weave.id).eq('status', 'PENDING_VOTE')
      .then(({ data }) => setVotingNodes(data ?? []))
  }, [weave.id])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('node_votes').select('node_id, vote').eq('username', user.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const v of data ?? []) map[v.node_id] = v.vote
        setUserVotes(map)
      })
  }, [user?.id])

  async function castVote(nodeId: string, vote: 'accept' | 'reject') {
    const res = await fetch(`/api/nodes/${nodeId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Vote failed'); return }
    setUserVotes(prev => ({ ...prev, [nodeId]: prev[nodeId] === vote ? '' : vote }))
    if (data.node_status === 'approved' || data.node_status === 'rejected') {
      setVotingNodes(prev => prev.filter(n => n.id !== nodeId))
      toast.success(`Node ${data.node_status} by community vote!`)
    }
  }

  const handleViewDetail = (node: WeaveNode) => { setSelectedNode(node); setDrawerOpen(true) }
  const handleUnlock = (node: WeaveNode) => { setScaffoldNode(node); setScaffoldModalOpen(true) }
  const handleCommunityContribute = (node: WeaveNode) => { setCommunityNode(node); setPerspectiveModalOpen(true) }

  const nodesByDepth = useMemo(() => {
    const groups: Record<number, WeaveNode[]> = {}
    for (const node of (weave.nodes ?? [])) {
      if (!groups[node.depth]) groups[node.depth] = []
      groups[node.depth].push(node)
    }
    return groups
  }, [weave.nodes])

  const depths = useMemo(
    () => Object.keys(nodesByDepth).map(Number).sort((a, b) => a - b),
    [nodesByDepth]
  )

  return (
    <main className="min-w-0 flex-1">
      <CommunityProgressBar nodes={weave.nodes} />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-balance text-xl font-semibold text-foreground">{weave.topic}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {(weave.nodes ?? []).length} nodes &middot; {(weave.nodes ?? []).filter((n) => !n.is_scaffold).length} contributed
          </p>
          {weave.source === 'import' && weave.source_url && (
            <a href={weave.source_url} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
              Imported from {new URL(weave.source_url).hostname}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export button */}
          <button
            onClick={() => setExportOpen(true)}
            title="Export weave"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:bg-primary/5"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mind Map</span>
            </button>
          </div>
        </div>
      </div>

      {view === 'list' && (
        <div className="flex flex-col gap-10">
          {depths.map((depth) => (
            <section key={depth}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {STAGE_LABELS[depth] ?? 'Deep Dive'}
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="mx-auto flex max-w-[640px] flex-col gap-3">
                {nodesByDepth[depth].map((node, idx) => (
                  <div key={node.id}>
                    <NodeCard node={node} onUnlock={handleUnlock} onViewDetail={handleViewDetail} />
                    {!node.is_scaffold && idx === 4 && depth === 2 && (
                      <SponsoredCard ad={SPONSORED_ADS[0]} variant="inline" className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === 'map' && <MindMapView weaveNodes={weave.nodes} onViewDetail={handleViewDetail} />}

      {votingNodes.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Open for Community Vote</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="mx-auto flex max-w-[640px] flex-col gap-3">
            {votingNodes.map((node) => (
              <div key={node.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{node.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{node.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Vote</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => castVote(node.id, 'accept')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${userVotes[node.id] === 'accept' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-border text-muted-foreground hover:text-green-400 hover:border-green-500/40'}`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => castVote(node.id, 'reject')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${userVotes[node.id] === 'reject' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40'}`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </button>
                  {node.contributed_by && <span className="ml-auto text-xs text-muted-foreground">by @{node.contributed_by}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <NodeDetailDrawer
        node={selectedNode}
        weaveId={weave.id}
        allNodes={weave.nodes}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnlock={handleUnlock}
        onContribute={handleCommunityContribute}
      />
      <ContributeModal
        node={scaffoldNode}
        weaveId={weave.id}
        open={scaffoldModalOpen}
        onOpenChange={setScaffoldModalOpen}
        onRefresh={onRefresh}
      />
      <AddPerspectiveModal
        node={communityNode}
        weaveId={weave.id}
        open={perspectiveModalOpen}
        onOpenChange={setPerspectiveModalOpen}
        onRefresh={onRefresh}
      />
      <ExportModal
        weave={weave}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </main>
  )
}