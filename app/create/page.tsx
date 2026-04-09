'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { generateWeave, ProRequiredError } from '@/lib/api'
import { addMyWeaveId } from '@/lib/my-weaves'
import { FIELDS } from '@/lib/fields'
import { useUser } from '@clerk/nextjs'
import { useCurrentUser } from '@/hooks/use-current-user'

const FIELD_NAMES = FIELDS.map((f) => f.name)

function CreateWeaveForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const username = user?.id
  const currentUser = useCurrentUser()
  const preselectedField = searchParams.get('field') ?? ''

  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [selectedField, setSelectedField] = useState(preselectedField)
  const [newField, setNewField] = useState('')
  const [admins, setAdmins] = useState<string[]>([])
  const [adminInput, setAdminInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [includeScaffolds, setIncludeScaffolds] = useState(true)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFieldDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Only skip step 2 if field was pre-selected from URL param
  const hasField = !!preselectedField
  const totalSteps = hasField ? 2 : 3
  const stepLabels = hasField ? ['Topic', 'Admins'] : ['Topic', 'Field', 'Admins']

  const goNext = () => {
    if (step === 1 && hasField) {
      setStep(3)
    } else {
      setStep((s) => s + 1)
    }
  }

  const goBack = () => {
    if (step === 3 && hasField) {
      setStep(1)
    } else {
      setStep((s) => s - 1)
    }
  }

  const visibleStep = hasField && step === 3 ? 2 : step

  const handleAddAdmin = () => {
    if (adminInput.trim()) {
      setAdmins([...admins, adminInput.trim()])
      setAdminInput('')
    }
  }

  const handleRemoveAdmin = (index: number) => {
    setAdmins(admins.filter((_, i) => i !== index))
  }

  const handleGenerateWeave = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    setLoading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 30, 95))
    }, 200)

    try {
      const weave = await generateWeave(topic, [], selectedField || undefined, includeScaffolds)
      clearInterval(interval)
      setProgress(100)
      await addMyWeaveId(username!, weave.id)
      // Add any extra admins the user specified
      if (admins.length > 0) {
        await Promise.all(admins.map((a) =>
          fetch(`/api/weaves/${weave.id}/admins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: a }),
          })
        ))
      }
      toast.success('Weave created!')
      setTimeout(() => router.push(`/weave/${weave.id}`), 500)
    } catch (err) {
      clearInterval(interval)
      setLoading(false)
      setProgress(0)
      if (err instanceof ProRequiredError) {
        toast.info('Pro plan required.', { description: 'Paid plans are coming soon. Stay tuned!', action: { label: 'See Plans', onClick: () => router.push('/pricing') } })
      } else {
        toast.error('Failed to generate weave. Please try again.')
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
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const s = idx + 1
              const isComplete = visibleStep > s
              const isActive = visibleStep === s
              return (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                      isComplete
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : s}
                  </div>
                  {s < totalSteps && (
                    <div className={`flex-1 h-1 mx-2 transition-all ${isComplete ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              )
            })}
          </div>

        <div className="flex text-xs text-muted-foreground mt-2">
  <span className="w-10 text-center">{stepLabels[0]}</span>
  {stepLabels.slice(1).map((label) => (
    <span key={label} className="flex-1 text-center">{label}</span>
  ))}
</div>

          {/* Field badge — shown when a field is selected, with X to clear and dropdown to change */}
          {selectedField && (
            <div className="mt-5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Field:</span>

              <div className="relative" ref={dropdownRef}>
                {/* Badge with change button and clear button */}
                <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-1 py-1">
                  <span className="text-xs font-medium text-primary">{selectedField}</span>

                  {/* Change dropdown trigger */}
                  <button
                    onClick={() => setFieldDropdownOpen((o) => !o)}
                    className="flex items-center justify-center rounded-full p-0.5 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors ml-1"
                    title="Change field"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${fieldDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Clear / X button */}
                  <button
                    onClick={() => {
                      setSelectedField('')
                      setFieldDropdownOpen(false)
                    }}
                    className="flex items-center justify-center rounded-full p-0.5 text-primary/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove field"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Dropdown */}
                {fieldDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {[...(!FIELD_NAMES.includes(selectedField) && selectedField ? [selectedField] : []), ...FIELD_NAMES].map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedField(name)
                            setFieldDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                            selectedField === name
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          {name}
                          {selectedField === name && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
              onKeyDown={(e) => e.key === 'Enter' && topic.trim() && goNext()}
            />

            {/* Scaffold toggle */}
<div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 mb-6">
  <div>
    <p className="text-sm font-medium text-foreground">Include AI Scaffolds</p>
    <p className="text-xs text-muted-foreground mt-0.5">
      AI drafts placeholder nodes for concepts not yet contributed
    </p>
  </div>
  <button
    onClick={() => setIncludeScaffolds((v) => !v)}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
      includeScaffolds ? 'bg-primary' : 'bg-muted'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
        includeScaffolds ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
</div>

            <Button
              onClick={goNext}
              disabled={!topic.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              Continue <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 2: Field selection */}
        {step === 2 && (
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Choose a Field</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FIELD_NAMES.map((field) => (
                <button
                  key={field}
                  onClick={() => {setSelectedField(field); setStep(3) }}
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
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newField.trim()) {
                    setSelectedField(newField.trim())
                    setStep(3)
                  }
                }}
                className="h-10 bg-background border-border"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 border-border">
                Back
              </Button>
              <Button
                onClick={() => {
                  if (newField.trim() && !selectedField.trim()) setSelectedField(newField.trim())
                  goNext()
                }}
                disabled={!selectedField.trim() && !newField.trim()}
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
                <Button onClick={handleAddAdmin} variant="outline" className="border-border">
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Badge className="bg-primary/20 text-primary pl-3 py-1.5 flex items-center gap-2">
                  <span>You ({currentUser?.displayName ?? username})</span>
                </Badge>
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {'AI is building your Weave…'}
                </div>
                {[100, 90, 95, 80, 88, 75, 92].map((w, i) => (
                  <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1 border-border">
                  Back
                </Button>
                <Button onClick={handleGenerateWeave} className="flex-1 bg-primary hover:bg-primary/90">
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

export default function CreateWeavePage() {
  return (
    <Suspense>
      <CreateWeaveForm />
    </Suspense>
  )
}