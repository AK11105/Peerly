import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { callAI, callAIStrong } from '@/lib/ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseJSON(raw: string): any {
  const cleaned = raw.trim()
  try { return JSON.parse(cleaned) } catch {}
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) try { return JSON.parse(fence[1].trim()) } catch {}
  const obj = cleaned.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/)
  if (obj) try { return JSON.parse(obj[0]) } catch {}
  console.error('[import] AI raw response:', cleaned.slice(0, 500))
  throw new Error('Could not parse JSON from AI response')
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
}

function sortNodes(nodes: any[]) {
  return [...nodes].sort((a, b) =>
    a.depth - b.depth || a.difficulty - b.difficulty || Number(a.is_scaffold) - Number(b.is_scaffold)
  )
}

const REDDIT_HEADERS = { 'User-Agent': 'peerly-loom/1.0' }

async function fetchPostContent(permalink: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.reddit.com${permalink}.json?limit=50&depth=3`,
      { headers: REDDIT_HEADERS, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return ''
    const data = await res.json()
    const post = data[0]?.data?.children?.[0]?.data
    const comments = data[1]?.data?.children ?? []

    const parts: string[] = []
    if (post?.selftext?.trim()) parts.push(`Body: ${post.selftext.trim().slice(0, 800)}`)

    const topComments = comments
      .filter((c: any) => c.kind === 't1' && c.data?.body && c.data.body !== '[deleted]')
      .sort((a: any, b: any) => (b.data.score ?? 0) - (a.data.score ?? 0))
      .slice(0, 15)
      .map((c: any) => {
        const score = c.data.score ? ` [${c.data.score}↑]` : ''
        const replies = (c.data.replies?.data?.children ?? [])
          .filter((r: any) => r.kind === 't1' && r.data?.body && r.data.body !== '[deleted]')
          .slice(0, 5)
          .map((r: any) => `    > ${r.data.body.slice(0, 400)}`)
          .join('\n')
        return `  • ${c.data.body.slice(0, 800)}${score}${replies ? '\n' + replies : ''}`
      })
      .join('\n')

    if (topComments) parts.push(`Comments:\n${topComments}`)
    return parts.join('\n')
  } catch {
    return ''
  }
}

async function extractRedditSubreddit(url: string, parsed: URL) {
  const jsonUrl = url.split('?')[0].replace(/\/?$/, '.json?limit=100')
  const res = await fetch(jsonUrl, { headers: REDDIT_HEADERS, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Reddit fetch failed')
  const data = await res.json()
  const listing = Array.isArray(data) ? data[0] : data
  const subredditName = listing?.data?.children?.[0]?.data?.subreddit_name_prefixed ?? parsed.pathname.replace(/\/$/, '')
  const posts = (listing?.data?.children ?? []).filter((p: any) => p.kind === 't3')

  const enriched = await Promise.all(
    posts.slice(0, 10).map(async (p: any) => {
      const d = p.data
      const score = d.score ? ` [${d.score}↑]` : ''
      const flair = d.link_flair_text ? ` [${d.link_flair_text}]` : ''
      const content = await fetchPostContent(d.permalink)
      return `## ${d.title}${flair}${score}\n${content}`
    })
  )

  const rest = posts.slice(10).map((p: any) => {
    const d = p.data
    return `- ${d.title}${d.link_flair_text ? ` [${d.link_flair_text}]` : ''}${d.score ? ` [${d.score}↑]` : ''}`
  }).join('\n')

  return {
    title: subredditName,
    text: enriched.join('\n\n') + (rest ? `\n\nMore posts:\n${rest}` : ''),
    type: 'subreddit' as const,
  }
}

async function extractRedditPost(url: string) {
  const jsonUrl = url.split('?')[0].replace(/\/?$/, '.json?limit=100&depth=5')
  const res = await fetch(jsonUrl, { headers: REDDIT_HEADERS, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Reddit fetch failed')
  const data = await res.json()
  const post = data[0]?.data?.children?.[0]?.data
  const comments = data[1]?.data?.children ?? []
  const title = post?.title ?? url

  const parts: string[] = []
  if (post?.selftext?.trim()) parts.push(`Post body:\n${post.selftext.trim()}`)

  const topComments = comments
    .filter((c: any) => c.kind === 't1' && c.data?.body && c.data.body !== '[deleted]')
    .sort((a: any, b: any) => (b.data.score ?? 0) - (a.data.score ?? 0))
    .slice(0, 30)
    .map((c: any) => {
      const score = c.data.score ? ` [${c.data.score}↑]` : ''
      const replies = (c.data.replies?.data?.children ?? [])
        .filter((r: any) => r.kind === 't1' && r.data?.body && r.data.body !== '[deleted]')
        .slice(0, 6)
        .map((r: any) => `    > ${r.data.body.slice(0, 600)}`)
        .join('\n')
      return `• ${c.data.body}${score}${replies ? '\n' + replies : ''}`
    })
    .join('\n\n')

  parts.push(`Top comments:\n${topComments}`)
  return { title, text: parts.join('\n\n'), type: 'reddit_post' as const }
}

async function extractRedditSearch(query: string) {
  const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&limit=25&type=link`
  const res = await fetch(searchUrl, { headers: REDDIT_HEADERS, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Reddit search failed')
  const data = await res.json()
  const posts = (data?.data?.children ?? []).filter((p: any) => p.kind === 't3')

  const enriched = await Promise.all(
    posts.slice(0, 5).map(async (p: any) => {
      const d = p.data
      const sub = d.subreddit_name_prefixed ? ` (${d.subreddit_name_prefixed})` : ''
      const score = d.score ? ` [${d.score}↑]` : ''
      const content = await fetchPostContent(d.permalink)
      return `## ${d.title}${sub}${score}\n${content || '(link post, no body)'}`
    })
  )

  return { title: query, text: enriched.join('\n\n'), type: 'search' as const }
}

