'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useUser } from '@clerk/nextjs'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

declare global {
  interface Window { Razorpay: any }
}

export default function PricingPage() {
  const { user } = useUser()
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [hasPaid, setHasPaid] = useState(false)

  useEffect(() => {
    fetch('/api/user/plan').then(r => r.json()).then(d => {
      setPlan(d.plan)
      setHasPaid(d.has_paid)
    })
  }, [])

  async function switchPlan(newPlan: 'free' | 'pro') {
    await fetch('/api/user/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    setPlan(newPlan)
    toast.success(newPlan === 'pro' ? 'Welcome back to Pro!' : 'Switched to Free plan.')
  }

  async function handleUpgrade() {
    // already paid before — no charge needed
    if (hasPaid) return switchPlan('pro')

    const res = await fetch('/api/razorpay/create-order', { method: 'POST' })
    const { orderId, amount } = await res.json()

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name: 'Peerly',
      description: 'Pro Plan',
      order_id: orderId,
      prefill: {
        name: user?.fullName ?? '',
        email: user?.primaryEmailAddress?.emailAddress ?? '',
      },
      handler: async (response: any) => {
        const verify = await fetch('/api/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        if (verify.ok) {
          setHasPaid(true)
          setPlan('pro')
          toast.success('Welcome to Pro!')
        } else {
          toast.error('Payment verification failed.')
        }
      },
    })
    rzp.open()
  }

  return (
    <div className="min-h-screen bg-background">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Simple Pricing</h1>
          <p className="text-muted-foreground">Unlock the full Peerly experience</p>
        </div>

        {plan === 'pro' ? (
          <div className="mx-auto max-w-sm rounded-xl border border-border p-8 text-center space-y-4">
            <span className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Current Plan</span>
            <h2 className="text-2xl font-bold">Pro ✦</h2>
            <p className="text-sm text-muted-foreground">You have full access to all Pro features.</p>
            <Button variant="outline" className="w-full" onClick={() => switchPlan('free')}>Switch to Free</Button>
          </div>
        ) : (
          <div className="mx-auto max-w-sm rounded-xl border border-border p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Pro</h2>
            {hasPaid ? (
              <p className="text-sm text-muted-foreground">You've already paid — reactivate for free.</p>
            ) : (
              <p className="text-4xl font-bold">₹99 <span className="text-base font-normal text-muted-foreground">one-time</span></p>
            )}
            <ul className="text-sm text-muted-foreground space-y-1 text-left list-disc list-inside">
              <li>Add perspectives to any node</li>
              <li>Contribute new nodes to weaves</li>
              <li>Priority support</li>
            </ul>
            <Button className="w-full" onClick={handleUpgrade} disabled={plan === null}>
              {plan === null ? 'Loading...' : hasPaid ? 'Reactivate Pro' : 'Upgrade to Pro'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
