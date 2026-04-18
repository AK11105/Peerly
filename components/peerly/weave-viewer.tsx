'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { List, Network, Share2 } from 'lucide-react'
import { CommunityProgressBar } from './community-progress-bar'
import { NodeCard } from './node-card'
import { NodeDetailDrawer } from './node-detail-drawer'
import { ContributeModal } from './contribute-modal'
import { AddPerspectiveModal } from './add-perspective-modal'
import { ExportModal } from './export-modal'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'
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

  // Drawer
  const [selectedNode, setSelectedNode] = useState<WeaveNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Scaffold contribute modal (replace AI draft)
  const [scaffoldNode, setScaffoldNode] = useState<WeaveNode | null>(null)
  const [scaffoldModalOpen, setScaffoldModalOpen] = useState(false)

  // Community perspective modal (add to existing node)
  const [communityNode, setCommunityNode] = useState<WeaveNode | null>(null)
  const [perspectiveModalOpen, setPerspectiveModalOpen] = useState(false)

  // Export modal
  const [exportOpen, setExportOpen] = useState(false)

  const handleViewDetail = (node: WeaveNode) => {
    setSelectedNode(node)
    setDrawerOpen(true)
  }

  const handleUnlock = (node: WeaveNode) => {
    setScaffoldNode(node)
    setScaffoldModalOpen(true)
  }

  const handleCommunityContribute = (node: WeaveNode) => {
    setCommunityNode(node)
    setPerspectiveModalOpen(true)
  }

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
      {/* Progress bar */}
      <CommunityProgressBar nodes={weave.nodes} />

      {/* Topic header */}
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

        {/* Controls: export + view toggle */}
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

          {/* View toggle pill */}
          <div className="flex items-center rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                view === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                view === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mind Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* List view */}
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

      {/* Mind map view */}
      {view === 'map' && <MindMapView weaveNodes={weave.nodes} onViewDetail={handleViewDetail} />}

      {/* Node detail drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        weaveId={weave.id}
        allNodes={weave.nodes}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnlock={handleUnlock}
        onContribute={handleCommunityContribute}
      />

      {/* Scaffold contribute modal — replaces AI draft */}
      <ContributeModal
        node={scaffoldNode}
        weaveId={weave.id}
        open={scaffoldModalOpen}
        onOpenChange={setScaffoldModalOpen}
        onRefresh={onRefresh}
      />

      {/* Perspective modal — appends to community node */}
      <AddPerspectiveModal
        node={communityNode}
        weaveId={weave.id}
        open={perspectiveModalOpen}
        onOpenChange={setPerspectiveModalOpen}
        onRefresh={onRefresh}
      />

      {/* Export modal */}
      <ExportModal
        weave={weave}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </main>
  )
}