async function extractGeneric(url: string, parsed: URL) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })
  const html = await res.text()
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return {
    title: titleMatch?.[1]?.trim() ?? parsed.hostname,
    text: stripHtml(html),
    type: 'generic' as const,
  }
}

async function insertGapScaffolds(weaveId: string, nodes: any[]) {
  try {
    const summary = nodes.map((n: any) => `- [depth:${n.depth}] ${n.title}: ${n.description}`).join('\n')
    const prompt = `Review this knowledge map for missing prerequisite concepts or conceptual jumps that are too large.

Nodes:
${summary}

Only flag a gap if there is a genuine missing concept a reader would need before the next node makes sense.
If the map flows naturally, return [].

Output ONLY valid JSON:
[{"title":"..","description":"..","depth":<int>,"difficulty":<1-5>}]`

    const raw = await callAI(prompt)
    const gaps = parseJSON(raw)
    if (!Array.isArray(gaps) || gaps.length === 0) return

    const scaffolds = gaps.map((g: any) => ({
      id: randomUUID(),
      weave_id: weaveId,
      title: g.title,
      description: g.description,
      depth: Number(g.depth),
      difficulty: Number(g.difficulty),
      is_scaffold: true,
      contributed_by: null,
      status: 'approved',
    }))

    await supabase.from('nodes').insert(scaffolds)
  } catch (e) {
    console.error('[import gap detection]', e)
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, query } = await req.json()
  if (!url && !query) return NextResponse.json({ error: 'url or query is required' }, { status: 400 })

  // Deduplication: return existing weave if same source_url was already imported
  if (url) {
    const { data: existing } = await supabase
      .from('weaves')
      .select('id, topic, field, source, source_url, nodes(*)')
      .eq('source_url', url)
      .maybeSingle()
    if (existing) return NextResponse.json(existing)
  }

  let page: { title: string; text: string; type: string }

  try {
    if (query && !url) {
      page = await extractRedditSearch(query)
    } else {
      const parsed = new URL(url)
      if (parsed.hostname.includes('reddit.com')) {
        page = parsed.pathname.includes('/comments/')
          ? await extractRedditPost(url)
          : await extractRedditSubreddit(url, parsed)
      } else {
        page = await extractGeneric(url, parsed)
      }
    }
  } catch {
    return NextResponse.json({ error: 'Could not fetch the content' }, { status: 422 })
  }

  const contextHint =
    page.type === 'subreddit' ? `This is a Reddit community (${page.title}). Content includes full post bodies and top comments from the top posts.`
    : page.type === 'reddit_post' ? `This is a Reddit post titled "${page.title}" with its full comment thread.`
    : page.type === 'search' ? `These are the top Reddit posts for the query "${page.title}", with their bodies and top comments.`
    : `This is a web page titled "${page.title}".`

  const prompt = `You are organizing real people's posts and comments into a knowledge map. Your task is to CLUSTER content — group posts and comments that discuss the same concept into one node, and write the description using what those people actually said.

${contextHint}

Content:
${page.text.slice(0, 12000)}

For each node:
- title: the specific concept being discussed (4-6 words, not generic)
- description: 3-5 sentences built from the ACTUAL words, opinions, and examples people used in the posts/comments that belong to this cluster. Quote or closely paraphrase real things said. If 4 people discussed linear regression, the description should reflect all 4 perspectives — what they agreed on, disagreed on, what specific points they made.
- depth 0 = broad concept, higher = specific subtopic or angle within it
- difficulty 1-5

Do NOT write generic summaries. The description must contain the substance of what real people said.
Minimum 6 nodes. Cover every distinct concept that appears in the content.

Output ONLY valid JSON:
{"topic":"<short descriptive name>","nodes":[{"title":"..","description":"..","depth":0,"difficulty":1}, ...]}`

  const raw = await callAIStrong(prompt)
  const parsed2 = parseJSON(raw)

  const weaveId = randomUUID()
  const topic = parsed2.topic ?? page.title

  const { error: weaveErr } = await supabase
    .from('weaves')
    .insert({ id: weaveId, topic, field: null, source: 'import', source_url: url ?? null })
  if (weaveErr) return NextResponse.json({ error: weaveErr.message }, { status: 500 })

  const nodes = sortNodes(
    (parsed2.nodes ?? parsed2).map((item: any) => ({
      id: randomUUID(),
      weave_id: weaveId,
      title: item.title,
      description: item.description,
      depth: Number(item.depth),
      difficulty: Number(item.difficulty),
      is_scaffold: false,
      contributed_by: userId,
      status: 'approved',
    }))
  )

  const { error: nodesErr } = await supabase.from('nodes').insert(nodes)
  if (nodesErr) return NextResponse.json({ error: nodesErr.message }, { status: 500 })

  await supabase.rpc('ensure_user', { p_username: userId })
  await supabase.from('weave_admins').upsert({ weave_id: weaveId, username: userId })
  await supabase.from('user_weaves').upsert({ username: userId, weave_id: weaveId })

  insertGapScaffolds(weaveId, nodes)

  return NextResponse.json({ id: weaveId, topic, field: null, source: 'import', source_url: url ?? null, nodes })
}
