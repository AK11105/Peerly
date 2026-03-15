'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLumens } from '@/lib/lumens-context'
import { fetchWeave } from '@/lib/api'
import { getMyWeaveIds } from '@/lib/my-weaves'
import type { Weave } from '@/lib/types'

// Rep is computed dynamically from real contributions below

const REDEEM_OPTIONS = [
  { name: 'Grammarly Pro (1 month)', cost: 500 },
  { name: 'Notion Pro (1 month)', cost: 400 },
]

export default function ProfilePage() {
  const { balance, spend } = useLumens()
  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [myWeaves, setMyWeaves] = useState<Weave[]>([])
  const [repByField] = useState([
    { field: 'Computer Science', rep: 0, maxRep: 1000 },
    { field: 'Mathematics', rep: 0, maxRep: 1000 },
    { field: 'Physics', rep: 0, maxRep: 1000 },
    { field: 'Design', rep: 0, maxRep: 1000 },
  ])

  useEffect(() => {
    const ids = getMyWeaveIds()
    Promise.allSettled(ids.map((id) => fetchWeave(id))).then((results) => {
      setMyWeaves(results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<Weave>).value))
    })
  }, [])

  const handleRedeem = (cost: number, name: string) => {
    const ok = spend(cost)
    if (!ok) {
      alert('Not enough Lumens!')
      return
    }
    setShowRedeemDialog(false)
    alert(`Redeemed: ${name}`)
  }

  // Flatten all community nodes the user contributed across their weaves
  const contributions = myWeaves.flatMap((w) =>
    w.nodes
      .filter((n) => !n.is_scaffold && n.contributed_by === 'demo_user')
      .map((n) => ({ weave: w.topic, node: n.title, status: 'Contributed' }))
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        {/* Profile Header */}
        <Card className="p-8 mb-8 bg-card border-border">
          <div className="flex items-start gap-6 mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              D
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">demo_user</h1>
              <p className="text-sm text-muted-foreground mb-4">
                {myWeaves.length} weaves created &middot; {contributions.length} contributions
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-primary/20 text-primary text-sm py-1.5 px-3">
                  Rep Score: {contributions.length * 50}
                </Badge>
                <Badge variant="outline" className="text-sm py-1.5 px-3 border-border">
                  Global Rank: #142
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Rep by Field */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Rep by Field</h2>
          <div className="space-y-4">
            {repByField.map((item) => (
              <Card key={item.field} className="p-4 bg-card border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{item.field}</span>
                  <span className="text-sm text-primary font-semibold">{item.rep}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(item.rep / item.maxRep) * 100}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Lumens Wallet — live balance from context */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Lumens Wallet</h2>
            <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">Redeem Lumens</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Redeem your Lumens</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {REDEEM_OPTIONS.map((option) => (
                    <Card
                      key={option.name}
                      onClick={() => handleRedeem(option.cost, option.name)}
                      className="p-4 bg-background border-border cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{option.name}</span>
                        <Badge className="bg-primary/20 text-primary">{option.cost} LM</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-6 mb-6 bg-card border-border">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-6 w-6 fill-primary text-primary" />
              <span className="text-3xl font-bold text-foreground">
                {balance.toLocaleString()} LM
              </span>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Earn more by contributing nodes and replacing scaffolds
            </p>
          </Card>
        </div>

        {/* My Weaves summary */}
        {myWeaves.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">My Weaves</h2>
            <div className="space-y-3">
              {myWeaves.map((w) => {
                const community = w.nodes.filter((n) => !n.is_scaffold).length
                const total = w.nodes.length
                return (
                  <Card key={w.id} className="p-4 bg-card border-border flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{w.topic}</p>
                      <p className="text-xs text-muted-foreground">{community}/{total} community nodes</p>
                    </div>
                    <Badge variant="outline">{total} nodes</Badge>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Contributions */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">My Contributions</h2>
          {contributions.length === 0 ? (
            <Card className="p-8 bg-card border-border text-center text-muted-foreground">
              No contributions yet — open a weave and add a node to get started.
            </Card>
          ) : (
            <Card className="bg-card border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Weave</TableHead>
                    <TableHead className="text-muted-foreground">Node</TableHead>
                    <TableHead className="text-muted-foreground text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c, i) => (
                    <TableRow key={i} className="border-border hover:bg-background/50">
                      <TableCell className="text-foreground">{c.weave}</TableCell>
                      <TableCell className="text-foreground">{c.node}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-primary/20 text-primary">{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
