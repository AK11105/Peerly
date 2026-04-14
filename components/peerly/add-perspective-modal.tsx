'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { MediaUpload } from '@/components/peerly/media-upload'
import type { WeaveNode } from '@/lib/types'
import { ProRequiredError } from '@/lib/api'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'

import MDEditor from "@uiw/react-md-editor"

interface AddPerspectiveModalProps {
  node: WeaveNode | null
  weaveId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

export function AddPerspectiveModal({ node, weaveId, open, onOpenChange, onRefresh }: AddPerspectiveModalProps) {
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [attachments, setAttachments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { earn } = useLumens()
  const currentUser = useCurrentUser()

  const updateLink = (i: number, val: string) => setLinks(prev => prev.map((l, idx) => idx === i ? val : l))

  const handleClose = () => {
    onOpenChange(false)
    setDescription(''); setLinks(['']); setAttachments([])
  }

  const handleSubmit = async () => {
    if (!node || !description.trim()) { toast.error('Please write your explanation.'); return }

    const validLinks = links.map(l => l.trim()).filter(Boolean)
    for (const l of validLinks) {
      try { new URL(l) } catch { toast.error(`Invalid URL: ${l}`); return }
    }

    let fullDescription = description.trim()
    if (validLinks.length) fullDescription += '\n' + validLinks.map(l => `Reference: ${l}`).join('\n')
    if (attachments.length) fullDescription += `\nAttachments: ${JSON.stringify(attachments)}`

    setIsLoading(true)
    try {
      const res = await fetch(`/api/weaves/${weaveId}/nodes/${node.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weave_id: weaveId, title: '',
          description: fullDescription,
          contributed_by: currentUser?.displayName ?? 'anonymous',
          user_id: currentUser?.id,
          attachments,
        }),
      })
      if (res.status === 403) throw new ProRequiredError()
      if (!res.ok) throw new Error('Failed')
      earn(25); handleClose(); onRefresh()
      toast.success('+25 LM earned! Your perspective was added.', { style: { borderLeft: '3px solid #22C55E' } })
    } catch (err) {
      if (err instanceof ProRequiredError) {
        toast.info('Pro plan required.', { description: 'Paid plans are coming soon. Stay tuned!', action: { label: 'See Plans', onClick: () => window.location.href = '/pricing' } })
      } else {
        toast.error('Something went wrong. Please try again.', { style: { borderLeft: '3px solid #EF4444' } })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Your Perspective</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add your own explanation alongside the existing one. Multiple views make learning richer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {node && (
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Node</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{node.title}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Your explanation <span className="text-destructive">*</span></label>
            <Textarea placeholder="Write your own take on this concept..." value={description}
              onChange={e => setDescription(e.target.value)} rows={5}
              className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Links <span className="text-muted-foreground/60">(optional)</span></label>
            {links.map((link, i) => (
              <div key={i} className="flex gap-1.5">
                <Input placeholder="https://..." value={link} onChange={e => updateLink(i, e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
                {links.length > 1 && (
                  <button onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setLinks(prev => [...prev, ''])} className="flex items-center gap-1 text-xs text-primary hover:underline w-fit">
              <Plus className="h-3 w-3" /> Add another link
            </button>
          </div>

          <MediaUpload
            onUploaded={urls => setAttachments(prev => [...prev, ...urls])}
            existingUrls={attachments}
            onRemove={url => setAttachments(prev => prev.filter(u => u !== url))}
          />

          <div className="flex items-center gap-3 pt-1">
            <Button variant="outline" onClick={handleClose} className="flex-1 border-border text-muted-foreground hover:text-foreground">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading ? 'Saving…' : 'Submit · +25 LM'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
