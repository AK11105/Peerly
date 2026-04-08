'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, ListTree, Users, Star, Award,  Plus, MessageSquare, Lightbulb } from 'lucide-react'
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
}


const TOUR_STEPS = [
  {
    title: 'Welcome to Loom!',
    description: 'Where humans & AI learn in synergy',
    icon: Sparkles,
    content:
      'Loom is not just another AI chatbot. Instead of conversations that fade away, Loom helps you build structured, evolving knowledge. Here, AI guides the process while humans create, refine, and validate what truly matters.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Knowledge as Weaves',
    description: 'Structured, not scattered',
    icon: Lightbulb,
    content:
      'Every topic on Loom exists as a "weave" — a structured network of knowledge nodes. Instead of jumping between chats, you move linearly from basics to advanced ideas, making learning easier to follow, revisit, and truly retain. You can browse weaves organized by field - from Computer Science to Psychology.', 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    title: 'Mind Maps',
    description: 'Linear but actually complex',
    icon: ListTree,
    content:
      'You can view the weave in both linear and tree-like mindmap fashion allowing anybody to get to the frontier of any topic without worrying about the underlying complexity of the topic.', 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'AI as a Guide, Not the Source',
    description: 'You build. AI organizes.',
    icon: Plus,
    content:
      'When you create a weave, AI generates scaffolds — temporary structures highlighting what should be learned. But the real knowledge comes from people. AI only organizes, rearranges, detects gaps (missing topics) and helps maintain logical flow.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Contribute to Knowledge',
    description: 'Turn scaffolds into real learning',
    icon: Users,
    content:
      'Replace AI-generated scaffolds with actual insights, explanations, and resources. Every contribution strengthens the weave and helps others learn better. The more you contribute, the stronger the collective intelligence becomes.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Learn by Building',
    description: 'Retention through participation',
    icon: Star,
    content:
      'Unlike passive learning, Loom ensures you remember what you learn. By contributing, refining, and structuring knowledge yourself, you naturally build deeper understanding that sticks over time.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: 'Community-Validated Knowledge',
    description: 'Not AI-approved — human-approved',
    icon: MessageSquare,
    content:
      'Content on Loom is shaped and validated by the community. Discussions, contributions, and feedback ensure that knowledge evolves with real perspectives — not just AI-generated responses.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Reputation & Visibility',
    description: 'Earn trust through contribution',
    icon: Award,
    content:
      'Your reputation grows as you contribute meaningful knowledge. High-quality contributions increase your visibility (Rep), helping your questions get answered faster and your voice carry more weight in the community.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },

  {
    title: 'Earn Lumens',
    description: 'Get rewarded for your contributions',
    icon: Star,
    content: 'Every contribution earns Lumens. Use them to redeem premium subscriptions for productivity tools like Grammarly or Notion. The more you contribute, the more you earn!',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: 'Join the Community',
    description: 'Connect with fellow learners',
    icon: MessageSquare,
    content: 'Visit the Community Hub to discuss ideas, ask questions, and collaborate. Loom is built on the belief that knowledge grows when shared.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },

]

export function OnboardingTour({ open, onOpenChange, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)

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
    onComplete?.()
  }, [onOpenChange, onComplete])

  // Auto-scroll functionality
  useEffect(() => {
    if (!open || !isAutoScrolling) return

    const timer = setInterval(() => {
      goToNext()
    }, 5000) // 5 seconds per slide

    return () => clearInterval(timer)
  }, [open, isAutoScrolling, goToNext])

  // Reset when tour opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setIsAutoScrolling(true)
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
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={() => handleComplete()}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button> */}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="bg-background rounded-lg p-6 mb-6 border border-border">
            <p className="text-foreground text-base leading-relaxed">
              {current.content}
            </p>
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
              <Button
                variant="outline"
                onClick={goToPrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {currentStep === TOUR_STEPS.length - 1 ? (
                <Button onClick={handleComplete} className="gap-1">
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={goToNext} className="gap-1">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
