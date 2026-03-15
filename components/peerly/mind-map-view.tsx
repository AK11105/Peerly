'use client'

import { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { WeaveNode } from '@/lib/types'

// ---- Custom Community Node ----
function CommunityNode({ data }: NodeProps) {
  const node: WeaveNode = data.node
  const isSelected = data.isSelected

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#22C55E', border: 'none' }} />
      <div
        style={{
          background: '#111111',
          border: isSelected ? '2px solid #22C55E' : '1px solid #22C55E',
          boxShadow: isSelected ? '0 0 16px rgba(34,197,94,0.3)' : 'none',
          borderRadius: '8px',
          padding: '12px',
          width: 180,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug text-[#F9FAFB]">{node.title}</p>
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold leading-none"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
          >
            ✓
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="h-1.5 flex-1 rounded-full bg-[#1F1F1F]">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">75%</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#22C55E', border: 'none' }} />
    </>
  )
}

// ---- Custom Scaffold Node ----
function ScaffoldNode({ data }: NodeProps) {
  const node: WeaveNode = data.node

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#F59E0B', border: 'none' }} />
      <div
        style={{
          background: '#111111',
          border: '1px dashed #F59E0B',
          boxShadow: '0 0 12px rgba(245,158,11,0.2)',
          borderRadius: '8px',
          padding: '12px',
          width: 180,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug text-[#F9FAFB]">{node.title}</p>
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold leading-none"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
          >
            AI Draft
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#F59E0B', border: 'none' }} />
    </>
  )
}

// ---- Custom Root Node ----
function RootNode({ data }: NodeProps) {
  return (
    <>
      <div
        style={{
          background: '#15803D',
          border: '2px solid #22C55E',
          borderRadius: '8px',
          padding: '16px 20px',
          width: 220,
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(34,197,94,0.2)',
        }}
      >
        <p className="text-sm font-bold text-white">{data.node.title}</p>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#22C55E', border: 'none' }} />
    </>
  )
}

const nodeTypes = {
  communityNode: CommunityNode,
  scaffoldNode: ScaffoldNode,
  rootNode: RootNode,
}

const edgeTypes = {}

// ---- Simple Grid Layout Function (without dagre) ----
function layoutNodes(
  weaveNodes: WeaveNode[],
  selectedNodeId: string | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root node at top center
  const rootId = 'root'
  nodes.push({
    id: rootId,
    type: 'rootNode',
    position: { x: 0, y: 0 },
    data: { node: { id: rootId, title: 'Knowledge Weave', depth: -1 } },
  })

  // Group nodes by depth
  const nodesByDepth: Record<number, WeaveNode[]> = {}
  weaveNodes.forEach((n) => {
    if (!nodesByDepth[n.depth]) nodesByDepth[n.depth] = []
    nodesByDepth[n.depth].push(n)
  })

  const sortedDepths = Object.keys(nodesByDepth)
    .map(Number)
    .sort((a, b) => a - b)

  // Position nodes in a grid by depth
  const nodeWidth = 200
  const nodeHeight = 100
  const depthSpacing = 150
  const horizontalSpacing = 250

  sortedDepths.forEach((depth) => {
    const depthNodes = nodesByDepth[depth]
    const nodesCount = depthNodes.length
    const startX = -(nodesCount * horizontalSpacing) / 2
    const y = (depth + 1) * depthSpacing

    depthNodes.forEach((node, index) => {
      const x = startX + index * horizontalSpacing
      const isSelected = node.id === selectedNodeId
      const nodeType = node.is_scaffold ? 'scaffoldNode' : 'communityNode'

      nodes.push({
        id: node.id,
        type: nodeType,
        position: { x, y },
        data: { node, isSelected },
      })

      // Edge from root to depth-0 nodes
      if (depth === 0) {
        edges.push({
          id: `e-${rootId}-${node.id}`,
          source: rootId,
          target: node.id,
          type: 'smoothstep',
          style: {
            stroke: node.is_scaffold ? '#F59E0B' : '#22C55E',
            strokeWidth: 1.5,
            strokeDasharray: node.is_scaffold ? '5,5' : 'none',
          },
          animated: node.is_scaffold,
        })
      }
    })
  })

  // Edges between consecutive depths (simple parent-child by index)
  sortedDepths.forEach((depth, depthIndex) => {
    if (depthIndex > 0) {
      const parentDepth = sortedDepths[depthIndex - 1]
      const parentNodes = nodesByDepth[parentDepth]
      const childNodes = nodesByDepth[depth]

      childNodes.forEach((child, childIndex) => {
        const parentIndex = Math.min(childIndex, parentNodes.length - 1)
        const parent = parentNodes[parentIndex]

        edges.push({
          id: `e-${parent.id}-${child.id}`,
          source: parent.id,
          target: child.id,
          type: 'smoothstep',
          style: {
            stroke: child.is_scaffold ? '#F59E0B' : '#22C55E',
            strokeWidth: 1.5,
            strokeDasharray: child.is_scaffold ? '5,5' : 'none',
          },
          animated: child.is_scaffold,
        })
      })
    }
  })

  return { nodes, edges }
}

interface MindMapViewProps {
  weaveNodes: WeaveNode[]
}

export function MindMapView({ weaveNodes }: MindMapViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return layoutNodes(weaveNodes, selectedNodeId)
  }, [weaveNodes, selectedNodeId])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when layout changes
  useMemo(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView()
  }, [])

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }

  return (
    <div
      style={{ height: 520, borderRadius: 12, overflow: 'hidden', border: '1px solid #1F1F1F' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodeClick={(_, node) => handleNodeClick(node.id)}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0A0A0A' }}
      >
        <Background color="#1F1F1F" variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls
          style={{
            background: '#111111',
            border: '1px solid #1F1F1F',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'rootNode') return '#22C55E'
            if (node.type === 'scaffoldNode') return '#F59E0B'
            return '#22C55E'
          }}
          maskColor="rgba(0, 0, 0, 0.3)"
          style={{
            background: '#111111',
            border: '1px solid #1F1F1F',
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </div>
  )
}
