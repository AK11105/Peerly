import { supabase } from './supabase'

const DEMO_USER = 'demo_user'

export type DbMessage = {
  id: string
  weave_id: string
  channel: string
  username: string
  text: string
  is_question: boolean
  upvotes: number
  created_at: string
  community_replies: DbReply[]
}

export type DbReply = {
  id: string
  message_id: string
  username: string
  text: string
  upvotes: number
  created_at: string
}

export async function fetchMessages(weaveId: string, channel: string): Promise<DbMessage[]> {
  const res = await fetch(`/api/community/${weaveId}/messages?channel=${channel}`)
  if (!res.ok) return []
  return res.json()
}

export async function postMessage(weaveId: string, channel: string, text: string, isQuestion = false): Promise<DbMessage | null> {
  const res = await fetch(`/api/community/${weaveId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, username: DEMO_USER, text, is_question: isQuestion }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deleteMessage(weaveId: string, id: string): Promise<void> {
  await fetch(`/api/community/${weaveId}/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, username: DEMO_USER }),
  })
}

export async function postReply(messageId: string, text: string): Promise<DbReply | null> {
  const res = await fetch(`/api/community/messages/${messageId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: DEMO_USER, text }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deleteReply(messageId: string, id: string): Promise<void> {
  await fetch(`/api/community/messages/${messageId}/replies`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, username: DEMO_USER }),
  })
}

export async function toggleMessageUpvote(messageId: string): Promise<number> {
  const res = await fetch(`/api/community/messages/${messageId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: DEMO_USER }),
  })
  const data = await res.json()
  return data.upvotes ?? 0
}

export async function toggleReplyUpvote(replyId: string): Promise<number> {
  const res = await fetch(`/api/community/replies/${replyId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: DEMO_USER }),
  })
  const data = await res.json()
  return data.upvotes ?? 0
}

/** Subscribe to all message/reply changes for a weave */
export function subscribeCommunity(weaveId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`community:${weaveId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `weave_id=eq.${weaveId}` }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_replies' }, onUpdate)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
