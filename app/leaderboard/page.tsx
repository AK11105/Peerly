'use client'

import { useState } from 'react'
import { Crown, Medal } from 'lucide-react'
import { Navbar } from '@/components/peerly/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLumens } from '@/lib/lumens-context'
import { fetchAllWeaves } from '@/lib/api'
import { getMyWeaveIds } from '@/lib/my-weaves'
import { useEffect } from 'react'

const FULL_LEADERBOARD = [
  { rank: 1, username: 'alex_learns', field: 'Computer Science', rep: 2840, lumens: 8500, contributions: 45, scaffolds: 12 },
  { rank: 2, username: 'math_wizard', field: 'Mathematics', rep: 2120, lumens: 6200, contributions: 38, scaffolds: 8 },
  { rank: 3, username: 'physics_fan', field: 'Physics', rep: 1890, lumens: 5100, contributions: 34, scaffolds: 7 },
  { rank: 4, username: 'bio_explorer', field: 'Biology', rep: 1650, lumens: 4800, contributions: 28, scaffolds: 6 },
  { rank: 5, username: 'history_buff', field: 'History', rep: 1420, lumens: 4200, contributions: 26, scaffolds: 5 },
  { rank: 6, username: 'design_guru', field: 'Design', rep: 1280, lumens: 3900, contributions: 22, scaffolds: 4 },
  { rank: 7, username: 'language_pro', field: 'Language Learning', rep: 1050, lumens: 3200, contributions: 19, scaffolds: 3 },
  { rank: 8, username: 'econ_analyst', field: 'Economics', rep: 920, lumens: 2800, contributions: 16, scaffolds: 2 },
  { rank: 9, username: 'curious_mind', field: 'Computer Science', rep: 850, lumens: 2500, contributions: 15, scaffolds: 2 },
  { rank: 142, username: 'demo_user', field: 'Computer Science', rep: 840, lumens: 0, contributions: 0, scaffolds: 0, isMe: true }, // live data applied below
]

const FIELDS = ['Computer Science', 'Mathematics', 'Physics', 'Biology', 'History', 'Design', 'Language Learning', 'Economics']

const TOP_3 = FULL_LEADERBOARD.slice(0, 3)

