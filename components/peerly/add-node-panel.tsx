'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { addNode } from '@/lib/api'
import { useLumens } from '@/lib/lumens-context'

interface AddNodePanelProps {
  weaveId: string
  onRefresh: () => void
}

export function AddNodePanel({ weaveId, onRefresh }: AddNodePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { earn } = useLumens()

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in both fields.')
      return
    }
    setIsLoading(true)
    try {
      const data = await addNode(weaveId, {
        title: title.trim(),
        description: description.trim(),
        contributed_by: 'demo_user',
      })
      await earn(25)
      setTitle('')
      setDescription('')
      setIsExpanded(false)
      onRefresh()
      toast.success('+25 LM earned — Node added!', {
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
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => { setIsExpanded(false); setTitle(''); setDescription('') }}
        />
      )}

      <div className="relative z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
            isExpanded ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-label="Add node"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div
          className={`absolute left-0 top-0 w-64 origin-top-left transition-all duration-300 ease-out ${
            isExpanded ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
          }`}
        >
          <div className="rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">New Node</span>
              <button
                onClick={() => { setIsExpanded(false); setTitle(''); setDescription('') }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all duration-300 hover:bg-secondary/80 hover:text-foreground"
                aria-label="Close"
              >
                <Plus
                  className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-45' : 'rotate-0'}`}
                  strokeWidth={2.5}
                />
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
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? 'Adding…' : 'ADD TO WEAVE'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                AI auto-inserts scaffolds for missing prereqs
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
