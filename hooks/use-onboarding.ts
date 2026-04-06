import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

/**
 * Hook to manage onboarding tour state for users.
 * - Returns true if user is new and hasn't seen the tour
 * - Provides function to mark tour as seen
 */
export function useOnboarding() {
  const { user, isLoaded } = useUser()
  const [isNewUser, setIsNewUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setIsLoading(false)
      return
    }

    // Check if user has seen the tour
    supabase
      .from('users')
      .select('has_seen_tour')
      .eq('username', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          // User might not exist yet, treat as new user
          setIsNewUser(true)
        } else if (data?.has_seen_tour === false) {
          setIsNewUser(true)
        } else {
          setIsNewUser(false)
        }
        setIsLoading(false)
      })
  }, [user?.id, isLoaded])

  const markTourAsSeen = useCallback(async () => {
    if (!user?.id) return

    try {
      await supabase
        .from('users')
        .update({ has_seen_tour: true })
        .eq('username', user.id)
      setIsNewUser(false)
    } catch (error) {
      console.error('Failed to mark tour as seen:', error)
    }
  }, [user?.id])

  return { isNewUser, isLoading, markTourAsSeen }
}
