import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

const TOUR_DISMISSED_KEY = 'onboarding_tour_dismissed'

/**
 * Hook to manage onboarding tour state for users.
 * - Shows tour once per session for users who haven't permanently completed it
 * - Uses session storage to prevent re-showing after dismissal within the same session
 * - Provides function to mark tour as permanently seen
 */
export function useOnboarding() {
  const { user, isLoaded } = useUser()
  const [shouldShowTour, setShouldShowTour] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setIsLoading(false)
      return
    }

    // Check session storage - if user dismissed tour this session, don't show again
    const dismissedInSession = sessionStorage.getItem(TOUR_DISMISSED_KEY)
    if (dismissedInSession === 'true') {
      setIsLoading(false)
      return
    }

    // Only show tour if user has never permanently completed it (has_seen_tour = false)
    supabase
      .from('users')
      .select('has_seen_tour')
      .eq('username', user.id)
      .single()
      .then(({ data, error }) => {
        console.log('[Onboarding] Query result:', { data, error })
        if (error || !data) {
          // User doesn't exist yet in Supabase - trigger sync and show tour for new users
          console.log('[Onboarding] User not in Supabase yet, triggering sync')
          fetch('/api/sync-user', { method: 'POST' }).catch(() => {})
          // Show tour for new users who don't have a record yet
          setShouldShowTour(true)
        } else {
          // Show tour if has_seen_tour is false (user hasn't permanently completed it)
          const shouldShow = data.has_seen_tour === false
          console.log('[Onboarding] has_seen_tour =', data.has_seen_tour, ', shouldShow =', shouldShow)
          setShouldShowTour(shouldShow)
        }
        setIsLoading(false)
      })
  }, [user?.id, isLoaded])

  const markTourAsSeen = useCallback(async () => {
    if (!user?.id) return

    // Mark as dismissed in this session
    sessionStorage.setItem(TOUR_DISMISSED_KEY, 'true')

    try {
      await supabase
        .from('users')
        .update({ has_seen_tour: true })
        .eq('username', user.id)
      setShouldShowTour(false)
    } catch (error) {
      console.error('Failed to mark tour as seen:', error)
    }
  }, [user?.id])

  return { shouldShowTour, isLoading, markTourAsSeen }
}
