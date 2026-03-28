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
  if (!res.ok) throw new Error('Failed to generate weave')
  return res.json()
}

export async function addNode(weaveId: string, payload: AddNodePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  if (!res.ok) throw new Error('Failed to add node')
  return res.json()
}

export async function contributeToScaffold(weaveId: string, payload: ContributePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to contribute')
  return res.json()
}

export async function addPerspective(weaveId: string, nodeId: string, payload: AddNodePayload) {
  const res = await fetch(`/api/weaves/${weaveId}/nodes/${nodeId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, weave_id: weaveId }),
  })
  if (!res.ok) throw new Error('Failed to add perspective')
  return res.json()
}
