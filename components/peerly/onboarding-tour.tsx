'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, ListTree, Users, Star, Award, Plus, MessageSquare, Lightbulb, BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OnboardingTourProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
  onIntentSelect?: (intent: 'learn' | 'contribute' | 'explore' | 'class') => void
}

// Intent options for onboarding
export const ONBOARDING_INTENTS = {
  learn: { label: 'I want to learn', icon: BookOpen, description: 'Explore structured knowledge' },
  contribute: { label: 'I want to contribute', icon: Plus, description: 'Share your expertise' },
  explore: { label: 'Just exploring', icon: Sparkles, description: 'Browse around' },
  class: { label: 'Here with class', icon: Users, description: 'Join a class group' },
} as const

// Condensed tour steps - focused on action, not reading
const TOUR_STEPS = [
  {
    title: 'Welcome to Peerly',
    description: 'Your first meaningful action is 30 seconds away',
    icon: Sparkles,
    content: null, // Special step - renders intent selection
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Knowledge as Weaves',
    description: 'Structured learning paths',
    icon: ListTree,
    content: (
      <div className="space-y-3">
        <p className="text-foreground">
          Topics exist as <strong>"weaves"</strong> — structured networks of knowledge nodes.
          Move from basics to advanced concepts linearly.
        </p>
        <p className="text-sm text-muted-foreground">
          Tip: Click any weave card on the Explore page to start learning!
        </p>
      </div>
    ),
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'How Contributions Work',
    description: 'AI scaffolds → Human knowledge',
    icon: Users,
    content: (
      <div className="space-y-3">
        <p className="text-foreground">
          AI generates <strong>scaffolds</strong> (placeholder nodes) for concepts that need explanations.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/5">
            <p className="text-xs font-semibold text-yellow-500">⚡ AI Draft</p>
            <p className="text-[10px] text-muted-foreground mt-1">Click UNLOCK to replace with your knowledge</p>
          </div>
          <div className="flex-1 p-3 rounded-lg border border-green-500/50 bg-green-500/5">
            <p className="text-xs font-semibold text-green-500">✓ Community</p>
            <p className="text-[10px] text-muted-foreground mt-1">Human-contributed explanations</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Every contribution earns <strong>Lumens</strong> — redeemable for premium tools!
        </p>
      </div>
    ),
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
]

export function OnboardingTour({ open, onOpenChange, onComplete, onIntentSelect }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const [selectedIntent, setSelectedIntent] = useState<'learn' | 'contribute' | 'explore' | 'class' | null>(null)

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= TOUR_STEPS.length - 1) {
        setIsAutoScrolling(false)
        return prev
      }
      return prev + 1
    })
  }, [])

  const goToPrev = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev))
    setIsAutoScrolling(false)
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    setIsAutoScrolling(false)
  }, [])

  const handleComplete = useCallback(() => {
    setIsAutoScrolling(false)
    onOpenChange(false)
    if (selectedIntent && onIntentSelect) {
      onIntentSelect(selectedIntent)
    }
    onComplete?.()
  }, [onOpenChange, onComplete, selectedIntent, onIntentSelect])

  const handleIntentSelect = useCallback((intent: 'learn' | 'contribute' | 'explore' | 'class') => {
    setSelectedIntent(intent)
    // Auto-advance after selection
    setTimeout(() => goToNext(), 300)
  }, [goToNext])

  // Auto-scroll functionality (skip for first step which requires interaction)
  useEffect(() => {
    if (!open || !isAutoScrolling || currentStep === 0) return

    const timer = setInterval(() => {
      goToNext()
    }, 6000)

    return () => clearInterval(timer)
  }, [open, isAutoScrolling, currentStep, goToNext])

  // Reset when tour opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setIsAutoScrolling(false) // Don't auto-scroll on welcome screen
      setSelectedIntent(null)
    }
  }, [open])

  const current = TOUR_STEPS[currentStep]
  const Icon = current.icon

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleComplete()
      } else {
        onOpenChange(true)
      }
    }}>
      <DialogContent className="bg-card border-border max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${current.bgColor}`}>
                <Icon className={`h-6 w-6 ${current.color}`} />
              </div>
              <div>
                <DialogTitle className="text-xl">{current.title}</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {current.description}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="bg-background rounded-lg p-6 mb-6 border border-border">
            {currentStep === 0 ? (
              // Intent selection screen
              <div className="space-y-4">
                <p className="text-foreground">
                  Peerly is where humans & AI learn in synergy. Instead of AI conversations that fade away,
                  you'll build structured knowledge that lasts.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(ONBOARDING_INTENTS) as [keyof typeof ONBOARDING_INTENTS, typeof ONBOARDING_INTENTS[keyof typeof ONBOARDING_INTENTS]][]).map(([key, intent]) => {
                    const IntentIcon = intent.icon
                    return (
                      <button
                        key={key}
                        onClick={() => handleIntentSelect(key)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedIntent === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <IntentIcon className="h-5 w-5 text-primary mb-2" />
                        <p className="text-sm font-semibold text-foreground">{intent.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{intent.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              current.content
            )}
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`transition-all rounded-full ${
                  index === currentStep
                    ? 'w-8 h-2 bg-primary'
                    : 'w-2 h-2 bg-muted hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={goToPrev}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep === TOUR_STEPS.length - 1 ? (
                <Button onClick={handleComplete} className="gap-1">
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={goToNext} className="gap-1" disabled={currentStep === 0 && !selectedIntent}>
                  {currentStep === 0 ? 'Select an option' : 'Next'}
                  {currentStep !== 0 && <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
