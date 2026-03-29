'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Browse all weaves',
      'Community read access',
      'Leaderboard visibility',
      'Basic profile',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: 'per month',
    highlight: true,
    features: [
      'Everything in Free',
      'Create AI-powered weaves',
      'Contribute nodes & scaffolds',
      'Add perspectives',
      'Earn & redeem Lumens',
      'Community posting',
    ],
  },
]

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/plan')
      .then(r => r.json())
      .then(d => setCurrentPlan(d.plan ?? 'free'))
      .catch(() => setCurrentPlan('free'))
  }, [])

  const handleUpgrade = () => {
    toast.info('Payments coming soon!', { description: 'We\'re working on bringing payments to your region. Stay tuned.' })
  }

  const handleManage = () => {
    toast.info('Billing portal coming soon!', { description: 'Subscription management will be available once payments are set up.' })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Simple Pricing</h1>
          <p className="text-muted-foreground">Unlock the full Peerly experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id
            return (
              <Card key={plan.id} className={`p-8 bg-card border-border flex flex-col ${plan.highlight ? 'border-primary ring-1 ring-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <div className="flex gap-2">
                    {plan.highlight && <Badge className="bg-primary/20 text-primary">Popular</Badge>}
                    {isCurrent && <Badge variant="outline">Current</Badge>}
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2 text-sm">/ {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {plan.id === 'pro' && (
                  <Button
                    onClick={isCurrent ? handleManage : handleUpgrade}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isCurrent ? 'Manage Plan' : 'Upgrade to Pro — Coming Soon'}
                  </Button>
                )}
                {plan.id === 'free' && (
                  <Button variant="outline" disabled className="w-full">
                    {isCurrent ? 'Current Plan' : 'Downgrade'}
                  </Button>
                )}
              </Card>
            )
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Payment integration coming soon.
        </p>
      </main>
    </div>
  )
}
