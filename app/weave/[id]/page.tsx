// app\weave\[id]\page.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { AddNodePanel } from '@/components/peerly/add-node-panel'
import { WeaveViewer } from '@/components/peerly/weave-viewer'
import { CommunityHub } from '@/components/peerly/community-hub'
import { ContributeModal } from '@/components/peerly/contribute-modal'
import { fetchWeave } from '@/lib/api'
import { useRealtimeWeave } from '@/hooks/use-realtime-weave'
import type { Weave, WeaveNode } from '@/lib/types'


const MIN_WIDTH = 280
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320

export default function WeavePage() {

  const [showMobileCommunity, setShowMobileCommunity] = useState(false)


  const params = useParams()
  const router = useRouter()
  const weaveId = params?.id as string

  const [fetchedWeave, setFetchedWeave] = useState<Weave | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const weave = useRealtimeWeave(weaveId, fetchedWeave)
  const [selectedScaffold, setSelectedScaffold] = useState<WeaveNode | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  const loadWeave = useCallback(async () => {
    if (!weaveId) return
    try {
      const data = await fetchWeave(weaveId)
      setFetchedWeave(data)
      setError(null)
    } catch {
      setError('Could not load this weave.')
    } finally {
      setLoading(false)
    }
  }, [weaveId])

  useEffect(() => { loadWeave() }, [loadWeave])

  // Keyboard shortcut: Cmd/Ctrl + B toggles the community sidebar 
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      setSidebarOpen(o => !o)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])

  // Drag-to-resize logic
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX.current - e.clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

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
            <button onClick={() => router.push('/explore')} className="text-sm text-primary underline underline-offset-2">
              Browse all weaves
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar showWeaveTitle={weave.topic} />

      <div className="flex flex-1 min-h-0">

        {/* FAB column */}
        <div className="shrink-0 w-10 md:w-14 flex justify-center pt-4 md:pt-8 pl-1 md:pl-2 border-r border-border/30">
          <AddNodePanel weaveId={weave.id} onRefresh={loadWeave} />
        </div>

        {/* Center: weave content */}
        <main className="flex-1 min-w-0 overflow-y-auto px-3 md:px-6 py-4 md:py-8 relative">

          <WeaveViewer weave={weave} onUnlock={handleUnlock} onRefresh={loadWeave}/>

          {/* Toggle button — floats at the right edge of main, always visible */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Close community sidebar [ Ctrl/CMD + B ] ' : 'Open community sidebar [ Ctrl/CMD + B ]'}
            className={`
              hidden md:flex
              fixed top-1/2 -translate-y-1/2 z-30
              flex items-center justify-center
              h-24 w-10 rounded-l-md
              border border-r-0 border-border/60
              bg-[#111] hover:bg-secondary
              text-muted-foreground hover:text-primary
              transition-all duration-200
              shadow-lg
            `}
            style={{
              right: sidebarOpen ? sidebarWidth : 0,
              transition: 'right 0.25s ease, background 0.15s',
            }}
          >
            <ChevronRight
              className="   hidden md:flex h-3.5 w-3.5 transition-transform duration-200"
              style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </button>

          <button
  onClick={() => setShowMobileCommunity(v => !v)}
  className="md:hidden fixed bottom-6 right-4 z-30 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
>
  <MessageSquare className="h-4 w-4" />
  Community
</button>
        </main>

        {/* Right: resizable community sidebar */}
<aside
  className={`border-l border-border/40 overflow-hidden relative flex
    ${showMobileCommunity 
      ? 'fixed inset-0 top-14 z-40 w-full md:relative md:inset-auto' 
      : 'hidden md:flex'}
  `}
  style={{
    width: showMobileCommunity ? undefined : sidebarOpen ? sidebarWidth : 0,
    minWidth: (!showMobileCommunity && sidebarOpen) ? MIN_WIDTH : undefined,
    transition: isResizing.current ? 'none' : 'width 0.25s ease',
  }}
>
          {/* Drag handle — sits on the left edge of the sidebar */}
          {sidebarOpen && (
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute left-0 top-0 bottom-0 z-20 w-1 cursor-col-resize group"
            >
              {/* Visual pip that appears on hover */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-1 rounded-full bg-border/0 group-hover:bg-primary/60 transition-colors duration-150" />
            </div>
          )}

          {/* The actual hub — full width/height of the aside */}
          <div className="flex-1 overflow-hidden">
            <CommunityHub weaveId={weave.id} weaveName={weave.topic} />
          </div>
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