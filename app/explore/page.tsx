'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { SponsoredCard, SPONSORED_ADS } from '@/components/peerly/sponsored-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchAllWeaves } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { FIELDS, matchesField } from '@/lib/fields'
import type { Weave } from '@/lib/types'

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-primary/30 text-primary rounded px-0.5 not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export default function ExplorePage() {
  const { isSignedIn } = useUser()
  const [weaves, setWeaves] = useState<Weave[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadWeaves = useCallback(() => {
    fetchAllWeaves()
      .then(setWeaves)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadWeaves()
  }, [loadWeaves])

  // Realtime subscription for weave deletions
  useEffect(() => {
    const channel = supabase
      .channel('explore-weaves')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'weaves' },
        ({ old }) => {
          setWeaves((prev) => prev.filter((w) => w.id !== old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const q = search.toLowerCase().trim()

  const matchedFields = useMemo(() =>
    q ? FIELDS.filter((f) => f.name.toLowerCase().includes(q)) : [],
    [q]
  )

  const matchedWeaves = useMemo(() =>
    q ? weaves.filter((w) => w.topic.toLowerCase().includes(q)) : weaves,
    [q, weaves]
  )

  const isSearching = q.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-foreground mb-2">Explore</h1>
              <p className="text-muted-foreground mb-6">Find a Weave. Learn something. Contribute.</p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fields or weaves..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-card border-border text-base"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Live search summary */}
              {isSearching && (
                <p className="text-xs text-muted-foreground mt-2 ml-1">
                  {matchedFields.length + matchedWeaves.length === 0
                    ? `No results for "${search}"`
                    : `${matchedFields.length} field${matchedFields.length !== 1 ? 's' : ''} · ${matchedWeaves.length} weave${matchedWeaves.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {/* Matched Fields (search mode) */}
            {isSearching && matchedFields.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Fields</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchedFields.map((field) => {
                    const Icon = field.icon
                    const count = weaves.filter((w) => matchesField(w, field.name, field.keywords)).length
                    return (
                      <Link key={field.name} href={`/explore/${field.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Card className="p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card border-border flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">
                              <Highlight text={field.name} query={search} />
                            </p>
                            <p className="text-xs text-muted-foreground">{count} Weaves</p>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fields Grid (default mode) */}
            {!isSearching && (
              <div className="mb-14">
                <h2 className="text-2xl font-bold text-foreground mb-6">All Fields</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FIELDS.map((field) => {
                    const Icon = field.icon
                    const count = weaves.filter((w) => matchesField(w, field.name, field.keywords)).length
                    return (
                      <Link key={field.name} href={`/explore/${field.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Card className="p-5 hover:border-primary hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer bg-card border-border">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant="outline" className="text-xs">{count} Weaves</Badge>
                          </div>
                          <h3 className="font-bold text-foreground mb-1">{field.name}</h3>
                          <p className="text-xs text-muted-foreground">Explore collaborative learning maps</p>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Weaves section */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {isSearching ? (
                  <>Weaves matching <span className="text-primary">"{search}"</span></>
                ) : (
                  'All Weaves'
                )}
              </h2>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-44 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : matchedWeaves.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <p className="text-muted-foreground mb-4">
                    {weaves.length === 0 ? 'No weaves yet.' : `No weaves match "${search}".`}
                  </p>
                  <Link href="/create">
                    <Button className="bg-primary hover:bg-primary/90">Create a Weave</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedWeaves.map((weave) => {
                    const communityNodes = weave.nodes.filter((n) => !n.is_scaffold).length
                    const totalNodes = weave.nodes.length
                    const pct = totalNodes > 0 ? Math.round((communityNodes / totalNodes) * 100) : 0
                    return (
                      <Card key={weave.id} className="p-5 bg-card border-border hover:border-primary/50 transition-all group">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                            <Highlight text={weave.topic} query={search} />
                          </h3>
                          <Badge variant="outline" className="shrink-0 text-xs">{totalNodes} nodes</Badge>
                        </div>

                        <div className="space-y-1.5 mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{communityNodes} / {totalNodes} community</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Node preview chips */}
                        {weave.nodes.slice(0, 3).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {weave.nodes.slice(0, 3).map((n) => (
                              <span key={n.id} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                                {n.title}
                              </span>
                            ))}
                            {weave.nodes.length > 3 && (
                              <span className="text-xs text-muted-foreground/60">+{weave.nodes.length - 3}</span>
                            )}
                          </div>
                        )}

                        <Link href={`/weave/${weave.id}`}>
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90">Open Weave →</Button>
                        </Link>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-16 text-center">
              <p className="text-muted-foreground mb-4">Want to create your own weave?</p>
              <Link href="/create">
                <Button size="lg" className="bg-primary hover:bg-primary/90">Create a Weave</Button>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 space-y-4">
              <SponsoredCard ad={SPONSORED_ADS[2]} variant="card" />
              <SponsoredCard ad={SPONSORED_ADS[3]} variant="card" />
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Reach learners worldwide</p>
                <Link href="/advertise">
                  <Button variant="outline" size="sm" className="w-full text-xs">Advertise on Peerly</Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}