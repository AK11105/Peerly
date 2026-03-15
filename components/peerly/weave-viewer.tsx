'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { List, Network } from 'lucide-react'
import { CommunityProgressBar } from './community-progress-bar'
import { NodeCard } from './node-card'
import { NodeDetailDrawer } from './node-detail-drawer'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'
import type { Weave, WeaveNode } from '@/lib/types'

const MindMapView = dynamic(
  () => import('./mind-map-view').then((m) => m.MindMapView),
  { ssr: false, loading: () => <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">Loading mind map…</div> }
)

interface WeaveViewerProps {
  weave: Weave
  onUnlock: (node: WeaveNode) => void
}

const STAGE_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Core',
  3: 'Advanced',
  4: 'Expert',
  5: 'Mastery',
}

export function WeaveViewer({ weave, onUnlock }: WeaveViewerProps) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedNode, setSelectedNode] = useState<WeaveNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleViewDetail = (node: WeaveNode) => {
    setSelectedNode(node)
    setDrawerOpen(true)
  }

  const nodesByDepth = useMemo(() => {
    const groups: Record<number, WeaveNode[]> = {}
    for (const node of weave.nodes) {
      if (!groups[node.depth]) groups[node.depth] = []
      groups[node.depth].push(node)
    }
    return groups
  }, [weave.nodes])

  const depths = useMemo(
    () =>
      Object.keys(nodesByDepth)
        .map(Number)
        .sort((a, b) => a - b),
    [nodesByDepth]
  )

  return (
    <main className="min-w-0 flex-1">
      {/* Progress bar */}
      <CommunityProgressBar nodes={weave.nodes} />

      {/* Topic header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-balance text-xl font-semibold text-foreground">{weave.topic}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {weave.nodes.length} nodes &middot; {weave.nodes.filter((n) => !n.is_scaffold).length} contributed
          </p>
        </div>

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
            List
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
            Mind Map
          </button>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="flex flex-col gap-10">
          {depths.map((depth) => (
            <section key={depth}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Stage {depth} — {STAGE_LABELS[depth] ?? 'Deep Dive'}
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="mx-auto flex max-w-[640px] flex-col gap-3">
                {nodesByDepth[depth].map((node, idx) => (
                  <div key={node.id}>
                    <NodeCard node={node} onUnlock={onUnlock} onViewDetail={handleViewDetail} />
                    {/* Inject sponsored ad after 5th community node */}
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
      {view === 'map' && <MindMapView weaveNodes={weave.nodes} />}

      {/* Node detail drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        weaveId={weave.id}
        allNodes={weave.nodes}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnlock={onUnlock}
      />
    </main>
  )
}
