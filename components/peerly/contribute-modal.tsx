'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import remarkBreaks from "remark-breaks"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { MediaUpload } from '@/components/peerly/media-upload'
import type { WeaveNode } from '@/lib/types'
import { contributeToScaffold, ProRequiredError } from '@/lib/api'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ContributeModalProps {
  node: WeaveNode | null
  weaveId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

export function ContributeModal({ node, weaveId, open, onOpenChange, onRefresh }: ContributeModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [mode, setMode] = useState<'write' | 'preview'>('write')

  const [links, setLinks] = useState<string[]>([''])
  const [attachments, setAttachments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { earn } = useLumens()
  const currentUser = useCurrentUser()

  const updateLink = (i: number, val: string) => {
    setLinks(prev => prev.map((l, idx) => idx === i ? val : l))
  }

  const handleSubmit = async () => {
    if (!node || !description.trim()) {
      toast.error('Please fill in the description field.')
      return
    }

    const validLinks = links.map(l => l.trim()).filter(Boolean)

    for (const l of validLinks) {
      try {
        new URL(l)
      } catch {
        toast.error(`Invalid URL: ${l}`)
        return
      }
    }

    let fullDescription = description.trim()

    // ✅ FIXED: Proper markdown links
    if (validLinks.length) {
      fullDescription += '\n\n### References\n' +
        validLinks.map(l => `- [${l}](${l})`).join('\n')
    }

    // ✅ FIXED: Proper markdown images for attachments
    if (attachments.length) {
      fullDescription += '\n\n### Attachments\n' +
        attachments.map(url => `![attachment](${url})`).join('\n')
    }

    setIsLoading(true)

    try {
      await contributeToScaffold(weaveId, {
        weave_id: weaveId,
        scaffold_node_id: node.id,
        title: title.trim() || node.title.trim(),
        description: fullDescription,
        contributed_by: currentUser?.displayName ?? 'anonymous',
        user_id: currentUser?.id,
        attachments,
      })

      setTitle('')
      setDescription('')
      setLinks([''])
      setAttachments([])

      onOpenChange(false)
      onRefresh()

      toast.info('Submitted for review — admin will approve shortly.', {
        style: { borderLeft: '3px solid #6366F1' }
      })

    } catch (err: any) {
      if (err instanceof ProRequiredError) {
        toast.info('Pro plan required.', {
          description: 'Paid plans are coming soon. Stay tuned!',
          action: {
            label: 'See Plans',
            onClick: () => window.location.href = '/pricing'
          }
        })
      } else {
        toast.error(err?.message ?? 'Something went wrong.', {
          style: { borderLeft: '3px solid #EF4444' }
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Contribute to Scaffold
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Replace the AI draft with your own knowledge contribution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">

          {/* Node Info */}
          {node && (
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Scaffold node</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {node.title}
              </p>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Your title
            </label>
            <Input
              placeholder={node?.title ?? 'Title'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Description Input */}
         <div className="flex flex-col gap-2">
  <label className="text-xs font-medium text-muted-foreground">
    Your explanation
  </label>

  {/* 🔥 TOGGLE BAR */}
  <div className="flex items-center gap-1 bg-muted rounded-md p-1 w-fit">
    <button
      onClick={() => setMode('write')}
      className={`px-3 py-1 text-xs rounded ${
        mode === 'write'
          ? 'bg-background text-foreground'
          : 'text-muted-foreground'
      }`}
    >
      Write
    </button>

    <button
      onClick={() => setMode('preview')}
      className={`px-3 py-1 text-xs rounded ${
        mode === 'preview'
          ? 'bg-background text-foreground'
          : 'text-muted-foreground'
      }`}
    >
      Preview
    </button>
  </div>

  {/* 🔥 CONTENT AREA */}
  <div className="border border-border rounded-md bg-background">

    {mode === 'write' ? (
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={8}
        className="resize-none border-none focus-visible:ring-0 bg-transparent font-mono text-sm overflow-y-auto"
        placeholder="Write your explanation... (Markdown supported)"
        spellCheck={false}
        style={{ whiteSpace: "pre-wrap" }}

        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault()
            const start = e.currentTarget.selectionStart
            const end = e.currentTarget.selectionEnd

            const newValue =
              description.substring(0, start) +
              "  " +
              description.substring(end)

            setDescription(newValue)

            setTimeout(() => {
              e.currentTarget.selectionStart =
                e.currentTarget.selectionEnd = start + 2
            }, 0)
          }
        }}
      />
    ) : (
      <div className="p-3 max-h-[300px] overflow-y-auto">
<div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap">          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
          >
            {description || "Nothing to preview..."}
          </ReactMarkdown>
        </div>
      </div>
    )}
  </div>

  <p className="text-xs text-muted-foreground">
    Supports Markdown (bold, lists, code, links)
  </p>
</div>

          {/* Links */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Links (optional)
            </label>

            {links.map((link, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  placeholder="https://..."
                  value={link}
                  onChange={e => updateLink(i, e.target.value)}
                />

                {links.length > 1 && (
                  <button
                    onClick={() =>
                      setLinks(prev => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setLinks(prev => [...prev, ''])}
              className="flex items-center gap-1 text-xs text-primary"
            >
              <Plus className="h-3 w-3" /> Add another link
            </button>
          </div>

          {/* Upload */}
          <MediaUpload
            onUploaded={urls => setAttachments(prev => [...prev, ...urls])}
            existingUrls={attachments}
            onRemove={url =>
              setAttachments(prev => prev.filter(u => u !== url))
            }
          />

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving…' : 'Submit Contribution'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}