'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import type { WeaveNode } from '@/lib/types'
import { useLumens } from '@/lib/lumens-context'

interface AddPerspectiveModalProps {
  node: WeaveNode | null
  weaveId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

async function submitPerspective(
  weaveId: string,
  nodeId: string,
  description: string,
  link: string,
  contributedBy: string
) {
  const fullDescription = link.trim()
    ? `${description.trim()}\nReference: ${link.trim()}`
    : description.trim()

  const res = await fetch(`/api/weaves/${weaveId}/nodes/${nodeId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weave_id: weaveId,
      title: '',           // not used for perspectives — backend ignores it
      description: fullDescription,
      contributed_by: contributedBy,
    }),
  })
  if (!res.ok) throw new Error('Failed to add perspective')
  return res.json()
}

export function AddPerspectiveModal({
  node,
  weaveId,
  open,
  onOpenChange,
  onRefresh,
}: AddPerspectiveModalProps) {
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { earn } = useLumens()

  const validateLink = (value: string) => {
    if (!value.trim()) { setLinkError(''); return true }
    try { new URL(value); setLinkError(''); return true }
    catch { setLinkError('Enter a valid URL (e.g. https://example.com)'); return false }
  }

  const handleClose = () => {
    onOpenChange(false)
    setDescription('')
    setLink('')
    setLinkError('')
  }

  const handleSubmit = async () => {
    if (!node) return
    if (!description.trim()) {
      toast.error('Please write your explanation.')
      return
    }
    if (!validateLink(link)) return

    setIsLoading(true)
    try {
      await submitPerspective(weaveId, node.id, description, link, 'demo_user')
      earn(25)
      handleClose()
      onRefresh()
      toast.success('+25 LM earned! Your perspective was added.', {
        style: { borderLeft: '3px solid #22C55E' },
      })
    } catch {
      toast.error('Something went wrong. Please try again.', {
        style: { borderLeft: '3px solid #EF4444' },
      })
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
            <label className="text-xs font-medium text-muted-foreground">
              Your explanation <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Write your own take on this concept..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Link <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => { setLink(e.target.value); if (linkError) validateLink(e.target.value) }}
              onBlur={() => validateLink(link)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            {linkError && <p className="text-xs text-destructive">{linkError}</p>}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? 'Saving…' : 'Submit · +25 LM'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}