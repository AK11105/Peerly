'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X, BookOpen, Users, BarChart2, Layers, Lightbulb,
  ChevronRight, Clock, Star, ExternalLink, PenLine,
} from 'lucide-react'
import type { WeaveNode } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { ContributionThread, type Contribution } from './contribution-thread'

interface NodeDetailDrawerProps {
  node: WeaveNode | null
  weaveId?: string
  allNodes?: WeaveNode[]
  open: boolean
  onClose: () => void
  onUnlock?: (node: WeaveNode) => void
  onContribute?: (node: WeaveNode) => void
}

const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']
const DIFFICULTY_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']



const READ_TIMES = ['', '10 min', '20 min', '35 min', '50 min', '90 min']

function DifficultyBar({ level }: { level: number }) {
  const color = DIFFICULTY_COLORS[level] ?? '#22C55E'
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-2 w-5 rounded-sm transition-all"
            style={{ backgroundColor: i < level ? color : '#1F1F1F' }} />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color: level > 0 ? color : '#6B7280' }}>
        {DIFFICULTY_LABELS[level]}
      </span>
    </div>
  )
}

function generateLearningPoints(description: string, title: string): string[] {
  const sentences = (description ?? '').split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15)
  const points: string[] = []
  if (sentences[0]) points.push(`Understand ${sentences[0].toLowerCase().replace(/^understand\s+/i, '')}`)
  if (sentences[1]) points.push(`Apply ${sentences[1].toLowerCase().replace(/^apply\s+/i, '')}`)
  if (sentences.length < 2) points.push(`Master the fundamentals of ${title.toLowerCase()}`)
  return points.slice(0, 3)
}

/** Parse description text into thread cards.
 *  Perspectives appended by add-perspective-modal use separator "\n\n---\n\n"
 *  followed by "**author:** text". The first block is the original contribution. */
function parseContributions(node: WeaveNode): Contribution[] {
  const rawBlocks = (node.description ?? '').split('\n\n---\n\n')
  return rawBlocks.map((block, idx) => {
    const authorMatch = block.match(/^\*\*(.+?)\*\*:\s*/)
    const author = authorMatch ? authorMatch[1] : (node.contributed_by ?? 'community')
    const text = authorMatch ? block.slice(authorMatch[0].length) : block
    // Strip "Reference: url" suffix into link field
    const refMatch = text.match(/\nReference: (.+)$/)
    return {
      id: `${node.id}-contrib-${idx}`,
      author,
      text: refMatch ? text.slice(0, refMatch.index) : text,
      link: refMatch ? refMatch[1] : undefined,
      order: idx,
    }
  })
}

