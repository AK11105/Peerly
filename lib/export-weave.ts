import type { Weave, WeaveNode } from '@/lib/types'

const STAGE_LABELS: Record<number, string> = {
  0: 'Foundation', 1: 'Core Concepts', 2: 'Intermediate',
  3: 'Advanced', 4: 'Expert', 5: 'Mastery',
}
const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']
const DIFFICULTY_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']

// ── helpers ───────────────────────────────────────────────────────────────────

function dotEsc(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')
}
function htmlEsc(s: string) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEdgePairs(weave: Weave) {
  const byDepth: Record<number, WeaveNode[]> = {}
  weave.nodes.forEach((n) => { if (!byDepth[n.depth]) byDepth[n.depth] = []; byDepth[n.depth].push(n) })
  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
  const pairs: Array<{ parent: WeaveNode; child: WeaveNode }> = []
  depths.forEach((depth, di) => {
    if (di === 0) return
    const parents = byDepth[depths[di - 1]]
    byDepth[depth].forEach((child, ci) => pairs.push({ parent: parents[Math.min(ci, parents.length - 1)], child }))
  })
  return pairs
}

// ── 1. Graphviz DOT ───────────────────────────────────────────────────────────

export function toGraphvizDot(weave: Weave): string {
  const byDepth: Record<number, WeaveNode[]> = {}
  weave.nodes.forEach((n) => { if (!byDepth[n.depth]) byDepth[n.depth] = []; byDepth[n.depth].push(n) })
  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
  const pairs = buildEdgePairs(weave)

  const header = [
    '// ════════════════════════════════════════════════════════════',
    `//  Weave : ${weave.topic}`,
    `//  ID    : ${weave.id}`,
    `//  Source: ${weave.source ?? 'ai'}${weave.source_url ? ' — ' + weave.source_url : ''}`,
    `//  Nodes : ${weave.nodes.length} total | ${weave.nodes.filter(n => !n.is_scaffold).length} community | ${weave.nodes.filter(n => n.is_scaffold).length} scaffolds`,
    `//  Date  : ${new Date().toISOString()}`,
    '// ════════════════════════════════════════════════════════════',
  ].join('\n')

  const nodeLines: string[] = []
  
  weave.nodes.forEach((n) => {
    const stage = STAGE_LABELS[n.depth] ?? `Depth ${n.depth}`
    const diff  = DIFFICULTY_LABELS[n.difficulty] ?? String(n.difficulty)
    const color     = n.is_scaffold ? '#F59E0B' : '#22C55E'
    const fillColor = n.is_scaffold ? '#1a1200' : '#0a1a0f'

    // full tooltip — title + description + all metadata
    const tooltip = [
      n.title,
      '',
      n.description,
      '',
      `Stage: ${stage}`,
      `Difficulty: ${diff} (${n.difficulty}/5)`,
      `Type: ${n.is_scaffold ? 'AI Scaffold' : 'Community Node'}`,
      `Status: ${n.status ?? 'approved'}`,
      `Node source: ${n.node_source ?? 'ai'}`,
      n.contributed_by ? `Contributor: ${n.contributed_by}` : null,
      (n as any).upvotes ? `Upvotes: ${(n as any).upvotes}` : null,
      n.sources?.length ? `Reddit sources: ${n.sources.length}` : null,
      n.explainer ? `Has explainer: yes` : null,
      n.flag ? `⚠ Flagged: ${n.flag}` : null,
    ].filter(Boolean).join('\\n')

    const dots = Array.from({ length: 5 }, (_, i) => i < n.difficulty ? '●' : '○').join('')
    const typeLine = `<FONT POINT-SIZE="9" COLOR="${color}">${n.is_scaffold ? '⚡ AI Draft' : '✓ Community'}</FONT><BR/>`
    const contribLine = n.contributed_by ? `<BR/><FONT POINT-SIZE="9" COLOR="#6B7280">@${dotEsc(n.contributed_by)}</FONT>` : ''
    const label = `<${typeLine}<B>${dotEsc(n.title)}</B><BR/><FONT POINT-SIZE="9" COLOR="#6B7280">${dots} ${diff}</FONT>${contribLine}>`

    nodeLines.push(
      ...[
        `  // ── ${n.title}`,
        `  // description : ${n.description.replace(/\n/g, ' ').slice(0, 240)}`,
        `  // depth       : ${n.depth} (${stage}) | difficulty: ${n.difficulty}/5 (${diff})`,
        `  // status      : ${n.status ?? 'approved'} | type: ${n.is_scaffold ? 'scaffold' : 'community'} | source: ${n.node_source ?? 'ai'}`,
        n.contributed_by ? `  // contributor : ${n.contributed_by}` : null,
        n.sources?.length ? `  // reddit srcs : ${n.sources.map(s => s.url).join(', ')}` : null,
        n.explainer ? `  // explainer   : (present, ${n.explainer.length} chars)` : null,
        (n as any).upvotes ? `  // upvotes     : ${(n as any).upvotes}` : null,
        `  "${n.id}" [`,
        `    label=${label},`,
        `    shape=box,`,
        `    style="${n.is_scaffold ? 'dashed' : 'solid'},rounded,filled",`,
        `    color="${color}", fillcolor="${fillColor}", fontcolor="#F9FAFB",`,
        `    fontname="Helvetica",`,
        `    tooltip="${dotEsc(tooltip)}",`,
        `    URL="${weave.id}/${n.id}"`,
        `  ];`,
        '',
      ].filter((l): l is string => l !== null)
    )
  }) 

  const subgraphs = depths.map((depth) => {
    const label = STAGE_LABELS[depth] ?? `Depth ${depth}`
    const ids = byDepth[depth].map((n) => `"${n.id}"`).join('; ')
    return [
      `  subgraph cluster_${depth} {`,
      `    label="${label}"; color="#2A2A2A"; fontcolor="#6B7280"; fontname="Helvetica"; style=rounded;`,
      `    ${ids};`,
      `  }`,
    ].join('\n')
  })

  const edges = pairs.map(({ parent, child }) =>
    `  "${parent.id}" -> "${child.id}" [color="${child.is_scaffold ? '#F59E0B66' : '#22C55E66'}", style="${child.is_scaffold ? 'dashed' : 'solid'}", penwidth=1.5];`
  )

  return [
    header, '',
    `digraph "${dotEsc(weave.topic)}" {`,
    '  rankdir=TB;', '  bgcolor="#0A0A0A";',
    '  graph [fontname="Helvetica", fontcolor="#F9FAFB", pad="0.6", nodesep="0.8", ranksep="1.0"];',
    '  node [fontsize=11]; edge [arrowsize=0.7];', '',
    ...subgraphs, '', ...nodeLines, '', ...edges, '}',
  ].join('\n')
} 

