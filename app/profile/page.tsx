'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLumens } from '@/lib/lumens-context'
import { supabase } from '@/lib/supabase'
import { getMyWeaveIds } from '@/lib/my-weaves'
import { fetchWeave } from '@/lib/api'
import type { Weave } from '@/lib/types'

const DEMO_USER = 'demo_user'

const REDEEM_OPTIONS = [
  { name: 'Grammarly Pro (1 month)', cost: 500 },
  { name: 'Notion Pro (1 month)', cost: 400 },
]

export default function ProfilePage() {
  const { balance, spend } = useLumens()
  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [myWeaves, setMyWeaves] = useState<Weave[]>([])
  const [contributions, setContributions] = useState<{ weave: string; node: string; type: string }[]>([])
  const [rank, setRank] = useState<number | null>(null)

  useEffect(() => {
    // Load weaves
    getMyWeaveIds().then(async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => fetchWeave(id)))
      setMyWeaves(results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<Weave>).value))
    })

    // Load contributions from DB
    supabase
      .from('contributions')
      .select('weave_id, node_id, type, weaves(topic)')
      .eq('username', DEMO_USER)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setContributions(data.map((c: any) => ({
            weave: c.weaves?.topic ?? c.weave_id,
            node: c.node_id,
            type: c.type === 'scaffold_fill' ? 'Scaffold Fill' : c.type === 'add_node' ? 'Added Node' : 'Perspective',
          })))
        }
      })

    // Load rank from leaderboard
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: any[]) => {
        const idx = data.findIndex((r: any) => r.username === DEMO_USER)
        if (idx !== -1) setRank(idx + 1)
      })
      .catch(() => {})
  }, [])

  const handleRedeem = async (cost: number, name: string) => {
    const ok = await spend(cost)
    if (!ok) { alert('Not enough Lumens!'); return }
    setShowRedeemDialog(false)
    alert(`Redeemed: ${name}`)
  }

  const repScore = contributions.length * 50 + Math.floor(balance / 10)

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
              <h1 className="text-3xl font-bold text-foreground mb-2">{DEMO_USER}</h1>
              <p className="text-sm text-muted-foreground mb-4">
                {myWeaves.length} weaves created · {contributions.length} contributions
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-primary/20 text-primary text-sm py-1.5 px-3">Rep Score: {repScore}</Badge>
                <Badge variant="outline" className="text-sm py-1.5 px-3 border-border">{rank ? `Global Rank: #${rank}` : 'Global Rank: —'}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Lumens Wallet */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Lumens Wallet</h2>
            <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">Redeem Lumens</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Redeem your Lumens</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {REDEEM_OPTIONS.map((option) => (
                    <Card key={option.name} onClick={() => handleRedeem(option.cost, option.name)}
                      className="p-4 bg-background border-border cursor-pointer hover:border-primary transition-colors">
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
              <span className="text-3xl font-bold text-foreground">{balance.toLocaleString()} LM</span>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Earn more by contributing nodes and replacing scaffolds
            </p>
          </Card>
        </div>

        {/* My Weaves */}
        {myWeaves.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">My Weaves</h2>
            <div className="space-y-3">
              {myWeaves.map((w) => {
                const community = w.nodes.filter((n) => !n.is_scaffold).length
                return (
                  <Card key={w.id} className="p-4 bg-card border-border flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{w.topic}</p>
                      <p className="text-xs text-muted-foreground">{community}/{w.nodes.length} community nodes</p>
                    </div>
                    <Badge variant="outline">{w.nodes.length} nodes</Badge>
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
                    <TableHead className="text-muted-foreground">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c, i) => (
                    <TableRow key={i} className="border-border hover:bg-background/50">
                      <TableCell className="text-foreground">{c.weave}</TableCell>
                      <TableCell><Badge className="bg-primary/20 text-primary">{c.type}</Badge></TableCell>
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
