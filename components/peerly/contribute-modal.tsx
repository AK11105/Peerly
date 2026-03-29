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
import { contributeToScaffold, ProRequiredError } from '@/lib/api'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'

interface ContributeModalProps {
  node: WeaveNode | null
  weaveId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

export function ContributeModal({
  node,
  weaveId,
  open,
  onOpenChange,
  onRefresh,
}: ContributeModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { earn } = useLumens()
  const currentUser = useCurrentUser()
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')

  const handleSubmit = async () => {
    if (!node) return

    if (!description.trim()) {
      toast.error('Please fill in the description field.')
      return
    }
    setIsLoading(true)
    try {
        if (link.trim()) {
            try {
                const url = new URL(link.trim())
                if (url.protocol !== 'https:') {
                setLinkError('Only https:// links are allowed')
                return
                }
            } catch {
                setLinkError('Please enter a valid URL')
                return
            }
        }


      await contributeToScaffold(weaveId, {
        weave_id: weaveId,
        scaffold_node_id: node.id,
        title: title.trim() || node.title.trim(),
        description: link.trim() ? `${description.trim()}\n\nReference: ${link.trim()}` : description.trim(),
        contributed_by: currentUser?.displayName ?? 'anonymous',
        user_id: currentUser?.id,
      })

      await earn(50)
      setTitle('')
      setDescription('')
      onOpenChange(false)
      onRefresh()
      setLink('')
      setLinkError('')

      toast.success('+50 LM earned! Contribution saved.', {
        style: { borderLeft: '3px solid #22C55E' },
      })

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Contribute to Scaffold</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Replace the AI draft with your own knowledge contribution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {node && (
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Scaffold node</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{node.title}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Your title</label>
            <Input
              placeholder={node?.title ?? 'Title'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Your explanation</label>
            <Textarea
              placeholder="Write a clear, detailed explanation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-muted-foreground">
    Link <span className="text-muted-foreground/50">(optional)</span>
  </label>
  <Input
    placeholder="https://..."
    value={link}
    onChange={(e) => { setLink(e.target.value); setLinkError('') }}
    onBlur={() => {
      if (!link.trim()) return
      try {
        const url = new URL(link.trim())
        if (url.protocol !== 'https:') setLinkError('Only https:// links are allowed')
      } catch {
        setLinkError('Please enter a valid URL')
      }
    }}
    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
  />
  {linkError && <p className="text-xs text-destructive">{linkError}</p>}
</div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? 'Saving…' : 'Submit Contribution'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
