'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from './supabase'

interface LumensContextType {
  balance: number
  spend: (amount: number) => Promise<boolean>
  earn: (amount: number) => Promise<void>
  recentChange: { amount: number; type: 'spend' | 'earn' } | null
  clearRecentChange: () => void
}

const LumensContext = createContext<LumensContextType | null>(null)

export function LumensProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const username = user?.id ?? null

  const [balance, setBalance] = useState(0)
  const [recentChange, setRecentChange] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)

  useEffect(() => {
    if (!username) return

    const clerkDisplayName = user?.username ?? user?.firstName ?? null

    const fetchBalance = () =>
      supabase.from('lumens').select('balance').eq('username', username).single()
        .then(({ data }) => { if (data) setBalance(data.balance) })

    supabase.from('users')
      .upsert({ username }, { onConflict: 'username', ignoreDuplicates: true })
      .then(() => {
        if (clerkDisplayName) {
          supabase.from('users').update({ display_name: clerkDisplayName })
            .eq('username', username).is('display_name', null).then(() => {})
        }
        // Chain lumens upsert AFTER users row exists (FK constraint)
        supabase.from('lumens')
          .upsert({ username, balance: 0 }, { onConflict: 'username', ignoreDuplicates: true })
          .then(() => fetchBalance())
      })

    const channel = supabase
      .channel(`lumens:${username}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lumens', filter: `username=eq.${username}` },
        (payload) => setBalance((payload.new as any).balance)
      )
      .subscribe()

    // Refetch on tab focus as fallback if Realtime misses an update
    window.addEventListener('focus', fetchBalance)
    return () => { supabase.removeChannel(channel); window.removeEventListener('focus', fetchBalance) }
  }, [username])

  const refetchBalance = useCallback(async (expectedMin?: number) => {
    if (!username) return
    // Retry up to 5 times (2s total) waiting for the DB write to be visible
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400))
      const { data } = await supabase.from('lumens').select('balance').eq('username', username).single()
      if (data) {
        setBalance(data.balance)
        if (expectedMin === undefined || data.balance >= expectedMin) break
      }
    }
  }, [username])

  const earn = useCallback(async (amount: number) => {
    if (!username) return
    await refetchBalance(balance + amount)
    setRecentChange({ amount, type: 'earn' })
  }, [username, balance, refetchBalance])

  const spend = useCallback(async (amount: number): Promise<boolean> => {
    if (!username) return false
    const res = await fetch('/api/lumens/spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) return false
    await refetchBalance(balance - amount)
    setRecentChange({ amount, type: 'spend' })
    return true
  }, [username, balance, refetchBalance])

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
