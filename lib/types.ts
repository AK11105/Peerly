export interface WeaveNode {
  id: string
  title: string
  description: string
  depth: number
  difficulty: number
  is_scaffold: boolean
  contributed_by: string | null
}

export interface Weave {
  id: string
  topic: string
  field? : string 
  nodes: WeaveNode[]
}

export interface AddNodePayload {
  title: string
  description: string
  contributed_by: string
  user_id?: string
}

export interface AddNodeResponse {
  gap_detected?: boolean
  missing_concept?: string
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
