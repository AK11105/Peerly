'use client'

import { useState } from 'react'
import { Download, Copy, Check, X, Share2, FileCode2, Network, Globe } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toGraphvizDot, toCytoscapeJson, toEmbedHtml, downloadText, slugify } from '@/lib/export-weave'
import type { Weave } from '@/lib/types'

interface ExportModalProps {
  weave: Weave
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = 'graphviz' | 'cytoscape' | 'html'

const FORMATS: {
  id: ExportFormat
  icon: typeof FileCode2
  label: string
  ext: string
  mime: string
  description: string
  badge: string
  badgeColor: string
}[] = [
  {
    id: 'graphviz',
    icon: Network,
    label: 'Graphviz DOT',
    ext: 'dot',
    mime: 'text/plain',
    description: 'Open with Graphviz, OmniGraffle, or paste into graphviz.org/online.',
    badge: '.dot',
    badgeColor: 'rgba(139,92,246,0.15)',
  },
  {
    id: 'cytoscape',
    icon: FileCode2,
    label: 'Cytoscape JSON',
    ext: 'json',
    mime: 'application/json',
    description: 'Import into Cytoscape Desktop or use with cytoscape.js in your own app.',
    badge: '.json',
    badgeColor: 'rgba(59,130,246,0.15)',
  },
  {
    id: 'html',
    icon: Globe,
    label: 'Embeddable HTML',
    ext: 'html',
    mime: 'text/html',
    description: 'Self-contained interactive file. Open in a browser or embed with <iframe>.',
    badge: '.html',
    badgeColor: 'rgba(34,197,94,0.15)',
  },
]

function getContent(weave: Weave, format: ExportFormat): string {
  switch (format) {
    case 'graphviz': return toGraphvizDot(weave)
    case 'cytoscape': return JSON.stringify(toCytoscapeJson(weave), null, 2)
    case 'html': return toEmbedHtml(weave)
  }
}

export function ExportModal({ weave, open, onOpenChange }: ExportModalProps) {
  const [selected, setSelected] = useState<ExportFormat>('html')
  const [copied, setCopied] = useState(false)
  const [previewing, setPreviewing] = useState(false)

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

  const handlePreview = () => {
    if (selected !== 'html') return
    const content = toEmbedHtml(weave)
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const previewContent = getContent(weave, selected)
  const previewLines = previewContent.split('\n').slice(0, 18).join('\n')
  const totalLines = previewContent.split('\n').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-base">Export Weave</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{weave.topic}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left: format picker */}
          <div className="w-56 shrink-0 border-r border-border flex flex-col py-4 px-3 gap-1 bg-background/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">
              Format
            </p>
            {FORMATS.map((f) => {
              const Icon = f.icon
              const isActive = selected === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-all border ${
                    isActive
                      ? 'border-primary/40 bg-primary/8 text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-foreground' : ''}`}>
                      {f.label}
                    </p>
                    <span
                      className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: isActive ? f.badgeColor : 'rgba(255,255,255,0.05)',
                        color: isActive ? (f.id === 'graphviz' ? '#A78BFA' : f.id === 'cytoscape' ? '#60A5FA' : '#22C55E') : '#6B7280',
                      }}
                    >
                      {f.badge}
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Stats */}
            <div className="mt-auto pt-4 px-2 space-y-1 border-t border-border/50">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Nodes</span>
                <span className="font-semibold text-foreground">{weave.nodes.length}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Community</span>
                <span className="font-semibold text-primary">
                  {weave.nodes.filter((n) => !n.is_scaffold).length}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>AI Drafts</span>
                <span className="font-semibold" style={{ color: '#F59E0B' }}>
                  {weave.nodes.filter((n) => n.is_scaffold).length}
                </span>
              </div>
            </div>
          </div>

          {/* Right: preview + actions */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Description */}
            <div className="px-5 py-3 border-b border-border/50 shrink-0">
              <p className="text-xs text-muted-foreground">{fmt.description}</p>
            </div>

            {/* Code preview */}
            <div className="flex-1 overflow-y-auto bg-[#0A0A0A] m-4 rounded-lg border border-border/50 relative">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-[#111] rounded-t-lg sticky top-0 z-10">
                <span className="text-[10px] font-mono text-muted-foreground">{slug}.{fmt.ext}</span>
                <span className="text-[10px] text-muted-foreground">{totalLines} lines</span>
              </div>
              <pre className="p-4 text-[11px] font-mono text-[#9CA3AF] overflow-x-auto leading-relaxed whitespace-pre">
                {previewLines}
                {totalLines > 18 && (
                  <span className="text-muted-foreground/40">
                    {'\n'}… {totalLines - 18} more lines
                  </span>
                )}
              </pre>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 pt-2 flex items-center gap-2 shrink-0 border-t border-border/50">
              {selected === 'html' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="border-border text-xs gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Preview
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
                Download {fmt.badge}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}