export function NodeDetailDrawer({
  node,
  weaveId,
  allNodes = [],
  open,
  onClose,
  onUnlock,
  onContribute,
}: NodeDetailDrawerProps) {
  const [contributions, setContributions] = useState<Contribution[]>([])

  useEffect(() => {
    if (node && !node.is_scaffold) {
      setContributions(parseContributions(node))
    }
  }, [node])

  if (!node) return null

  const prerequisites = allNodes
    .filter(n => n.id !== node.id && n.depth < node.depth && !n.is_scaffold)
    .slice(-2)

  const nextNodes = allNodes
    .filter(n => n.id !== node.id && n.depth > node.depth)
    .slice(0, 2)

  const learningPoints = generateLearningPoints(node.description, node.title)
  const diffColor = DIFFICULTY_COLORS[node.difficulty] ?? '#22C55E'
  const showContribute = (node.is_scaffold && !!onUnlock) || (!node.is_scaffold && !!onContribute)

  const handleContributeClick = () => {
    if (node.is_scaffold && onUnlock) onUnlock(node)
    else if (onContribute) onContribute(node)
    onClose()
  }

  return (
    <div>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[440px] bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full shrink-0" style={{
          background: node.is_scaffold
            ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
            : `linear-gradient(90deg, ${diffColor}, ${diffColor}88)`,
        }} />

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={
                node.is_scaffold
                  ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                  : { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
              }>
                {node.is_scaffold ? '⚡ AI Draft' : '✓ Community'}
              </span>
              <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
                {STAGE_LABELS[node.depth] ?? 'Deep Dive'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">{node.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0 mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Quick stats strip */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {[
              { icon: BarChart2, label: 'Difficulty', value: DIFFICULTY_LABELS[node.difficulty] ?? '—' },
              { icon: Layers, label: 'Stage', value: `Depth ${node.depth}` },
              { icon: Clock, label: 'Est. Read', value: READ_TIMES[node.difficulty] ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2 text-center">
                <Icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground mt-0.5">{value}</span>
              </div>
            ))}
          </div>

          <div className="p-6 space-y-6">

            {/* Scaffold gap banner */}
            {node.is_scaffold && (
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1.5px dashed rgba(245,158,11,0.35)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <p className="text-sm font-semibold text-foreground">Knowledge gap detected</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The AI identified this concept as a prerequisite but no community member has filled it yet.
                  Your explanation helps everyone on this learning path.
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>+50 LM reward</span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-border" />
                  <span>Boosts your Rep</span>
                </div>
              </div>
            )}

            {/* Community node — add perspective nudge */}
            {!node.is_scaffold && onContribute && (
              <div className="rounded-xl p-4 space-y-1.5"
                style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Know this better?</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add your own explanation alongside existing ones.
                  Earn <span className="text-primary font-semibold">+25 LM</span> per contribution.
                </p>
              </div>
            )}

            {/* ── Contribution snippet ── */}
            {!node.is_scaffold && contributions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                    Explanations
                  </h3>
                  <span className="text-xs text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-full">
                    {contributions.length}
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-muted-foreground bg-background rounded-xl p-4 border border-border">
                  <p className="line-clamp-3">{contributions[0].text}</p>
                  {(contributions.length > 1 || contributions[0].text.length > 150) && weaveId && (
                    <Link href={`/node/${weaveId}/${node.id}`} onClick={onClose} className="text-xs text-primary mt-2 inline-block hover:underline">
                      Read full explanation →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Scaffold description (plain) */}
            {node.is_scaffold && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">About this Node</h3>
                </div>
                <div className="text-sm leading-relaxed text-muted-foreground bg-background rounded-xl p-4 border border-border">
                  {node.description}
                </div>
              </div>
            )}

            {/* What you'll learn */}
            {!node.is_scaffold && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">What You'll Learn</h3>
                </div>
                <div className="space-y-2">
                  {learningPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <span className="leading-relaxed capitalize">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div className="bg-background rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground font-medium mb-2">Difficulty</p>
              <DifficultyBar level={node.difficulty} />
            </div>

            {/* Original contributor */}
            {!node.is_scaffold && node.contributed_by && (
              <div className="bg-background rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Original contributor</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {node.contributed_by[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">@{node.contributed_by}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-xs text-muted-foreground">+50 LM earned</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Prerequisites</p>
                <div className="space-y-2">
                  {prerequisites.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm bg-background border border-border rounded-lg px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                      <span className="text-muted-foreground truncate">{p.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Up next */}
            {nextNodes.length > 0 && !node.is_scaffold && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Up Next</p>
                <div className="space-y-2">
                  {nextNodes.map(n => (
                    <div key={n.id} className="flex items-center justify-between gap-2 text-sm bg-background border border-border rounded-lg px-3 py-2 hover:border-primary/40 transition-colors cursor-default">
                      <span className="text-muted-foreground truncate">{n.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Node ID */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground/40 font-mono break-all">node/{node.id}</p>
            </div>

          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-5 border-t border-border bg-background/50 shrink-0 space-y-2">
          {weaveId && (
            <Link href={`/node/${weaveId}/${node.id}`} onClick={onClose}>
              <Button variant="outline" className="w-full h-10 border-border gap-2 text-sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Full Deep Dive
              </Button>
            </Link>
          )}
          {showContribute && (
            <Button
              onClick={handleContributeClick}
              className="w-full h-11 font-bold text-sm gap-2"
              style={
                node.is_scaffold
                  ? { background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#000' }
                  : { background: 'linear-gradient(135deg, #22C55E, #15803D)', color: '#000' }
              }
            >
              <PenLine className="h-4 w-4" />
              {node.is_scaffold ? '✍ Contribute to this Node · +50 LM' : 'Add Your Explanation · +25 LM'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}