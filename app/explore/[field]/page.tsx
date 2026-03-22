'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, BookOpen } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchAllWeaves } from '@/lib/api'
import { FIELDS, matchesField } from '@/lib/fields'
import type { Weave } from '@/lib/types'

function slugToLabel(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function FieldPage() {
  const params = useParams()
  const router = useRouter()
  const fieldSlug = params?.field as string
  const fieldLabel = slugToLabel(fieldSlug ?? '')

  const [allWeaves, setAllWeaves] = useState<Weave[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllWeaves()
      .then(setAllWeaves)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fieldData = FIELDS.find(f => f.name.toLowerCase() === fieldLabel.toLowerCase())

  const fieldWeaves = allWeaves.filter((w) =>
    matchesField(w, fieldLabel, fieldData?.keywords ?? [])
  )

  const filtered = search.trim()
    ? fieldWeaves.filter((w) => w.topic.toLowerCase().includes(search.toLowerCase()))
    : fieldWeaves

  function highlight(text: string, query: string) {
    if (!query.trim()) return <>{text}</>
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        {/* Back + header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Explore
        </button>

        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">Field</p>
            <h1 className="text-4xl font-bold text-foreground">{fieldLabel}</h1>
            {!loading && (
              <p className="text-muted-foreground text-sm mt-2">
                {fieldWeaves.length} weave{fieldWeaves.length !== 1 ? 's' : ''} in this field
              </p>
            )}
          </div>
          <Link href={`/create?field=${encodeURIComponent(fieldLabel)}`}>            
               <Button className="bg-primary hover:bg-primary/90">
                         + New Weave
               </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={`Search in ${fieldLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card border-border"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">
              {fieldWeaves.length === 0
                ? `No weaves in ${fieldLabel} yet`
                : `No weaves match "${search}"`}
            </p>
            <p className="text-muted-foreground text-sm mb-6">Be the first to create one</p>
            <Link href={`/create?field=${encodeURIComponent(fieldLabel)}`}>
              <Button className="bg-primary hover:bg-primary/90">Create a Weave</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((weave) => {
              const communityNodes = weave.nodes.filter((n) => !n.is_scaffold).length
              const totalNodes = weave.nodes.length
              const scaffolds = weave.nodes.filter((n) => n.is_scaffold).length
              const pct = totalNodes > 0 ? Math.round((communityNodes / totalNodes) * 100) : 0

              return (
                <Card key={weave.id} className="p-5 bg-card border-border hover:border-primary/50 transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                      {highlight(weave.topic, search)}
                    </h3>
                    <Badge variant="outline" className="shrink-0 text-xs">{totalNodes} nodes</Badge>
                  </div>

                  <div className="flex gap-3 text-xs text-muted-foreground mb-4">
                    <span className="text-primary font-medium">{communityNodes} community</span>
                    <span>·</span>
                    <span>{scaffolds} open scaffolds</span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Community fill</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Preview: first 3 node titles */}
                  {weave.nodes.slice(0, 3).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {weave.nodes.slice(0, 3).map((n) => (
                        <span
                          key={n.id}
                          className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                        >
                          {n.title}
                        </span>
                      ))}
                      {weave.nodes.length > 3 && (
                        <span className="text-xs px-2 py-0.5 text-muted-foreground/60">
                          +{weave.nodes.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <Link href={`/weave/${weave.id}`}>
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                      Open Weave →
                    </Button>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}