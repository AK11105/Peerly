export interface NodeSource {
  title: string
  url: string
  score: number
  subreddit: string
}

export interface WeaveNode {
  id: string
  weave_id: string
  title: string
  description: string
  depth: number
  difficulty: number
  is_scaffold: boolean
  contributed_by: string | null
  status: 'PENDING_ADMIN' | 'PENDING_VOTE' | 'approved' | 'rejected'
  submitted_by?: string | null
  explainer?: string | null
  sources?: NodeSource[] | null
  node_source?: 'ai' | 'import' | 'community'
  flag?: 'spam' | 'abuse' | null
  created_at?: string
}

export interface NodeVote {
  id: string
  node_id: string
  username: string
  vote: 'accept' | 'reject'
  created_at: string
}

export interface NodeVoteStats {
  node_id: string
  accept_count: number
  reject_count: number
  total_votes: number
  status: 'PENDING_ADMIN' | 'PENDING_VOTE' | 'approved' | 'rejected'
}

export interface Weave {
  id: string
  topic: string
  field?: string
  source?: 'ai' | 'import'
  source_url?: string | null
  nodes: WeaveNode[]
  created_at?: string
}

export interface AddNodePayload {
  title: string
  description: string
  contributed_by: string
  user_id?: string
  attachments?: string[]
  submission_path?: 'admin' | 'community_vote'
}

export interface AddNodeResponse {
  status: 'PENDING_ADMIN' | 'PENDING_VOTE' | 'approved' | 'rejected'
  node?: WeaveNode
}

export interface ContributePayload {
  weave_id: string
  scaffold_node_id: string
  title: string
  description: string
  contributed_by: string
  user_id?: string
  attachments?: string[]
}