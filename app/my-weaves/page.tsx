'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchWeave } from '@/lib/api'
import { getMyWeaveIds, removeMyWeaveId } from '@/lib/my-weaves'
import type { Weave } from '@/lib/types'

export default function MyWeavesPage() {
  const [weaves, setWeaves] = useState<Weave[]>([])
  const [loading, setLoading] = useState(true)

  const loadWeaves = async () => {
    const ids = getMyWeaveIds()
    if (ids.length === 0) { setLoading(false); return }
    const results = await Promise.allSettled(ids.map((id) => fetchWeave(id)))
    const loaded: Weave[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') loaded.push(r.value)
      else removeMyWeaveId(ids[i])
    })
    setWeaves(loaded)
    setLoading(false)
  }

  useEffect(() => { loadWeaves() }, [])

  const handleDelete = (id: string) => {
    removeMyWeaveId(id)
    setWeaves((prev) => prev.filter((w) => w.id !== id))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">My Weaves</h1>
            <p className="text-muted-foreground text-sm">Knowledge maps you've created</p>
          </div>
          <Link href="/create">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="h-4 w-4" /> New Weave
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />)}
          </div>
        ) : weaves.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-xl">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">No weaves yet</p>
            <p className="text-muted-foreground text-sm mb-6">Create your first AI-generated knowledge map</p>
            <Link href="/create"><Button className="bg-primary hover:bg-primary/90">Create a Weave</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weaves.map((weave) => {
              const communityNodes = weave.nodes.filter((n) => !n.is_scaffold).length
              const totalNodes = weave.nodes.length
              const scaffolds = weave.nodes.filter((n) => n.is_scaffold).length
              const pct = totalNodes > 0 ? Math.round((communityNodes / totalNodes) * 100) : 0
              return (
                <Card key={weave.id} className="p-5 bg-card border-border flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground leading-tight">{weave.topic}</h3>
                    <button
                      onClick={() => handleDelete(weave.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove from My Weaves"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{communityNodes} / {totalNodes} community nodes</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">{totalNodes} nodes</Badge>
                      {scaffolds > 0 && (
                        <Badge className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          {scaffolds} open
                        </Badge>
                      )}
                    </div>
                    <Link href={`/weave/${weave.id}`}>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">Open</Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