const RANK_BADGES: Record<number, { icon: typeof Crown; color: string; bg: string }> = {
  1: { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  2: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  3: { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-600/10' },
}

function LeaderTable({ rows }: { rows: typeof FULL_LEADERBOARD }) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-12">Rank</TableHead>
            <TableHead className="text-muted-foreground">User</TableHead>
            <TableHead className="text-muted-foreground">Field</TableHead>
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
              <TableRow
                key={user.rank}
                className={`border-border hover:bg-background/50 ${
                  (user as any).isMe ? 'border-l-2 border-l-primary bg-primary/5' : ''
                }`}
              >
                <TableCell className="font-bold w-12">
                  {badge ? (
                    <Badge className={`${badge.bg} ${badge.color}`}>{user.rank}</Badge>
                  ) : (
                    <span className="text-foreground">{user.rank}</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {user.username}
                  {(user as any).isMe && (
                    <Badge className="ml-2 bg-primary/20 text-primary text-xs">You</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.field}</TableCell>
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
  const { balance } = useLumens()
  const [selectedField, setSelectedField] = useState('Computer Science')
  const [myContributions, setMyContributions] = useState(0)
  const [myScaffolds, setMyScaffolds] = useState(0)

  useEffect(() => {
    // Count real contributions from backend
    fetchAllWeaves().then((weaves) => {
      let contribs = 0, scaffoldsFilled = 0
      for (const w of weaves) {
        for (const n of w.nodes) {
          if (!n.is_scaffold && n.contributed_by === 'demo_user') {
            contribs++
            scaffoldsFilled++
          }
        }
      }
      setMyContributions(contribs)
      setMyScaffolds(scaffoldsFilled)
    }).catch(() => {})
  }, [])

  // Inject live balance for demo_user
  const boardWithLiveUser = FULL_LEADERBOARD.map((u) =>
    (u as any).isMe ? { ...u, lumens: balance, contributions: myContributions, scaffolds: myScaffolds } : u
  )

  const fieldRows = boardWithLiveUser.filter((u) => u.field === selectedField)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <h1 className="text-4xl font-bold text-foreground mb-12">Leaderboard</h1>

        {/* Top 3 Podium */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {/* 2nd */}
          <Card className="p-6 bg-card border-border flex flex-col items-center text-center md:mt-8 order-first md:order-1">
            <Badge className="bg-gray-400/20 text-gray-400 text-sm py-1 mb-3">
              <Medal className="h-3 w-3 mr-1 inline" />2nd Place
            </Badge>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm mb-3">
              {TOP_3[1].username[0].toUpperCase()}
            </div>
            <h3 className="font-bold text-foreground mb-1">{TOP_3[1].username}</h3>
            <p className="text-xs text-muted-foreground mb-3">{TOP_3[1].field}</p>
            <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{TOP_3[1].rep.toLocaleString()}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{TOP_3[1].lumens.toLocaleString()}</span></p>
          </Card>

          {/* 1st */}
          <Card className="p-6 bg-card border-2 border-primary ring-2 ring-primary ring-offset-2 ring-offset-background flex flex-col items-center text-center order-2 md:-mt-4">
            <Crown className="h-8 w-8 text-yellow-500 mx-auto -mt-4 mb-3" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg mb-3">
              {TOP_3[0].username[0].toUpperCase()}
            </div>
            <h3 className="font-bold text-foreground mb-1 text-lg">{TOP_3[0].username}</h3>
            <p className="text-xs text-muted-foreground mb-3">{TOP_3[0].field}</p>
            <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{TOP_3[0].rep.toLocaleString()}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{TOP_3[0].lumens.toLocaleString()}</span></p>
          </Card>

          {/* 3rd */}
          <Card className="p-6 bg-card border-border flex flex-col items-center text-center md:mt-4 order-3">
            <Badge className="bg-orange-600/20 text-orange-600 text-sm py-1 mb-3">
              <Medal className="h-3 w-3 mr-1 inline" />3rd Place
            </Badge>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm mb-3">
              {TOP_3[2].username[0].toUpperCase()}
            </div>
            <h3 className="font-bold text-foreground mb-1">{TOP_3[2].username}</h3>
            <p className="text-xs text-muted-foreground mb-3">{TOP_3[2].field}</p>
            <p className="text-sm"><span className="text-muted-foreground">Rep: </span><span className="font-bold text-foreground">{TOP_3[2].rep.toLocaleString()}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">LM: </span><span className="font-bold text-primary">{TOP_3[2].lumens.toLocaleString()}</span></p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="global" className="mb-8">
          <TabsList className="bg-background border-b border-border rounded-none w-full justify-start">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="field">By Field</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <LeaderTable rows={boardWithLiveUser} />
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <LeaderTable rows={boardWithLiveUser.slice(0, 5)} />
          </TabsContent>

          <TabsContent value="field" className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedField(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedField === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {fieldRows.length > 0 ? (
              <LeaderTable rows={fieldRows} />
            ) : (
              <Card className="p-8 bg-card border-border text-center text-muted-foreground">
                No entries for {selectedField} yet
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Your Ranking */}
        <Card className="p-6 bg-card border-border border-l-4 border-l-primary">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your current ranking</p>
            <p className="text-2xl font-bold text-foreground mb-1">
              #142 <span className="text-sm text-muted-foreground font-normal">demo_user</span>
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="text-primary font-semibold">{balance.toLocaleString()} LM</span> earned
            </p>
            <p className="text-sm text-muted-foreground">
              You need <span className="text-primary font-semibold">340 more Rep</span> to reach #100
            </p>
            <div className="h-2 bg-background rounded-full overflow-hidden mt-3 w-64">
              <div className="h-full bg-primary transition-all" style={{ width: '55%' }} />
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

