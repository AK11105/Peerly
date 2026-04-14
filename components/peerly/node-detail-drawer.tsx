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
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ContributionThread, type Contribution } from './contribution-thread'
import { useTheme } from 'next-themes'


import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

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
    let text = authorMatch ? block.slice(authorMatch[0].length) : block

    const refMatch = text.match(/\nReference: (.+?)(\nAttachments:|$)/)
    const link = refMatch ? refMatch[1].trim() : undefined
    if (refMatch) text = text.slice(0, refMatch.index) + text.slice(refMatch.index! + refMatch[0].length)

    const attMatch = text.match(/\nAttachments: (\[.+?\])/)
    let attachments: string[] | undefined
    try { if (attMatch) attachments = JSON.parse(attMatch[1]) } catch {}
    if (attMatch) text = text.slice(0, attMatch.index)

    if (idx === 0 && !attachments && (node as any).attachments?.length) {
      attachments = (node as any).attachments
    }

    return {
      id: `${node.id}-contrib-${idx}`,
      author,
      text: text.trim(),
      link,
      attachments,
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
const rawText = contributions[0]?.text || ''

const cleanText = rawText
  .replace(/:contentReference\[.*?\]\{.*?\}/g, '') // remove garbage
  .replace(/\n/g, '\n\n') // fix spacing
  
  // Mobile: Use bottom sheet; Desktop: Use side drawer
  return (
    
    <>

    
      {/* Mobile Bottom Sheet */}
      <BottomSheet
        open={open}
        onClose={onClose}
        title={node.title}
        showCloseButton={true}
      >
        <div className="space-y-4 pb-20">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={
              node.is_scaffold
                ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                : { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
            }>
              {node.is_scaffold ? '⚡ AI Draft' : '✓ Community'}
            </span>
            <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
              {STAGE_LABELS[node.depth] ?? 'Depth ' + node.depth}
            </span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: BarChart2, label: 'Difficulty', value: DIFFICULTY_LABELS[node.difficulty] ?? '—' },
              { icon: Layers, label: 'Stage', value: `D${node.depth}` },
              { icon: Clock, label: 'Read', value: READ_TIMES[node.difficulty] ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border">
                <Icon className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Scaffold gap banner */}
          {node.is_scaffold && (
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1.5px dashed rgba(245,158,11,0.35)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <p className="text-sm font-semibold text-foreground">Knowledge gap detected</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI identified this as missing. Your contribution helps everyone!
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span>+50 LM</span>
                </div>
              </div>
            </div>
          )}

          {/* Community node nudge */}
          {!node.is_scaffold && onContribute && (
            <div className="rounded-xl p-3 space-y-1"
              style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Know this better?</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Add your own explanation alongside existing ones. Earn <span className="text-primary font-semibold">+25 LM</span> per contribution.
              </p>
            </div>
          )}

          {/* Description / Contributions */}
          {node.is_scaffold ? (
            <div className="text-sm leading-relaxed text-muted-foreground bg-background rounded-xl p-4 border border-border">
              {node.description}
            </div>
          ) : contributions.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                  Explanations ({contributions.length})
                </h3>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground bg-background rounded-xl p-4 border border-border">
                <div className="prose prose-sm dark:prose-invert max-w-none ">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                >
                    {cleanText}
                </ReactMarkdown>
                </div>
                {weaveId && (
                  <Link href={`/node/${weaveId}/${node.id}`} onClick={onClose} className="text-xs text-primary mt-2 inline-block hover:underline">
                    Read full →
                  </Link>
                )}
              </div>
            </div>
          ) : null}

          {/* What you'll learn */}
          {!node.is_scaffold && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">You'll Learn</h3>
              </div>
              <div className="space-y-2">
                {learningPoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkBreaks]}
  >
    {point}
  </ReactMarkdown>
</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2">Difficulty</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-2 w-6 rounded-sm"
                    style={{ backgroundColor: i < node.difficulty ? diffColor : 'var(--muted)' }} />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: node.difficulty > 0 ? diffColor : 'var(--muted-foreground)' }}>
                {DIFFICULTY_LABELS[node.difficulty]}
              </span>
            </div>
          </div>

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Prerequisites</p>
              <div className="space-y-1.5">
                {prerequisites.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-background border border-border rounded-lg px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                    <span className="text-muted-foreground truncate">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Up Next */}
          {nextNodes.length > 0 && !node.is_scaffold && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Up Next</p>
              <div className="space-y-1.5">
                {nextNodes.map(n => (
                  <div key={n.id} className="flex items-center justify-between gap-2 text-sm bg-background border border-border rounded-lg px-3 py-2">
                    <span className="text-muted-foreground truncate">{n.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer CTAs - sticky on mobile */}
          <div className="sticky bottom-0 bg-card pt-2 space-y-2">
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
                {node.is_scaffold ? 'Contribute · +50 LM' : 'Add Explanation · +25 LM'}
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Desktop Side Drawer */}
     
    </>
  )
}