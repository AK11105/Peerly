'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PricingTable } from '@clerk/nextjs'
import { Navbar } from '@/components/peerly/navbar'
import { toast } from 'sonner'
import { shadcn } from '@clerk/ui/themes'

export default function PricingPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Welcome to Pro!', { description: 'Your subscription is now active.' })
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Simple Pricing</h1>
          <p className="text-muted-foreground">Unlock the full Peerly experience</p>
        </div>
        <PricingTable
          for="user"
          newSubscriptionRedirectUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/pricing?success=1`}
          appearance={{
            theme: shadcn
          }}
        />
      </main>
    </div>
  )
}
