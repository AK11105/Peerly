'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/peerly/navbar'
import { AddNodePanel } from '@/components/peerly/add-node-panel'
import { WeaveViewer } from '@/components/peerly/weave-viewer'
import { CommunityHub } from '@/components/peerly/community-hub'
import { ContributeModal } from '@/components/peerly/contribute-modal'
import { fetchWeave } from '@/lib/api'
import type { Weave, WeaveNode } from '@/lib/types'

export default function WeavePage() {
  const params = useParams()
  const router = useRouter()
  const weaveId = params?.id as string

  const [weave, setWeave] = useState<Weave | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScaffold, setSelectedScaffold] = useState<WeaveNode | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadWeave = useCallback(async () => {
    if (!weaveId) return
    try {
      const data = await fetchWeave(weaveId)
      setWeave(data)
      setError(null)
    } catch {
      setError('Could not load this weave. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [weaveId])

  useEffect(() => {
    loadWeave()
  }, [loadWeave])

  const handleUnlock = (node: WeaveNode) => {
    setSelectedScaffold(node)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Loading weave…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !weave) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">{error ?? 'Weave not found'}</p>
            <button
              onClick={() => router.push('/explore')}
              className="text-sm text-primary underline underline-offset-2"
            >
              Browse all weaves
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar showWeaveTitle={weave.topic} />

      {/* Full-height content area, no overflow on the row itself */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Add Node FAB — fixed width, no shrink */}
        <div className="shrink-0 w-14 flex justify-center pt-8 pl-2">
          <AddNodePanel weaveId={weave.id} onRefresh={loadWeave} />
        </div>

        {/* Center: Weave content — takes all remaining space, scrolls independently */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 py-8">
          <WeaveViewer weave={weave} onUnlock={handleUnlock} />
        </main>

        {/* Right: Community Hub sidebar — fixed width, scrolls independently */}
        <aside className="shrink-0 w-72 xl:w-80 border-l border-border overflow-y-auto px-4 py-8">
          <CommunityHub />
        </aside>

      </div>

      <ContributeModal
        node={selectedScaffold}
        weaveId={weave.id}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onRefresh={loadWeave}
      />
    </div>
  )
}