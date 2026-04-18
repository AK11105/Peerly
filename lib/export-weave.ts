import type { Weave, WeaveNode } from '@/lib/types'

// ── Graphviz DOT ─────────────────────────────────────────────────────────────

export function toGraphvizDot(weave: Weave): string {
  const escape = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, ' ')

  const nodeLines = weave.nodes.map((n) => {
    const label = escape(n.title)
    const shape = n.is_scaffold ? 'dashed' : 'solid'
    const color = n.is_scaffold ? '#F59E0B' : '#22C55E'
    const fillColor = n.is_scaffold ? '#1a1200' : '#0a1a0f'
    const fontColor = '#F9FAFB'
    return `  "${n.id}" [label="${label}", shape=box, style="${shape},rounded,filled", color="${color}", fillcolor="${fillColor}", fontcolor="${fontColor}", fontname="Helvetica", tooltip="${escape(n.description)}"];`
  })

  // Group by depth for subgraphs
  const byDepth: Record<number, WeaveNode[]> = {}
  weave.nodes.forEach((n) => {
    if (!byDepth[n.depth]) byDepth[n.depth] = []
    byDepth[n.depth].push(n)
  })

  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)

  // Edges: connect each node to the next depth's nodes (nearest neighbour)
  const edgeLines: string[] = []
  depths.forEach((depth, di) => {
    if (di === 0) return
    const parents = byDepth[depths[di - 1]]
    const children = byDepth[depth]
    children.forEach((child, ci) => {
      const parent = parents[Math.min(ci, parents.length - 1)]
      const color = child.is_scaffold ? '#F59E0B88' : '#22C55E88'
      const style = child.is_scaffold ? 'dashed' : 'solid'
      edgeLines.push(`  "${parent.id}" -> "${child.id}" [color="${color}", style="${style}", penwidth=1.5];`)
    })
  })

  const subgraphs = depths.map((depth) => {
    const STAGE = ['Foundation', 'Core Concepts', 'Intermediate', 'Advanced', 'Expert', 'Mastery']
    const label = STAGE[depth] ?? `Depth ${depth}`
    const ids = byDepth[depth].map((n) => `"${n.id}"`).join('; ')
    return `  subgraph cluster_${depth} {\n    label="${label}";\n    color="#2A2A2A";\n    fontcolor="#6B7280";\n    style=rounded;\n    ${ids};\n  }`
  })

  return [
    `digraph "${escape(weave.topic)}" {`,
    '  rankdir=TB;',
    '  bgcolor="#0A0A0A";',
    '  graph [fontname="Helvetica", fontcolor="#F9FAFB", pad="0.5", nodesep="0.7", ranksep="0.9"];',
    '  node [fontsize=11];',
    '  edge [arrowsize=0.7];',
    '',
    ...subgraphs,
    '',
    ...nodeLines,
    '',
    ...edgeLines,
    '}',
  ].join('\n')
}

// ── Cytoscape JSON ────────────────────────────────────────────────────────────

export function toCytoscapeJson(weave: Weave): object {
  const elements: object[] = []

  weave.nodes.forEach((n) => {
    elements.push({
      data: {
        id: n.id,
        label: n.title,
        description: n.description,
        depth: n.depth,
        difficulty: n.difficulty,
        is_scaffold: n.is_scaffold,
        contributed_by: n.contributed_by,
        status: n.status,
        type: n.is_scaffold ? 'scaffold' : 'community',
      },
      classes: [n.is_scaffold ? 'scaffold' : 'community', `depth-${n.depth}`].join(' '),
    })
  })

  // Edges same logic as DOT
  const byDepth: Record<number, WeaveNode[]> = {}
  weave.nodes.forEach((n) => {
    if (!byDepth[n.depth]) byDepth[n.depth] = []
    byDepth[n.depth].push(n)
  })
  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
  depths.forEach((depth, di) => {
    if (di === 0) return
    const parents = byDepth[depths[di - 1]]
    const children = byDepth[depth]
    children.forEach((child, ci) => {
      const parent = parents[Math.min(ci, parents.length - 1)]
      elements.push({
        data: {
          id: `e-${parent.id}-${child.id}`,
          source: parent.id,
          target: child.id,
          type: child.is_scaffold ? 'scaffold' : 'community',
        },
        classes: child.is_scaffold ? 'scaffold-edge' : 'community-edge',
      })
    })
  })

  return {
    format_version: '1.0',
    generated_by: 'Peerly / Loom',
    target_cytoscapejs_version: '~3',
    data: { name: weave.topic, weave_id: weave.id },
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#111',
          'border-width': 2,
          'border-color': '#22C55E',
          color: '#F9FAFB',
          'font-family': 'Helvetica, sans-serif',
          'font-size': 12,
          label: 'data(label)',
          'text-wrap': 'wrap',
          'text-max-width': 120,
          'text-valign': 'center',
          'text-halign': 'center',
          width: 140,
          height: 50,
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node.scaffold',
        style: {
          'border-style': 'dashed',
          'border-color': '#F59E0B',
          'background-color': '#1a1200',
        },
      },
      {
        selector: 'edge',
        style: {
          width: 1.5,
          'line-color': '#22C55E66',
          'target-arrow-color': '#22C55E',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
      {
        selector: 'edge.scaffold-edge',
        style: {
          'line-color': '#F59E0B66',
          'target-arrow-color': '#F59E0B',
          'line-style': 'dashed',
        },
      },
    ],
    layout: { name: 'dagre', rankDir: 'TB', nodeSep: 70, rankSep: 90 },
  }
}

