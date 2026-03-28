'use client'

import { useState } from 'react'
import { Check, Copy, Gift, Star, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLumens } from '@/lib/lumens-context'
import { cn } from '@/lib/utils'

interface RedeemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Reward {
  id: string
  name: string
  partner: string
  cost: number
  description: string
  icon: string
}

const REWARDS: Reward[] = [
  {
    id: 'coursera-1',
    name: '1 Month Free',
    partner: 'Coursera',
    cost: 500,
    description: 'Full access to all courses',
    icon: '📚',
  },
  {
    id: 'datacamp-1',
    name: 'Pro Subscription',
    partner: 'DataCamp',
    cost: 750,
    description: '3 months of DataCamp Pro',
    icon: '📊',
  },
  {
    id: 'aws-1',
    name: '$50 Credits',
    partner: 'AWS',
    cost: 1000,
    description: 'AWS service credits',
    icon: '☁️',
  },
  {
    id: 'notion-1',
    name: 'Plus Plan',
    partner: 'Notion',
    cost: 400,
    description: '6 months of Notion Plus',
    icon: '📝',
  },
  {
    id: 'github-1',
    name: 'Pro for 1 Year',
    partner: 'GitHub',
    cost: 1200,
    description: 'GitHub Pro subscription',
    icon: '🐙',
  },
]

export function RedeemDialog({ open, onOpenChange }: RedeemDialogProps) {
  const { balance, spend } = useLumens()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSelectReward = (reward: Reward) => {
    if (balance >= reward.cost) {
      setSelectedReward(reward)
      setStep(2)
    }
  }

  const handleConfirm = async () => {
    if (selectedReward) {
      const ok = await spend(selectedReward.cost)
      if (ok) {
        const code = `PEERLY-${selectedReward.partner.toUpperCase().slice(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        setRedeemCode(code)
        setStep(3)
      }
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(redeemCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setStep(1)
      setSelectedReward(null)
      setRedeemCode('')
      setCopied(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Gift className="h-5 w-5 text-primary" />
            {step === 1 && 'Redeem Lumens'}
            {step === 2 && 'Confirm Redemption'}
            {step === 3 && 'Success!'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                step >= s ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Balance display */}
        <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-muted/50">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {balance.toLocaleString()} LM available
          </span>
        </div>

        {/* Step 1: Select Reward */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-2">
            {REWARDS.map((reward) => {
              const canAfford = balance >= reward.cost
              return (
                <button
                  key={reward.id}
                  onClick={() => handleSelectReward(reward)}
                  disabled={!canAfford}
                  className={cn(
                    'flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                    canAfford
                      ? 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                      : 'border-border/50 opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-xl mb-1">{reward.icon}</span>
                  <span className="text-sm font-medium text-foreground">{reward.name}</span>
                  <span className="text-xs text-muted-foreground">{reward.partner}</span>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs font-semibold text-primary">{reward.cost} LM</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && selectedReward && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{selectedReward.icon}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{selectedReward.name}</h4>
                  <p className="text-xs text-muted-foreground">{selectedReward.partner}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedReward.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="text-foreground">{balance.toLocaleString()} LM</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Cost</span>
                <span>-{selectedReward.cost} LM</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-foreground">New Balance</span>
                <span className="text-primary">{(balance - selectedReward.cost).toLocaleString()} LM</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleConfirm}>
                Confirm
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && selectedReward && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">Redemption Complete</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Your {selectedReward.partner} reward is ready
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-2">Your redemption code</p>
              <div className="flex items-center justify-between gap-2 rounded bg-background px-3 py-2">
                <code className="text-sm font-mono text-primary">{redeemCode}</code>
                <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2">
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
