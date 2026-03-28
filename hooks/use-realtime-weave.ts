import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Weave } from '@/lib/types'

export function useRealtimeWeave(weaveId: string, initial: Weave | null) {
  const [weave, setWeave] = useState<Weave | null>(initial)

  useEffect(() => {
    if (initial) setWeave(initial)
  }, [initial])

  useEffect(() => {
    if (!weaveId) return
    const channel = supabase
      .channel(`weave:${weaveId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'weaves', filter: `id=eq.${weaveId}` },
        (payload) => setWeave(payload.new as Weave)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weaveId])

  return weave
}
