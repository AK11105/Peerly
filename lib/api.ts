import { supabase } from './supabase'
import type { Weave, AddNodePayload, ContributePayload } from './types'

async function attachNodes(weave: any): Promise<Weave> {
  const { data: nodes } = await supabase
    .from('nodes')
    .select('*')
    .eq('weave_id', weave.id)
    .eq('status', 'approved')
    .order('depth', { ascending: true })
    .order('difficulty', { ascending: true })
  return { ...weave, nodes: nodes ?? [] }
}

export async function fetchWeave(id: string): Promise<Weave> {
  const { data, error } = await supabase.from('weaves').select('id,topic,field,created_at').eq('id', id).single()
  if (error) throw new Error(error.message)
  return attachNodes(data)
}

export async function fetchAllWeaves(): Promise<Weave[]> {
  const { data, error } = await supabase.from('weaves').select('id,topic,field,created_at').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(attachNodes))
}

export class ProRequiredError extends Error {
  constructor() { super('pro_required') }
}

async function checkResponse(res: Response) {
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}))
    if (data.error === 'pro_required') throw new ProRequiredError()
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export async function generateWeave(
  topic: string,
  seedNodes: string[] = [],
  field?: string,
  includeScaffolds: boolean = true
): Promise<Weave> {
  const res = await fetch('/api/weaves/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, seed_nodes: seedNodes, field, include_scaffolds: includeScaffolds }),
  })
  return checkResponse(res)
}

export async function addNode(weaveId: string, payload: AddNodePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  return checkResponse(res)
}

export async function contributeToScaffold(weaveId: string, payload: ContributePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return checkResponse(res)
}

export async function addPerspective(weaveId: string, nodeId: string, payload: AddNodePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/nodes/${nodeId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  return checkResponse(res)
}
