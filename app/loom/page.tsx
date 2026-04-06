'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/peerly/navbar'
import { importWeave } from '@/lib/api'

function isURL(s: string) {
  try { new URL(s); return true } catch { return false }
}

function LoomImporter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // supports both ?url= (from extension) and ?q= (from manual query)
  const url = searchParams.get('url') ?? ''
  const query = searchParams.get('q') ?? ''
  const input = url || query
  const [error, setError] = useState('')

  useEffect(() => {
    if (!input) { setError('No URL or query provided. Use /loom?url=https://... or /loom?q=your+topic'); return }
    const asQuery = !isURL(input)
    importWeave(input, asQuery)
      .then((weave) => router.replace(`/weave/${weave.id}`))
      .catch((e) => setError(e.message ?? 'Import failed'))
  }, [input, router])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-3">
          {error ? (
            <>
              <p className="text-destructive font-medium">{error}</p>
              <button onClick={() => router.push('/explore')} className="text-sm text-primary underline underline-offset-2">
                Back to Explore
              </button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm">
                Weaving from <span className="text-foreground font-mono text-xs">{input}</span>…
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoomPage() {
  return (
    <Suspense>
      <LoomImporter />
    </Suspense>
  )
}
