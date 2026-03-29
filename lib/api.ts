import { supabase } from './supabase'
import type { Weave, AddNodePayload, ContributePayload } from './types'

export async function fetchWeave(id: string): Promise<Weave> {
  const { data, error } = await supabase.from('weaves').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchAllWeaves(): Promise<Weave[]> {
  const { data, error } = await supabase.from('weaves').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export class ProRequiredError extends Error {
  constructor() { super('pro_required') }
}

async function checkResponse(res: Response) {
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}))
    if (data.error === 'pro_required') throw new ProRequiredError()
  }
  if (!res.ok) throw new Error(await res.text())
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
