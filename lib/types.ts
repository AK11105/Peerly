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
  status: 'pending' | 'approved' | 'rejected'
  submitted_by?: string | null
  explainer?: string | null
  sources?: NodeSource[] | null
  node_source?: 'ai' | 'import' | 'community'
  created_at?: string
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
}

export interface AddNodeResponse {
  status: 'pending' | 'approved'
  node?: WeaveNode
}

export interface ContributePayload {
  weave_id: string
  scaffold_node_id: string
  title: string
  description: string
  contributed_by: string
  user_id?: string
}
