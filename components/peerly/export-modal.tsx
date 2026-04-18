'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, Copy, Check, Share2, FileCode2, Network, Globe, Code2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toGraphvizDot, toCytoscapeJson, toCSV, toEmbedHtml,  downloadText, slugify } from '@/lib/export-weave'
import type { Weave, WeaveNode } from '@/lib/types'

interface ExportModalProps {
  weave: Weave
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = 'graphviz' | 'cytoscape' | 'html' | 'csv'
type Tab = 'code' | 'preview'

const FORMATS: {
  id: ExportFormat
  icon: typeof FileCode2
  label: string
  ext: string
  mime: string
  description: string
  accentColor: string
  badgeStyle: React.CSSProperties
}[] = [
  {
    id: 'html',
    icon: Globe,
    label: 'Embeddable HTML',
    ext: 'html',
    mime: 'text/html',
    description: 'Self-contained interactive file with full node data panel. Open in a browser or embed via <iframe>.',
    accentColor: '#22C55E',
    badgeStyle: { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' },
  },
  {
    id: 'cytoscape',
    icon: FileCode2,
    label: 'Cytoscape JSON',
    ext: 'json',
    mime: 'application/json',
    description: 'Import into Cytoscape Desktop or use with cytoscape.js. Contains all node data, descriptions, sources, and stats.',
    accentColor: '#60A5FA',
    badgeStyle: { background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' },
  },
  {
    id: 'graphviz',
    icon: Network,
    label: 'Graphviz DOT',
    ext: 'dot',
    mime: 'text/plain',
    description: 'Open with Graphviz, OmniGraffle, or paste into graphviz.org/online. Full metadata in node tooltips & comments.',
    accentColor: '#A78BFA',
    badgeStyle: { background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' },
  },
]

function getContent(weave: Weave, format: ExportFormat): string {
  switch (format) {
    case 'graphviz':
      return toGraphvizDot(weave)

    case 'cytoscape':
      return JSON.stringify(toCytoscapeJson(weave), null, 2)

    case 'html':
      return toEmbedHtml(weave)

    case 'csv':
      return toCSV(weave) 

    default:
      return '' 
  }
}

// ── Graphviz Preview (SVG rendered via API or fallback node list) ─────────────
function GraphvizPreview({ weave }: { weave: Weave }) {
  const STAGE_LABELS: Record<number, string> = {
    0: 'Foundation', 1: 'Core Concepts', 2: 'Intermediate',
    3: 'Advanced', 4: 'Expert', 5: 'Mastery',
  }
  const DIFF_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']
  const DIFF_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']

  // Group by depth
  const byDepth: Record<number, WeaveNode[]> = {}
  weave.nodes.forEach((n) => { if (!byDepth[n.depth]) byDepth[n.depth] = []; byDepth[n.depth].push(n) })
  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5 bg-[#0A0A0A]">
      <div className="text-xs text-muted-foreground text-center pb-1">
        Graphviz DOT visual representation — export the .dot file to render with full layout in Graphviz / graphviz.org
      </div>
      {depths.map((depth) => {
        const stage = STAGE_LABELS[depth] ?? `Depth ${depth}`
        return (
          <div key={depth}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{stage}</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="flex flex-wrap gap-2">
              {byDepth[depth].map((n) => {
                const color = n.is_scaffold ? '#F59E0B' : '#22C55E'
                const diffColor = DIFF_COLORS[n.difficulty] ?? '#22C55E'
                const diffLabel = DIFF_LABELS[n.difficulty] ?? n.difficulty
                const dots = Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-sm"
                    style={{ background: i < n.difficulty ? diffColor : '#1F1F1F' }}
                  />
                ))
                return (
                  <div
                    key={n.id}
                    className="rounded-lg p-2.5 flex flex-col gap-1.5"
                    style={{
                      minWidth: 140,
                      maxWidth: 200,
                      background: n.is_scaffold ? '#1a1200' : '#0a1a0f',
                      border: `${n.is_scaffold ? '1.5px dashed' : '1.5px solid'} ${color}`,
                    }}
                    title={n.description}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-semibold text-[#F9FAFB] leading-tight">{n.title}</span>
                      <span className="text-[9px] shrink-0 font-bold" style={{ color }}>
                        {n.is_scaffold ? '⚡' : '✓'}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#6B7280] line-clamp-2 leading-relaxed">{n.description}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">{dots}</div>
                      <span className="text-[9px]" style={{ color: diffColor }}>{diffLabel}</span>
                    </div>
                    {n.contributed_by && (
                      <span className="text-[9px] text-[#6B7280]">@{n.contributed_by}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Cytoscape JSON Preview ────────────────────────────────────────────────────
function CytoscapePreview({ weave }: { weave: Weave }) {
  const json = toCytoscapeJson(weave) as any
  const DIFF_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']
  const DIFF_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']

  const nodeElements = json.elements.filter((e: any) => !e.data.source)
  const edgeElements = json.elements.filter((e: any) => e.data.source)

  const [selected, setSelected] = useState<any | null>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-[#0D0D0D] shrink-0">
        {[
          { label: 'Nodes', val: nodeElements.length, color: '#F9FAFB' },
          { label: 'Edges', val: edgeElements.length, color: '#6B7280' },
          { label: 'Community', val: json.data.stats.community_nodes, color: '#22C55E' },
          { label: 'Scaffolds', val: json.data.stats.scaffold_nodes, color: '#F59E0B' },
          { label: 'Avg Difficulty', val: json.data.stats.avg_difficulty, color: '#9CA3AF' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <div className="text-xs font-bold" style={{ color }}>{val}</div>
            <div className="text-[9px] text-muted-foreground">{label}</div>
          </div>
        ))}
        <div className="ml-auto text-[9px] text-muted-foreground">Click a node row to see full data</div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Node list */}
        <div className="flex-1 overflow-y-auto border-r border-border/50">
          {nodeElements.map((el: any) => {
            const d = el.data
            const color = d.is_scaffold ? '#F59E0B' : '#22C55E'
            const diffColor = DIFF_COLORS[d.difficulty] ?? '#22C55E'
            const isSelected = selected?.id === d.id
            return (
              <button
                key={d.id}
                onClick={() => setSelected(isSelected ? null : d)}
                className="w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors flex items-start gap-2.5"
                style={{
                  background: isSelected ? (d.is_scaffold ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.07)') : 'transparent',
                }}
              >
                <div
                  className="mt-0.5 h-2 w-2 rounded-sm shrink-0"
                  style={{ background: color, border: d.is_scaffold ? `1px dashed ${color}` : undefined }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">{d.label}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="h-1 w-1 rounded-sm" style={{ background: i < d.difficulty ? diffColor : '#1F1F1F' }} />
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{d.description}</div>
                </div>
                <div className="text-[9px] shrink-0 mt-0.5" style={{ color }}>
                  {d.is_scaffold ? '⚡' : '✓'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className="w-48 shrink-0 overflow-y-auto p-3 bg-[#0A0A0A]">
          {!selected ? (
            <div className="text-[10px] text-muted-foreground text-center mt-8">Select a node to see all exported fields</div>
          ) : (
            <div className="space-y-2.5">
              {[
                ['id', selected.id.slice(0, 12) + '…'],
                ['stage', selected.stage],
                ['difficulty', `${selected.difficulty}/5 · ${selected.difficulty_label}`],
                ['status', selected.status],
                ['node_source', selected.node_source],
                ['contributed_by', selected.contributed_by || '—'],
                ['upvotes', selected.upvotes],
                ['has_explainer', selected.explainer ? 'yes' : 'no'],
                ['sources', selected.sources?.length || 0],
                ['attachments', selected.attachments?.length || 0],
                ['flag', selected.flag || 'none'],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-[9px] text-muted-foreground/60 font-mono">{String(k)}</div>
                  <div className="text-[10px] text-foreground font-mono break-all">{String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── HTML Preview (iframe) ─────────────────────────────────────────────────────
function HtmlPreview({ weave }: { weave: Weave }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const html = toEmbedHtml(weave)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [weave])

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading interactive preview…</span>
          </div>
        </div>
      )}
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          title="Weave preview"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ExportModal({ weave, open, onOpenChange }: ExportModalProps) {
  const [selected, setSelected] = useState<ExportFormat>('html')
  const [tab, setTab] = useState<Tab>('preview')
  const [copied, setCopied] = useState(false)

  const fmt = FORMATS.find((f) => f.id === selected)!
  const slug = slugify(weave.topic)

  const handleDownload = () => {
    const content = getContent(weave, selected)
    downloadText(content, `${slug}.${fmt.ext}`, fmt.mime)
    toast.success(`Downloaded ${slug}.${fmt.ext}`)
  }

  const handleCopy = async () => {
    const content = getContent(weave, selected)
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  const handleOpenNew = () => {
    const html = toEmbedHtml(weave)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  const content = getContent(weave, selected) || ''
  const lines = content.split('\n')

  // Reset to preview tab when format changes
  const handleFormatChange = (id: ExportFormat) => {
    setSelected(id)
    setTab('preview')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border p-0 gap-0 overflow-hidden flex flex-col"
        style={{ maxWidth: 820, height: '86vh', maxHeight: 700 }}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm text-foreground">Export Weave</DialogTitle>
              <p className="text-[11px] text-muted-foreground truncate">{weave.topic}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* ── Left sidebar: format picker ── */}
          <div className="w-44 shrink-0 border-r border-border flex flex-col py-3 px-2 gap-1 bg-background/30">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">Format</p>

            {FORMATS.map((f) => {
              const Icon = f.icon
              const active = selected === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-all border"
                  style={{
                    borderColor: active ? f.accentColor + '44' : 'transparent',
                    background: active ? f.accentColor + '10' : 'transparent',
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                    style={{ color: active ? f.accentColor : undefined }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{f.label}</p>
                    <span
                      className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={active ? f.badgeStyle : { background: 'rgba(255,255,255,0.05)', color: '#6B7280' }}
                    >
                      .{f.ext}
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Weave stats */}
            <div className="mt-auto pt-3 px-2 space-y-1.5 border-t border-border/50">
              {[
                { l: 'Total nodes', v: weave.nodes.length, c: '#F9FAFB' },
                { l: 'Community', v: weave.nodes.filter(n => !n.is_scaffold).length, c: '#22C55E' },
                { l: 'AI Drafts', v: weave.nodes.filter(n => n.is_scaffold).length, c: '#F59E0B' },
                { l: 'With sources', v: weave.nodes.filter(n => n.sources?.length).length, c: '#60A5FA' },
                { l: 'With explainer', v: weave.nodes.filter(n => n.explainer).length, c: '#A78BFA' },
              ].map(({ l, v, c }) => (
                <div key={l} className="flex justify-between items-center">
                  <span className="text-[9px] text-muted-foreground">{l}</span>
                  <span className="text-[10px] font-bold" style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right panel: tabs ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Description + tabs row */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0 gap-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">{fmt.description}</p>
              {/* Code / Preview toggle */}
              <div className="flex items-center rounded-md border border-border bg-background p-0.5 shrink-0">
                <button
                  onClick={() => setTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    tab === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button
                  onClick={() => setTab('code')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    tab === 'code' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code2 className="h-3 w-3" /> Code
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {tab === 'preview' ? (
                selected === 'html' ? (
                  <HtmlPreview weave={weave} />
                ) : selected === 'cytoscape' ? (
                  <CytoscapePreview weave={weave} />
                ) : (
                  <GraphvizPreview weave={weave} />
                )
              ) : (
                /* Code tab */
                <div className="h-full flex flex-col bg-[#0A0A0A]">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[#111] shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{slug}.{fmt.ext}</span>
                    <span className="text-[10px] text-muted-foreground">{lines.length} lines · {(content.length / 1024).toFixed(1)} KB</span>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-[#9CA3AF] leading-relaxed whitespace-pre">
                    {content}
                  </pre>
                </div>
              )}
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50 shrink-0">
              {selected === 'html' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNew}
                  className="border-border text-xs gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Open in tab
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-border text-xs gap-1.5"
              >
                {copied ? (
                  <><Check className="h-3.5 w-3.5 text-primary" /> Copied!</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy</>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="bg-primary hover:bg-primary/90 text-xs gap-1.5 ml-auto"
              >
                <Download className="h-3.5 w-3.5" />
                Download .{fmt.ext}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}