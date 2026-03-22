'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { generateWeave, fetchAllWeaves } from '@/lib/api'
import { addMyWeaveId } from '@/lib/my-weaves'

const FIELDS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'Economics',
  'Language Learning',
  'History',
  'Design',
]

export default function CreateWeavePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [newField, setNewField] = useState('')
  const [admins, setAdmins] = useState<string[]>([])
  const [adminInput, setAdminInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleAddAdmin = () => {
    if (adminInput.trim()) {
      setAdmins([...admins, adminInput])
      setAdminInput('')
    }
  }

  const handleRemoveAdmin = (index: number) => {
    setAdmins(admins.filter((_, i) => i !== index))
  }

  const handleGenerateWeave = async () => {
    if (!topic.trim() || !selectedField.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 30, 95))
    }, 200)

    try {
      const weave = await generateWeave(topic, [] , selectedField || undefined)

      clearInterval(interval)
      setProgress(100)

      addMyWeaveId(weave.id)
      toast.success('Weave created!')

      setTimeout(() => {
        router.push(`/weave/${weave.id}`)
      }, 500)
    } catch {
      // Next.js proxy may have timed out (Ollama is slow on first load)
      // but the backend may have actually completed — poll for it
      clearInterval(interval)
      setProgress(98)

      const pollToast = toast.loading('Ollama is still working… checking for result', {
        style: { borderLeft: '3px solid #F59E0B' },
      })

      let found = false
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 10_000)) // wait 10s between polls
        try {
          const weaves = await fetchAllWeaves()
          // Find the most recently created weave matching our topic
          const match = weaves.find((w) =>
            w.topic.toLowerCase().trim() === topic.toLowerCase().trim()
          )
          if (match) {
            found = true
            toast.dismiss(pollToast)
            setProgress(100)
            addMyWeaveId(match.id)
            toast.success('Weave created!', { style: { borderLeft: '3px solid #22C55E' } })
            setTimeout(() => router.push(`/weave/${match.id}`), 500)
            break
          }
        } catch {
          // backend not reachable yet, keep polling
        }
      }

      if (!found) {
        toast.dismiss(pollToast)
        setLoading(false)
        toast.error('Could not confirm weave creation — check backend logs')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-12 lg:px-8">
        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                    s < step
                      ? 'bg-primary text-primary-foreground'
                      : s === step
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s < step ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      s < step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Topic</span>
            <span>Field</span>
            <span>Admins</span>
          </div>
        </div>

        {/* Step 1: Topic */}
        {step === 1 && (
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-2">What is your Weave about?</h2>
            <p className="text-muted-foreground mb-6">
              The AI will generate an initial structured learning map for this topic
            </p>
            <Input
              placeholder="e.g. Machine Learning, Organic Chemistry, Roman History"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-11 mb-6 bg-background border-border"
              onKeyDown={(e) => e.key === 'Enter' && topic.trim() && setStep(2)}
            />
            <Button
              onClick={() => setStep(2)}
              disabled={!topic.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              Continue <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 2: Field */}
        {step === 2 && (
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Choose a Field</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FIELDS.map((field) => (
                <button
                  key={field}
                  onClick={() => setSelectedField(field)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedField === field
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {field}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-sm text-muted-foreground block mb-2">Or create a new field</label>
              <Input
                placeholder="Enter field name..."
                value={newField}
                onChange={(e) => {
                  setNewField(e.target.value)
                  if (e.target.value.trim()) setSelectedField(e.target.value)
                }}
                className="h-10 bg-background border-border"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 border-border"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedField.trim()}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Admins */}
        {step === 3 && (
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-2">Add Admins to your Weave</h2>
            <p className="text-xs text-muted-foreground mb-6">You are auto-added as the first admin</p>

            <div className="mb-6">
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Enter username or email"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                  className="h-10 bg-background border-border flex-1"
                />
                <Button
                  onClick={handleAddAdmin}
                  variant="outline"
                  className="border-border"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {/* Current user - cannot remove */}
                <Badge className="bg-primary/20 text-primary pl-3 py-1.5 flex items-center gap-2">
                  <span>You (demo_user)</span>
                </Badge>

                {/* Added admins */}
                {admins.map((admin, i) => (
                  <Badge
                    key={i}
                    className="bg-background border border-border text-foreground pl-3 py-1.5 flex items-center gap-2"
                  >
                    <span>{admin}</span>
                    <button
                      onClick={() => handleRemoveAdmin(i)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {progress < 98
                      ? 'Ollama is building your Weave…'
                      : 'Almost there — verifying result…'}
                  </p>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-border"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateWeave}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Generate Weave
                </Button>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}