// ── Embeddable HTML (self-contained, uses CDN Cytoscape) ────────────────────

export function toEmbedHtml(weave: Weave): string {
  const cyJson = toCytoscapeJson(weave)
  const escapedTopic = weave.topic.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const dataStr = JSON.stringify(cyJson)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapedTopic} — Peerly Weave</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A0A0A; color: #F9FAFB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { padding: 12px 20px; border-bottom: 1px solid #1F1F1F; display: flex; align-items: center; justify-content: space-between; background: #111; flex-shrink: 0; }
  header h1 { font-size: 14px; font-weight: 600; color: #F9FAFB; }
  header .badge { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: rgba(34,197,94,0.15); color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
  #cy { flex: 1; width: 100%; }
  #tooltip { position: fixed; background: #111; border: 1px solid #1F1F1F; border-radius: 8px; padding: 10px 14px; max-width: 260px; font-size: 12px; line-height: 1.5; color: #D1D5DB; display: none; z-index: 100; pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
  #tooltip .ttitle { font-weight: 600; color: #F9FAFB; margin-bottom: 4px; }
  footer { padding: 8px 20px; border-top: 1px solid #1F1F1F; text-align: center; font-size: 10px; color: #374151; background: #0A0A0A; flex-shrink: 0; }
  footer a { color: #22C55E; text-decoration: none; }
  .legend { display: flex; gap: 14px; align-items: center; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #6B7280; }
  .legend-dot { width: 10px; height: 10px; border-radius: 2px; border: 2px solid; }
</style>
</head>
<body>
<header>
  <h1>${escapedTopic}</h1>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="border-color:#22C55E;background:rgba(34,197,94,0.15)"></div>Community</div>
    <div class="legend-item"><div class="legend-dot" style="border-color:#F59E0B;background:rgba(245,158,11,0.15);border-style:dashed"></div>AI Draft</div>
    <span class="badge">${weave.nodes.length} nodes</span>
  </div>
</header>
<div id="cy"></div>
<div id="tooltip"><div class="ttitle" id="tt-title"></div><div id="tt-desc"></div></div>
<footer>Embedded from <a href="https://peerly.app" target="_blank">Peerly</a> · Interactive weave</footer>
<script>
const data = ${dataStr};
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: data.elements,
  style: data.style,
  layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.4, padding: 40 },
  wheelSensitivity: 0.3,
});
const tooltip = document.getElementById('tooltip');
const ttTitle = document.getElementById('tt-title');
const ttDesc = document.getElementById('tt-desc');
cy.on('mouseover', 'node', (e) => {
  const d = e.target.data();
  ttTitle.textContent = d.label;
  ttDesc.textContent = d.description ? d.description.slice(0, 140) + (d.description.length > 140 ? '…' : '') : '';
  tooltip.style.display = 'block';
});
cy.on('mousemove', 'node', (e) => {
  tooltip.style.left = (e.originalEvent.clientX + 14) + 'px';
  tooltip.style.top = (e.originalEvent.clientY - 10) + 'px';
});
cy.on('mouseout', 'node', () => { tooltip.style.display = 'none'; });
cy.fit(undefined, 40);
</script>
</body>
</html>`
}

// ── Download helpers ──────────────────────────────────────────────────────────

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}