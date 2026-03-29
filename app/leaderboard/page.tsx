'use client'

import { useState, useEffect } from 'react'
import { Crown, Medal } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLumens } from '@/lib/lumens-context'
import { useUser } from '@clerk/nextjs'

const RANK_BADGES: Record<number, { icon: typeof Crown; color: string; bg: string }> = {
  1: { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  2: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  3: { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-600/10' },
}

interface LeaderRow {
  rank: number
  username: string
  displayName: string
  lumens: number
  contributions: number
  scaffolds: number
  rep: number
  isMe?: boolean
}

function LeaderTable({ rows }: { rows: LeaderRow[] }) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-12">Rank</TableHead>
            <TableHead className="text-muted-foreground">User</TableHead>
            <TableHead className="text-muted-foreground text-right">Rep</TableHead>
            <TableHead className="text-muted-foreground text-right">Lumens</TableHead>
            <TableHead className="text-muted-foreground text-right">Contribs</TableHead>
            <TableHead className="text-muted-foreground text-right">Scaffolds</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((user) => {
            const badge = RANK_BADGES[user.rank]
            return (
              <TableRow key={user.username} className={`border-border hover:bg-background/50 ${user.isMe ? 'border-l-2 border-l-primary bg-primary/5' : ''}`}>
                <TableCell className="font-bold w-12">
                  {badge
                    ? <Badge className={`${badge.bg} ${badge.color}`}>{user.rank}</Badge>
                    : <span className="text-foreground">{user.rank}</span>}
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {user.displayName}
                  {user.isMe && <Badge className="ml-2 bg-primary/20 text-primary text-xs">You</Badge>}
                </TableCell>
                <TableCell className="text-foreground text-right font-semibold">{user.rep.toLocaleString()}</TableCell>
                <TableCell className="text-primary text-right font-semibold">{user.lumens.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-right">{user.contributions}</TableCell>
                <TableCell className="text-muted-foreground text-right">{user.scaffolds}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

export default function LeaderboardPage() {
  const { user } = useUser()
  const username = user?.id
  const { balance } = useLumens()
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: any[]) => {
        setRows(data.map((r, i) => ({
          rank: i + 1,
          username: r.username,
          displayName: r.display_name ?? r.username,
          lumens: r.username === username ? balance : Number(r.lumens),
          contributions: Number(r.contributions),
          scaffolds: Number(r.scaffolds),
          rep: Number(r.rep),
          isMe: r.username === username,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [balance, username])

  const top3 = rows.slice(0, 3)
  const me = rows.find(r => r.isMe)
  const thisWeek = rows.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <h1 className="text-4xl font-bold text-foreground mb-12">Leaderboard</h1>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {/* 2nd */}
            <Card className="p-6 bg-card border-border flex flex-col items-center text-center md:mt-8 order-first md:order-1">
              <Badge className="bg-gray-400/20 text-gray-400 text-sm py-1 mb-3"><Medal className="h-3 w-3 mr-1 inline" />2nd Place</Badge>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm mb-3">{top3[1].displayName[0].toUpperCase()}</div>
              <h3 className="font-bold text-foreground mb-1">{top3[1].displayName}</h3>
              <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{top3[1].rep.toLocaleString()}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{top3[1].lumens.toLocaleString()}</span></p>
            </Card>
            {/* 1st */}
            <Card className="p-6 bg-card border-2 border-primary ring-2 ring-primary ring-offset-2 ring-offset-background flex flex-col items-center text-center order-2 md:-mt-4">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto -mt-4 mb-3" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg mb-3">{top3[0].displayName[0].toUpperCase()}</div>
              <h3 className="font-bold text-foreground mb-1 text-lg">{top3[0].displayName}</h3>
              <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{top3[0].rep.toLocaleString()}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{top3[0].lumens.toLocaleString()}</span></p>
            </Card>
            {/* 3rd */}
            <Card className="p-6 bg-card border-border flex flex-col items-center text-center md:mt-4 order-3">
              <Badge className="bg-orange-600/20 text-orange-600 text-sm py-1 mb-3"><Medal className="h-3 w-3 mr-1 inline" />3rd Place</Badge>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm mb-3">{top3[2].displayName[0].toUpperCase()}</div>
              <h3 className="font-bold text-foreground mb-1">{top3[2].displayName}</h3>
              <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{top3[2].rep.toLocaleString()}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{top3[2].lumens.toLocaleString()}</span></p>
            </Card>
          </div>
        )}

        <Tabs defaultValue="global" className="mb-8">
          <TabsList className="bg-background border-b border-border rounded-none w-full justify-start">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-4">
            {loading
              ? <div className="h-48 rounded-xl bg-card border border-border animate-pulse" />
              : <LeaderTable rows={rows} />}
          </TabsContent>
          <TabsContent value="week" className="mt-4">
            {loading
              ? <div className="h-48 rounded-xl bg-card border border-border animate-pulse" />
              : <LeaderTable rows={thisWeek} />}
          </TabsContent>
        </Tabs>

        {/* Your Ranking */}
        {me && (
          <Card className="p-6 bg-card border-border border-l-4 border-l-primary">
            <p className="text-sm text-muted-foreground mb-1">Your current ranking</p>
            <p className="text-2xl font-bold text-foreground mb-1">
              #{me.rank} <span className="text-sm text-muted-foreground font-normal">{me.displayName}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="text-primary font-semibold">{balance.toLocaleString()} LM</span> earned
            </p>
            <p className="text-sm text-muted-foreground">
              {me.contributions} contributions · {me.scaffolds} scaffolds filled
            </p>
          </Card>
        )}
      </main>
    </div>
  )
}
