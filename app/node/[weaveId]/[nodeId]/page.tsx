'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, BookOpen, Layers, BarChart2, Users,
  Clock, Star, Sparkles, RefreshCw, ChevronRight, ChevronDown
} from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { ContributeModal } from '@/components/peerly/contribute-modal'
import { ContributionThread, type Contribution } from '@/components/peerly/contribution-thread'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { fetchWeave } from '@/lib/api'
import type { WeaveNode, Weave } from '@/lib/types'

const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']
const DIFFICULTY_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']
const STAGE_LABELS: Record<number, string> = {
  0: 'Foundation', 1: 'Core Concepts', 2: 'Intermediate',
  3: 'Advanced', 4: 'Expert', 5: 'Mastery',
}
const READ_TIMES = ['', '10 min', '20 min', '35 min', '50 min', '90 min']

function DifficultyBar({ level }: { level: number }) {
  const color = DIFFICULTY_COLORS[level] ?? '#22C55E'
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-2 w-8 rounded-sm" style={{ backgroundColor: i < level ? color : '#1F1F1F' }} />
      ))}
      <span className="text-sm font-medium ml-1" style={{ color }}>{DIFFICULTY_LABELS[level]}</span>
    </div>
  )
}


function parseContributions(node: WeaveNode): Contribution[] {
  const upvotesMap: Record<number, number> = (node as any).contribution_upvotes ?? {}
  const rawBlocks = node.description.split('\n\n---\n\n')
  return rawBlocks.map((block, idx) => {
    const authorMatch = block.match(/^\*\*(.+?)\*\*:\s*/)
    const author = authorMatch ? authorMatch[1] : (node.contributed_by ?? 'community')
    const text = authorMatch ? block.slice(authorMatch[0].length) : block
    const refMatch = text.match(/\nReference: (.+)$/)
    return {
      id: `${node.id}-contrib-${idx}`,
      author,
      text: refMatch ? text.slice(0, refMatch.index) : text,
      link: refMatch ? refMatch[1] : undefined,
      order: idx,
      upvotes: upvotesMap[idx] ?? 0,
    }
  })
}

function ExplanationCard({
  contrib, isTop, weaveId, nodeId, alreadyVoted, onUpvote,
}: { contrib: Contribution; isTop: boolean; weaveId: string; nodeId: string; alreadyVoted: boolean; onUpvote: (order: number, newCount: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [voted, setVoted] = useState(alreadyVoted)

  // Sync when userId resolves asynchronously (Clerk auth)
  useEffect(() => {
    setVoted(alreadyVoted)
  }, [alreadyVoted])

  const handleUpvote = async () => {
    const wasVoted = voted
    const optimistic = wasVoted ? (contrib.upvotes ?? 0) - 1 : (contrib.upvotes ?? 0) + 1
    setVoted(!wasVoted)
    onUpvote(contrib.order, optimistic)

    const res = await fetch(`/api/weaves/${weaveId}/nodes/${nodeId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockIndex: contrib.order }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpvote(contrib.order, data.upvotes)
    } else {
      setVoted(wasVoted)
      onUpvote(contrib.order, contrib.upvotes ?? 0)
    }
  }

  const preview = contrib.text.slice(0, 160).trimEnd() + (contrib.text.length > 160 ? '…' : '')

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary shrink-0">
          {contrib.author[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-foreground flex-1">@{contrib.author}</span>
        {isTop && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Top</span>
        )}
        <button
          onClick={handleUpvote}
          title={voted ? 'Remove upvote' : 'Upvote'}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
            voted ? 'border-primary text-primary bg-primary/10 hover:bg-primary/20' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
          }`}
        >
          <Star className={`h-3 w-3 ${voted ? 'fill-primary' : ''}`} />
          {contrib.upvotes ?? 0}
        </button>
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Preview always visible */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-6 text-muted-foreground">{expanded ? contrib.text : preview}</p>
        {contrib.link && expanded && (
          <a href={contrib.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
            🔗 {contrib.link}
          </a>
        )}
      </div>
    </Card>
  )
}

function CommunityExplanations({ node, weaveId, nodeId, userId, upvoteCounts, onUpvote }: {
  node: WeaveNode; weaveId: string; nodeId: string; userId: string
  upvoteCounts: Record<number, number>; onUpvote: (order: number, newCount: number) => void
}) {
  const base = parseContributions(node)
  const all = base
    .map(c => ({ ...c, upvotes: upvoteCounts[c.order] ?? c.upvotes ?? 0 }))
    .sort((a, b) => b.upvotes - a.upvotes)

  if (all.length === 0) return null

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Explanations</h2>
        <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
          {all.length}
        </span>
      </div>
      <div className="space-y-2">
        {all.map((contrib, i) => (
          <ExplanationCard key={contrib.id} contrib={contrib} isTop={i === 0} weaveId={weaveId} nodeId={nodeId}
            alreadyVoted={(((node as any).contribution_voters ?? []) as string[]).includes(`${contrib.order}:${userId}`)}
            onUpvote={onUpvote}
          />
        ))}
      </div>
    </div>
  )
}

async function generateExplainer(node: WeaveNode, topic: string, weaveId: string): Promise<string> {
  const res = await fetch('/api/nodes/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: node.title,
      description: node.description,
      topic,
      depth: node.depth,
      difficulty: node.difficulty,
      weaveId,
      nodeId: node.id,
    }),
  })
  if (!res.ok) throw new Error('Failed')
  const data = await res.json()
  return data.explainer
}

