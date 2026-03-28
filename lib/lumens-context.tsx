'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { supabase } from './supabase'

const DEMO_USER = 'demo_user'

interface LumensContextType {
  balance: number
  spend: (amount: number) => Promise<boolean>
  earn: (amount: number) => Promise<void>
  recentChange: { amount: number; type: 'spend' | 'earn' } | null
  clearRecentChange: () => void
}

const LumensContext = createContext<LumensContextType | null>(null)

export function LumensProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0)
  const [recentChange, setRecentChange] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)

  // Load balance on mount + subscribe to realtime changes
  useEffect(() => {
    supabase.rpc('ensure_user', { p_username: DEMO_USER })
    supabase.from('lumens').select('balance').eq('username', DEMO_USER).single()
      .then(({ data }) => { if (data) setBalance(data.balance) })

    const channel = supabase
      .channel('lumens:demo_user')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lumens', filter: `username=eq.${DEMO_USER}` },
        (payload) => setBalance((payload.new as any).balance)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const earn = useCallback(async (amount: number) => {
    const { data } = await supabase.rpc('earn_lumens', { p_username: DEMO_USER, p_amount: amount })
    if (data != null) setBalance(data)
    setRecentChange({ amount, type: 'earn' })
  }, [])

  const spend = useCallback(async (amount: number): Promise<boolean> => {
    const { data, error } = await supabase.rpc('spend_lumens', { p_username: DEMO_USER, p_amount: amount })
    if (error) return false
    if (data != null) setBalance(data)
    setRecentChange({ amount, type: 'spend' })
    return true
  }, [])

  const clearRecentChange = useCallback(() => setRecentChange(null), [])

  return (
    <LumensContext.Provider value={{ balance, spend, earn, recentChange, clearRecentChange }}>
      {children}
    </LumensContext.Provider>
  )
}

export function useLumens() {
  const ctx = useContext(LumensContext)
  if (!ctx) throw new Error('useLumens must be used within LumensProvider')
  return ctx
}