// ── 2. Cytoscape JSON — every field ──────────────────────────────────────────

export function toCytoscapeJson(weave: Weave): object {
  const elements: object[] = []
  const pairs = buildEdgePairs(weave)

  weave.nodes.forEach((n) => {
    elements.push({
      data: {
        id: n.id,
        label: n.title,
        // Full content
        description: n.description,
        explainer: n.explainer ?? null,
        // Classification
        depth: n.depth,
        stage: STAGE_LABELS[n.depth] ?? `Depth ${n.depth}`,
        difficulty: n.difficulty,
        difficulty_label: DIFFICULTY_LABELS[n.difficulty] ?? String(n.difficulty),
        // Provenance
        is_scaffold: n.is_scaffold,
        node_source: n.node_source ?? 'ai',
        status: n.status,
        contributed_by: n.contributed_by ?? null,
        submitted_by: (n as any).submitted_by ?? null,
        weave_id: n.weave_id,
        // Attachments & Reddit sources
        attachments: (n as any).attachments ?? [],
        sources: n.sources ?? [],
        // Engagement
        upvotes: (n as any).upvotes ?? 0,
        flag: n.flag ?? null,
        created_at: n.created_at ?? null,
      },
      classes: [
        n.is_scaffold ? 'scaffold' : 'community',
        `depth-${n.depth}`,
        `difficulty-${n.difficulty}`,
        n.status === 'approved' ? 'approved' : '',
        n.flag ? 'flagged' : '',
      ].filter(Boolean).join(' '),
    })
  })

  pairs.forEach(({ parent, child }) => {
    elements.push({
      data: {
        id: `e-${parent.id}-${child.id}`,
        source: parent.id, target: child.id,
        source_title: parent.title, target_title: child.title,
        type: child.is_scaffold ? 'scaffold' : 'community',
      },
      classes: child.is_scaffold ? 'scaffold-edge' : 'community-edge',
    })
  })

  return {
    format_version: '1.0',
    generated_by: 'Peerly / Loom',
    exported_at: new Date().toISOString(),
    target_cytoscapejs_version: '~3',
    data: {
      name: weave.topic,
      weave_id: weave.id,
      source: weave.source ?? 'ai',
      source_url: weave.source_url ?? null,
      field: weave.field ?? null,
      created_at: weave.created_at ?? null,
      stats: {
        total_nodes: weave.nodes.length,
        community_nodes: weave.nodes.filter(n => !n.is_scaffold).length,
        scaffold_nodes: weave.nodes.filter(n => n.is_scaffold).length,
        max_depth: Math.max(...weave.nodes.map(n => n.depth), 0),
        avg_difficulty: weave.nodes.length
          ? +(weave.nodes.reduce((s, n) => s + n.difficulty, 0) / weave.nodes.length).toFixed(2)
          : 0,
      },
    },
    elements,
    style: [
      { selector: 'node', style: { 'background-color': '#111', 'border-width': 2, 'border-color': '#22C55E', color: '#F9FAFB', 'font-family': 'Helvetica, sans-serif', 'font-size': 12, label: 'data(label)', 'text-wrap': 'wrap', 'text-max-width': 130, 'text-valign': 'center', 'text-halign': 'center', width: 150, height: 55, shape: 'round-rectangle' } },
      { selector: 'node.scaffold', style: { 'border-style': 'dashed', 'border-color': '#F59E0B', 'background-color': '#1a1200' } },
      { selector: 'node.flagged',  style: { 'border-color': '#EF4444' } },
      { selector: 'edge',           style: { width: 1.5, 'line-color': '#22C55E66', 'target-arrow-color': '#22C55E', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
      { selector: 'edge.scaffold-edge', style: { 'line-color': '#F59E0B66', 'target-arrow-color': '#F59E0B', 'line-style': 'dashed' } },
    ],
    layout: { name: 'dagre', rankDir: 'TB', nodeSep: 70, rankSep: 90 },
  }
}

// ── 3. Embeddable HTML ────────────────────────────────────────────────────────

export function toEmbedHtml(weave: Weave): string {
  const cyJson   = toCytoscapeJson(weave)
  const dataStr  = JSON.stringify(cyJson)
  const topicHtml = htmlEsc(weave.topic)
  const communityCount = weave.nodes.filter(n => !n.is_scaffold).length
  const scaffoldCount  = weave.nodes.filter(n => n.is_scaffold).length
  const stageLabelsJson = JSON.stringify(STAGE_LABELS)
  const diffLabelsJson  = JSON.stringify(DIFFICULTY_LABELS)
  const diffColorsJson  = JSON.stringify(DIFFICULTY_COLORS)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${topicHtml} — Peerly Weave</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#F9FAFB;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
header{padding:10px 18px;border-bottom:1px solid #1F1F1F;display:flex;align-items:center;justify-content:space-between;background:#111;flex-shrink:0;gap:12px}
.hd-left{display:flex;align-items:center;gap:10px;min-width:0}
.logo{width:22px;height:22px;background:#22C55E;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000;flex-shrink:0}
h1{font-size:13px;font-weight:600;color:#F9FAFB;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px}
.badges{display:flex;gap:6px;flex-shrink:0}
.badge{font-size:10px;padding:2px 8px;border-radius:999px;font-weight:600;white-space:nowrap}
.bg{background:rgba(34,197,94,.15);color:#22C55E;border:1px solid rgba(34,197,94,.3)}
.ba{background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.3)}
.bk{background:rgba(255,255,255,.07);color:#9CA3AF;border:1px solid rgba(255,255,255,.1)}
.main{display:flex;flex:1;min-height:0;position:relative}
#cy{flex:1;min-width:0}
#panel{width:300px;flex-shrink:0;border-left:1px solid #1F1F1F;background:#0D0D0D;display:flex;flex-direction:column;overflow:hidden;transition:width .2s}
#panel.closed{width:0;border-left:none}
#ptoggle{position:absolute;right:300px;top:50%;transform:translateY(-50%);z-index:10;background:#1A1A1A;border:1px solid #2A2A2A;border-right:none;border-radius:6px 0 0 6px;width:18px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6B7280;font-size:11px;transition:right .2s}
#ptoggle:hover{color:#F9FAFB;background:#222}
#ptoggle.closed{right:0}
#pinner{flex:1;overflow-y:auto;padding:16px;min-width:300px}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:#374151;text-align:center;gap:8px;padding:20px}
.empty-ic{font-size:28px;opacity:.4}
.empty p{font-size:11px;line-height:1.6}
.ntype{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:3px 8px;border-radius:999px;margin-bottom:10px}
.ntype.com{background:rgba(34,197,94,.15);color:#22C55E;border:1px solid rgba(34,197,94,.3)}
.ntype.sca{background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.3);border-style:dashed}
.ptitle{font-size:14px;font-weight:700;color:#F9FAFB;line-height:1.3;margin-bottom:3px}
.pstage{font-size:10px;color:#6B7280;margin-bottom:12px}
.psec{margin-bottom:14px}
.plab{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4B5563;margin-bottom:6px}
.pdesc{font-size:11px;line-height:1.65;color:#9CA3AF;word-break:break-word}
.pexp{font-size:11px;line-height:1.65;color:#9CA3AF;word-break:break-word;max-height:130px;overflow-y:auto}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mc{background:#111;border:1px solid #1F1F1F;border-radius:6px;padding:6px 8px}
.mcl{font-size:9px;color:#4B5563;margin-bottom:2px}
.mcv{font-size:11px;font-weight:600;color:#D1D5DB}
.dots{display:flex;gap:3px;margin-top:2px}
.dot{width:8px;height:8px;border-radius:2px}
.contrib{display:flex;align-items:center;gap:8px;background:#111;border:1px solid #1F1F1F;border-radius:8px;padding:8px 10px}
.cavatar{width:26px;height:26px;border-radius:50%;background:rgba(34,197,94,.2);color:#22C55E;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cname{font-size:11px;font-weight:600;color:#D1D5DB}
.srclink{display:flex;align-items:center;gap:6px;background:#111;border:1px solid #1F1F1F;border-radius:6px;padding:6px 10px;margin-bottom:4px;text-decoration:none;color:#9CA3AF;font-size:10px;transition:border-color .15s}
.srclink:hover{border-color:rgba(34,197,94,.3);color:#D1D5DB}
.srctitle{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.srcscore{color:#22C55E;font-weight:600;flex-shrink:0}
.divider{height:1px;background:#1A1A1A;margin:12px 0}
.ctrls{position:absolute;bottom:12px;left:12px;display:flex;flex-direction:column;gap:4px;z-index:10}
.cb{background:#111;border:1px solid #1F1F1F;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6B7280;font-size:14px;font-weight:600;transition:all .15s}
.cb:hover{background:#1A1A1A;color:#F9FAFB;border-color:#2A2A2A}
footer{padding:6px 18px;border-top:1px solid #1F1F1F;text-align:center;font-size:10px;color:#374151;background:#0A0A0A;flex-shrink:0}
footer a{color:#22C55E;text-decoration:none}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
</style>
</head>
<body>
<header>
  <div class="hd-left">
    <div class="logo">L</div>
    <h1>${topicHtml}</h1>
  </div>
  <div class="badges">
    <span class="badge bk">${weave.nodes.length} nodes</span>
    <span class="badge bg">✓ ${communityCount} community</span>
    <span class="badge ba">⚡ ${scaffoldCount} drafts</span>
  </div>
</header>
<div class="main">
  <div id="cy"></div>
  <button id="ptoggle" onclick="toggleP()">›</button>
  <div id="panel">
    <div id="pinner">
      <div class="empty" id="empty"><div class="empty-ic">☍</div><p>Click any node to explore its full data — description, contributor, Reddit sources, explainer, and more.</p></div>
      <div id="detail" style="display:none"></div>
    </div>
  </div>
</div>
<div class="ctrls">
  <button class="cb" onclick="cy.fit(undefined,40)" title="Fit">⊡</button>
  <button class="cb" onclick="cy.zoom(cy.zoom()*1.25)" title="In">+</button>
  <button class="cb" onclick="cy.zoom(cy.zoom()*0.8)" title="Out">−</button>
</div>
<footer>Interactive weave from <a href="https://peerly.app" target="_blank">Peerly</a> · Click nodes to explore full data</footer>
<script>
const SL=${stageLabelsJson},DL=${diffLabelsJson},DC=${diffColorsJson};
const raw=${dataStr};
let popen=true;

const cy=cytoscape({container:document.getElementById('cy'),elements:raw.elements,style:raw.style,
  layout:{name:'breadthfirst',directed:true,spacingFactor:1.5,padding:50},wheelSensitivity:.3,minZoom:.15,maxZoom:4});

function toggleP(){
  popen=!popen;
  document.getElementById('panel').classList.toggle('closed',!popen);
  const t=document.getElementById('ptoggle');
  t.classList.toggle('closed',!popen);
  t.style.right=popen?'300px':'0';
  t.textContent=popen?'›':'‹';
}

function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function dots(lv){const c=DC[lv]||'#22C55E';return Array.from({length:5},(_,i)=>'<div class="dot" style="background:'+(i<lv?c:'#1F1F1F')+'"></div>').join('')}

function sources(arr){
  if(!arr||!arr.length)return'';
  return arr.map(s=>{
    const domain=s.subreddit||(s.url?new URL(s.url).hostname.replace('www.',''):'?');
    const title=s.title?(s.title.length>55?s.title.slice(0,55)+'…':s.title):domain;
    const score=s.score?'+'+s.score.toLocaleString():'';
    return '<a class="srclink" href="'+s.url+'" target="_blank" rel="noopener">'
      +'<span class="srctitle">'+esc(title)+'</span>'
      +(score?'<span class="srcscore">'+score+'</span>':'')+'</a>';
  }).join('');
}

cy.on('tap','node',function(e){
  const d=e.target.data();
  const sc=d.is_scaffold;
  const lv=parseInt(d.difficulty)||0;
  const dc=DC[lv]||'#22C55E';
  const stage=d.stage||SL[d.depth]||'Depth '+d.depth;
  const dlabel=d.difficulty_label||DL[lv]||lv;
  let h='';

  h+='<div class="ntype '+(sc?'sca':'com')+'">'+(sc?'⚡ AI Draft':'✓ Community Node')+'</div>';
  h+='<div class="ptitle">'+esc(d.label)+'</div>';
  h+='<div class="pstage">'+esc(stage)+'</div>';

  if(d.description){h+='<div class="psec"><div class="plab">Description</div><div class="pdesc">'+esc(d.description)+'</div></div>'}

  if(d.explainer){
    h+='<div class="divider"></div>';
    h+='<div class="psec"><div class="plab">AI Explainer</div><div class="pexp">'+esc(d.explainer)+'</div></div>';
  }

  h+='<div class="divider"></div>';
  h+='<div class="psec"><div class="plab">Details</div><div class="mgrid">';
  h+='<div class="mc"><div class="mcl">Difficulty</div><div class="dots">'+dots(lv)+'</div><div class="mcv" style="color:'+dc+'">'+esc(dlabel)+'</div></div>';
  h+='<div class="mc"><div class="mcl">Stage</div><div class="mcv">'+esc(stage)+'</div></div>';
  h+='<div class="mc"><div class="mcl">Status</div><div class="mcv">'+esc(d.status||'approved')+'</div></div>';
  h+='<div class="mc"><div class="mcl">Source</div><div class="mcv">'+esc(d.node_source||'ai')+'</div></div>';
  if(d.upvotes>0)h+='<div class="mc"><div class="mcl">Upvotes</div><div class="mcv" style="color:#22C55E">▲ '+d.upvotes+'</div></div>';
  if(d.flag)h+='<div class="mc"><div class="mcl">Flag</div><div class="mcv" style="color:#EF4444">⚠ '+esc(d.flag)+'</div></div>';
  h+='</div></div>';

  if(d.contributed_by){
    h+='<div class="divider"></div>';
    h+='<div class="psec"><div class="plab">Contributor</div>';
    h+='<div class="contrib"><div class="cavatar">'+esc(d.contributed_by[0].toUpperCase())+'</div>';
    h+='<div class="cname">@'+esc(d.contributed_by)+'</div></div></div>';
  }

  const srcH=sources(d.sources);
  if(srcH){
    h+='<div class="divider"></div>';
    h+='<div class="psec"><div class="plab">Reddit Sources ('+d.sources.length+')</div>'+srcH+'</div>';
  }

  if(d.attachments&&d.attachments.length){
    h+='<div class="divider"></div>';
    h+='<div class="psec"><div class="plab">Attachments ('+d.attachments.length+')</div>';
    h+=d.attachments.map(u=>'<a class="srclink" href="'+u+'" target="_blank" rel="noopener"><span class="srctitle">'+esc(u.split('/').pop()||u)+'</span></a>').join('');
    h+='</div>';
  }

  document.getElementById('empty').style.display='none';
  const det=document.getElementById('detail');
  det.style.display='block';
  det.innerHTML=h;
});

cy.on('tap',function(e){
  if(e.target===cy){
    document.getElementById('empty').style.display='flex';
    document.getElementById('detail').style.display='none';
  }
});

cy.fit(undefined,40);
</script>
</body>
</html>`
}


export function toCSV(weave: Weave): string {
  // Helper to safely escape CSV values
  const esc = (val: any) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    // Escape quotes by doubling them, wrap in quotes if needed
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headers = [
    'id',
    'title',
    'description',
    'depth',
    'stage',
    'difficulty',
    'difficulty_label',
    'is_scaffold',
    'status',
    'node_source',
    'contributed_by',
    'upvotes',
    'sources_count',
    'has_explainer',
  ]

  const rows = weave.nodes.map((n) => {
    const stage = STAGE_LABELS[n.depth] ?? `Depth ${n.depth}`
    const diffLabel = DIFFICULTY_LABELS[n.difficulty] ?? String(n.difficulty)

    return [
      esc(n.id),
      esc(n.title),
      esc(n.description),
      esc(n.depth),
      esc(stage),
      esc(n.difficulty),
      esc(diffLabel),
      esc(n.is_scaffold),
      esc(n.status ?? 'approved'),
      esc(n.node_source ?? 'ai'),
      esc(n.contributed_by ?? ''),
      esc((n as any).upvotes ?? 0),
      esc(n.sources?.length ?? 0),
      esc(!!n.explainer),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}


// ── download helpers ──────────────────────────────────────────────────────────

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}