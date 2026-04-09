import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Weave, WeaveNode } from '@/lib/types'
import { fetchWeave } from '@/lib/api'

export function useRealtimeWeave(weaveId: string, initial: Weave | null) {
  const [weave, setWeave] = useState<Weave | null>(initial)

  useEffect(() => {
    if (initial) setWeave(initial)
  }, [initial])

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchWeave(weaveId)
      setWeave(fresh)
    } catch {}
  }, [weaveId])

  useEffect(() => {
    if (!weaveId) return
    // Listen for any insert/update/delete on the nodes table for this weave
    const channel = supabase
      .channel(`nodes:${weaveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nodes', filter: `weave_id=eq.${weaveId}` },
        (payload) => {
          setWeave(prev => {
            if (!prev) return prev
            const node = payload.new as WeaveNode

            if (payload.eventType === 'INSERT') {
              // Only show approved nodes
              if ((node as any).status !== 'approved') return prev
              return { ...prev, nodes: [...prev.nodes, node].sort((a, b) => a.depth - b.depth || a.difficulty - b.difficulty) }
            }
            if (payload.eventType === 'UPDATE') {
              // If a node was approved, add it; if rejected/pending, remove it
              if ((node as any).status === 'approved') {
                const exists = prev.nodes.some(n => n.id === node.id)
                if (exists) return { ...prev, nodes: prev.nodes.map(n => n.id === node.id ? node : n) }
                return { ...prev, nodes: [...prev.nodes, node].sort((a, b) => a.depth - b.depth || a.difficulty - b.difficulty) }
              } else {
                return { ...prev, nodes: prev.nodes.filter(n => n.id !== node.id) }
              }
            }
            if (payload.eventType === 'DELETE') {
              return { ...prev, nodes: prev.nodes.filter(n => n.id !== (payload.old as WeaveNode).id) }
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weaveId, reload])

  return weave
}
