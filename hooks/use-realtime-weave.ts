import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchWeave } from '@/lib/api'
import type { Weave } from '@/lib/types'

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
        () => reload()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weaveId, reload])

  return weave
}
