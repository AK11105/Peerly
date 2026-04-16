'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MediaUpload } from '@/components/peerly/media-upload'
import { addNode, ProRequiredError } from '@/lib/api'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'

interface AddNodePanelProps {
  weaveId: string
  onRefresh: () => void
}

export function AddNodePanel({ weaveId, onRefresh }: AddNodePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [attachments, setAttachments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { earn } = useLumens()
  const currentUser = useCurrentUser()

  const reset = () => {
    setTitle(''); setDescription(''); setLinks(['']); setAttachments([])
  }

  const updateLink = (i: number, val: string) => setLinks(prev => prev.map((l, idx) => idx === i ? val : l))
  const addLink = () => setLinks(prev => [...prev, ''])
  const removeLink = (i: number) => setLinks(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in both fields.')
      return
    }
    // Validate links
    const validLinks = links.map(l => l.trim()).filter(Boolean)
    for (const l of validLinks) {
      try { new URL(l) } catch { toast.error(`Invalid URL: ${l}`); return }
    }

    // Build description with links + attachments embedded
    let fullDescription = description.trim()
    if (validLinks.length) fullDescription += '\n' + validLinks.map(l => `Reference: ${l}`).join('\n')
    if (attachments.length) fullDescription += `\nAttachments: ${JSON.stringify(attachments)}`

    setIsLoading(true)
    try {
      const data = await addNode(weaveId, {
        title: title.trim(),
        description: fullDescription,
        contributed_by: currentUser?.displayName ?? 'anonymous',
        user_id: currentUser?.id,
      })
      reset()
      setIsExpanded(false)
      onRefresh()
      if (data?.status === 'pending') {
        toast.info('Submitted for review — admin will approve shortly.', {
          style: { borderLeft: '3px solid #6366F1' },
        })
      } else {
        await earn(25)
        toast.success('+25 LM earned — Node added!', { style: { borderLeft: '3px solid #22C55E' } })
      }
    } catch (err: any) {
      if (err instanceof ProRequiredError) {
        toast.info('Pro plan required.', { description: 'Paid plans are coming soon. Stay tuned!', action: { label: 'See Plans', onClick: () => window.location.href = '/pricing' } })
      } else {
        toast.error(err?.message ?? 'Something went wrong. Please try again.', {
          style: { borderLeft: '3px solid #EF4444' },
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => { setIsExpanded(false); reset() }}
        />
      )}

      <div className="relative z-40">
        
<div className="flex flex-col items-center gap-1">
  <span className="text-[9px] font-medium text-muted-foreground tracking-wide uppercase mb-2">
    Node
  </span>

</div>

        <button
          onClick={() => setIsExpanded(true)}
          className={`flex h-11 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-115 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
            isExpanded ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-label="Add node"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          
        </button>

        <div
          className={`absolute left-0 top-0 w-72 origin-top-left transition-all duration-300 ease-out ${
            isExpanded ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
          }`}
        >
          <div className="rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">New Node</span>
              <button
                onClick={() => { setIsExpanded(false); reset() }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all duration-300 hover:bg-secondary/80 hover:text-foreground"
              >
                <Plus className="h-4 w-4 rotate-45" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Input
                placeholder="Node title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
              />

              {/* Multi-link inputs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Links <span className="text-muted-foreground/50">(optional)</span></label>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => updateLink(i, e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-8"
                    />
                    {links.length > 1 && (
                      <button onClick={() => removeLink(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addLink}
                  className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                >
                  <Plus className="h-3 w-3" /> Add another link
                </button>
              </div>

              {/* Attachments */}
              <MediaUpload
                onUploaded={urls => setAttachments(prev => [...prev, ...urls])}
                existingUrls={attachments}
                onRemove={url => setAttachments(prev => prev.filter(u => u !== url))}
              />

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? 'Checking…' : 'ADD TO WEAVE'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                AI reviews relevance · admin approves before going live
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