export default function NodeDetailPage() {
  const { userId } = useAuth()
  const params = useParams()
  const router = useRouter()
  const weaveId = params?.weaveId as string
  const nodeId = params?.nodeId as string

  const [weave, setWeave] = useState<Weave | null>(null)
  const [node, setNode] = useState<WeaveNode | null>(null)
  const [upvoteCounts, setUpvoteCounts] = useState<Record<number, number>>({})
  const [explainer, setExplainer] = useState('')
  const [explainerLoading, setExplainerLoading] = useState(false)
  const [explainerError, setExplainerError] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [contributeOpen, setContributeOpen] = useState(false)

  const loadWeaveData = async () => {
    try {
      const w = await fetchWeave(weaveId)
      setWeave(w)
      const n = w.nodes.find((n) => n.id === nodeId) ?? null
      setNode(n)
      if (n) {
        const base = parseContributions(n)
        setUpvoteCounts(Object.fromEntries(base.map(c => [c.order, c.upvotes ?? 0])))
      }
      setPageLoading(false)
      if (n && n.is_scaffold) {
        if ((n as any).explainer) {
          setExplainer((n as any).explainer)
        } else {
          loadExplainer(n, w.topic)
        }
      }
    } catch {
      setPageLoading(false)
    }
  }

  useEffect(() => { loadWeaveData() }, [weaveId, nodeId])

  const loadExplainer = async (n: WeaveNode, topic: string) => {
    setExplainerLoading(true)
    setExplainerError(false)
    try {
      setExplainer(await generateExplainer(n, topic, weaveId))
    } catch {
      setExplainerError(true)
    } finally {
      setExplainerLoading(false)
    }
  }

  // After contributing, re-fetch so scaffold → community node is reflected
  const handleContributeRefresh = async () => {
    const w = await fetchWeave(weaveId)
    setWeave(w)
    const updated = w.nodes.find((n) => n.id === nodeId) ?? null
    setNode(updated)
  }

  const prerequisites = weave?.nodes.filter(
    (n) => n.id !== nodeId && n.depth < (node?.depth ?? 0) && !n.is_scaffold
  ).slice(-3) ?? []

  const nextNodes = weave?.nodes.filter(
    (n) => n.id !== nodeId && n.depth > (node?.depth ?? 0)
  ).slice(0, 3) ?? []

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Loading node…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!node || !weave) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">Node not found</p>
            <button onClick={() => router.back()} className="text-sm text-primary underline">Go back</button>
          </div>
        </div>
      </div>
    )
  }

  const diffColor = DIFFICULTY_COLORS[node.difficulty] ?? '#22C55E'

  return (
    <div className="min-h-screen bg-background">
      <Navbar showWeaveTitle={weave.topic} />

      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: node.is_scaffold
            ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
            : `linear-gradient(90deg, ${diffColor}, ${diffColor}66)`,
        }}
      />

      <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span>/</span>
          <Link href={`/weave/${weaveId}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
            {weave.topic}
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{node.title}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={
                node.is_scaffold
                  ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
                  : { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }
              }
            >
              {node.is_scaffold ? '⚡ AI Draft — needs contribution' : '✓ Community Node'}
            </span>
            <Badge variant="outline" className="text-xs">{STAGE_LABELS[node.depth] ?? 'Deep Dive'}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 leading-tight">{node.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{[...parseContributions(node)].map(c => ({ ...c, upvotes: upvoteCounts[c.order] ?? c.upvotes ?? 0 })).sort((a,b)=>b.upvotes-a.upvotes)[0]?.text ?? ''}</p>
        </div>

        {/* Scaffold contribute CTA — prominent banner */}
        {node.is_scaffold && (
          <div
            className="rounded-xl p-5 mb-8 flex items-start justify-between gap-4"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1.5px dashed rgba(245,158,11,0.4)' }}
          >
            <div>
              <p className="font-semibold text-foreground mb-1">This node needs your knowledge</p>
              <p className="text-sm text-muted-foreground">
                The AI identified this concept as important but no one has filled it yet.
                Write your own explanation and earn <span className="text-yellow-500 font-semibold">+50 LM</span>.
              </p>
            </div>
            <Button
              onClick={() => setContributeOpen(true)}
              className="shrink-0 font-bold"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#000' }}
            >
              Contribute
            </Button>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: BarChart2, label: 'Difficulty', value: DIFFICULTY_LABELS[node.difficulty] },
            { icon: Layers, label: 'Stage', value: `Depth ${node.depth}` },
            { icon: Clock, label: 'Est. Read', value: READ_TIMES[node.difficulty] ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="p-4 bg-card border-border text-center">
              <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-foreground">{value}</p>
            </Card>
          ))}
        </div>

        {/* Deep Dive — community content or AI explainer */}
        {!node.is_scaffold ? (
          <CommunityExplanations node={node} weaveId={weaveId} nodeId={nodeId} userId={userId ?? ''} upvoteCounts={upvoteCounts} onUpvote={(order, count) => setUpvoteCounts(prev => ({ ...prev, [order]: count }))} />
        ) : (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Deep Dive</h2>
                <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
                  AI generated
                </span>
              </div>
              {!explainerLoading && (
                <button
                  onClick={() => loadExplainer(node, weave.topic)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              )}
            </div>
            <Card className="p-6 bg-card border-border">
              {explainerLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    AI is writing your explainer…
                  </div>
                  {[100, 90, 95, 80, 88, 75, 92].map((w, i) => (
                    <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : explainerError ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground text-sm">Could not generate explainer. Please try again.</p>
                  <Button variant="outline" size="sm" onClick={() => loadExplainer(node, weave.topic)} className="border-border">
                    Try again
                  </Button>
                </div>
              ) : explainer ? (
                <div className="space-y-1">
                  {explainer.split('\n\n').filter(Boolean).map((para, i) => {
                    if (para.startsWith('## ')) {
                      return (
                        <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-2 first:mt-0">
                          {para.replace(/^##\s*/, '')}
                        </h3>
                      )
                    }
                    if (para.match(/^[-*] /m)) {
                      return (
                        <ul key={i} className="space-y-1.5 my-3 pl-1">
                          {para.split('\n').filter(l => l.trim()).map((item, j) => (
                            <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                              <span>{item.replace(/^[-*]\s*/, '')}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                    return (
                      <p key={i} className="text-sm leading-7 text-muted-foreground">
                        {para}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No explainer yet.</p>
              )}
            </Card>
          </div>
        )}

        {/* Difficulty */}
        <Card className="p-5 bg-card border-border mb-6">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">Difficulty</p>
          <DifficultyBar level={node.difficulty} />
        </Card>

        {/* Contributor */}
        {!node.is_scaffold && node.contributed_by && (
          <Card className="p-5 bg-card border-border mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Contributed by</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {node.contributed_by[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">@{node.contributed_by}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-xs text-muted-foreground">+50 LM earned for this contribution</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Learning path nav */}
        {(prerequisites.length > 0 || nextNodes.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {prerequisites.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Prerequisites</p>
                <div className="space-y-2">
                  {prerequisites.map((p) => (
                    <Link key={p.id} href={`/node/${weaveId}/${p.id}`}>
                      <div className="flex items-center gap-2 text-sm bg-card border border-border rounded-lg px-3 py-2.5 hover:border-primary/40 transition-colors group">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate">{p.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {nextNodes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Up Next</p>
                <div className="space-y-2">
                  {nextNodes.map((n) => (
                    <Link key={n.id} href={`/node/${weaveId}/${n.id}`}>
                      <div className="flex items-center justify-between gap-2 text-sm bg-card border border-border rounded-lg px-3 py-2.5 hover:border-primary/40 transition-colors group">
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate">{n.title}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back to weave */}
        <div className="text-center pt-4 border-t border-border">
          <Link href={`/weave/${weaveId}`}>
            <Button variant="outline" className="border-border">← Back to {weave.topic}</Button>
          </Link>
        </div>
      </main>

      {/* Contribute modal — for scaffold nodes */}
      {node.is_scaffold && (
        <ContributeModal
          node={node}
          weaveId={weaveId}
          open={contributeOpen}
          onOpenChange={setContributeOpen}
          onRefresh={handleContributeRefresh}
        />
      )}
    </div>
  )
}
