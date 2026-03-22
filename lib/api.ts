import type { Weave, AddNodePayload, ContributePayload } from './types'

// In the browser: use the Next.js proxy (/api/...) to avoid CORS.
// In SSR / Node: fall back to the direct backend URL.
const API_BASE =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')

export async function fetchWeave(weaveId: string): Promise<Weave> {
  const res = await fetch(`${API_BASE}/api/weaves/${weaveId}`)
  if (!res.ok) throw new Error(`Weave not found: ${weaveId}`)
  return res.json()
}

export async function fetchAllWeaves(): Promise<Weave[]> {
  const res = await fetch(`${API_BASE}/api/weaves`)
  if (!res.ok) throw new Error('Failed to fetch weaves')
  return res.json()
}

export async function generateWeave(topic: string, seedNodes: string[] = [], field?: string, includeScaffolds: boolean = true): Promise<Weave> {
  const res = await fetch(`${API_BASE}/api/weaves/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, seed_nodes: seedNodes, field, include_scaffolds: includeScaffolds }),  })
  if (!res.ok) throw new Error('Failed to generate weave')
  return res.json()
}

export async function addNode(weaveId: string, payload: AddNodePayload) {
  const res = await fetch(`${API_BASE}/api/weaves/${weaveId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  if (!res.ok) throw new Error('Failed to add node')
  return res.json()
}

export async function contributeToScaffold(weaveId: string, payload: ContributePayload) {
  const res = await fetch(`${API_BASE}/api/weaves/${weaveId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to contribute')
  return res.json()
}

export async function addPerspective(
  weaveId: string,
  nodeId: string,
  payload: AddNodePayload
) {
  const res = await fetch(`${API_BASE}/api/weaves/${weaveId}/nodes/${nodeId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  if (!res.ok) throw new Error('Failed to add perspective')
  return res.json()
}
