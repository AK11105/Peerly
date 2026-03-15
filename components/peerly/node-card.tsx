'use client'

import type { WeaveNode } from '@/lib/types'

interface NodeCardProps {
  node: WeaveNode
  onUnlock?: (node: WeaveNode) => void
  onViewDetail?: (node: WeaveNode) => void
  compact?: boolean
}

function DifficultyDots({ level }: { level: number }) {
  const colors = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']
  const color = colors[level] ?? '#22C55E'
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full transition-all"
          style={{ backgroundColor: i < level ? color : '#1F1F1F' }}
        />
      ))}
    </div>
  )
}

export function NodeCard({ node, onUnlock, onViewDetail, compact = false }: NodeCardProps) {
  // Clicking anywhere on the card opens detail drawer
  // The UNLOCK button is a secondary action that goes straight to contribute modal
  const handleCardClick = () => {
    if (onViewDetail) onViewDetail(node)
  }

  if (node.is_scaffold) {
    return (
      <div
        className="relative rounded-lg p-5 transition-all cursor-pointer group"
        style={{
          background: '#0E0E0E',
          border: '1.5px dashed #F59E0B',
          boxShadow: '0 0 16px rgba(245,158,11,0.1)',
        }}
        onClick={handleCardClick}
      >
        {/* Subtle pulsing glow on hover */}
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: '0 0 24px rgba(245,158,11,0.2)' }}
        />

        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className={`font-semibold leading-snug text-foreground ${compact ? 'text-sm' : 'text-base'}`}>
            {node.title}
          </h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            AI Draft
          </span>
        </div>

        {!compact && (
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {node.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DifficultyDots level={node.difficulty} />
            <span className="text-xs text-muted-foreground">Needs contribution</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
              View details →
            </span>
            {!compact && onUnlock && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnlock(node) }}
                className="rounded-full px-3 py-1 text-xs font-bold transition-all hover:brightness-110 active:scale-95"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}
              >
                UNLOCK
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-lg p-5 transition-all cursor-pointer group hover:brightness-[1.03]"
      style={{
        background: '#0E0E0E',
        border: '1px solid #1F1F1F',
        borderLeft: '3px solid #22C55E',
      }}
      onClick={handleCardClick}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className={`font-semibold leading-snug text-foreground group-hover:text-white transition-colors ${compact ? 'text-sm' : 'text-base'}`}>
          {node.title}
        </h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          ✓ Community
        </span>
      </div>

      {!compact && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {node.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <DifficultyDots level={node.difficulty} />
        <div className="flex items-center gap-3">
          {node.contributed_by && (
            <span className="text-xs text-muted-foreground">@{node.contributed_by}</span>
          )}
          <span className="text-xs text-primary/50 group-hover:text-primary transition-colors">
            View details →
          </span>
        </div>
      </div>
    </div>
  )
}
