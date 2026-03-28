/**
 * Seed script — populates Supabase with sample weaves, users, and lumens.
 * Run: node scripts/seed.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

// Load .env.local — split on FIRST '=' only so URLs with '=' aren't broken
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
)

const USERS = ['demo_user', 'alice_dev', 'bob_learn', 'carol_ai']

const WEAVES = [
  {
    topic: 'Machine Learning',
    field: 'Computer Science',
    nodes: [
      { title: 'Linear Algebra Basics', description: 'Vectors, matrices, and transformations — the mathematical backbone of ML algorithms.', depth: 0, difficulty: 2, is_scaffold: false, contributed_by: 'alice_dev' },
      { title: 'Probability & Statistics', description: 'Distributions, expectations, and Bayes theorem underpin every probabilistic model.', depth: 0, difficulty: 2, is_scaffold: false, contributed_by: 'bob_learn' },
      { title: 'Gradient Descent', description: 'Iterative optimisation that minimises a loss function by following the negative gradient.', depth: 1, difficulty: 3, is_scaffold: false, contributed_by: 'carol_ai' },
      { title: 'Neural Networks', description: 'Layered compositions of linear transformations and non-linear activations that learn representations.', depth: 2, difficulty: 3, is_scaffold: false, contributed_by: 'demo_user' },
      { title: 'Backpropagation', description: 'Efficient computation of gradients through a network via the chain rule.', depth: 2, difficulty: 4, is_scaffold: true, contributed_by: null },
      { title: 'Convolutional Networks', description: 'Exploit spatial locality with shared weight filters — dominant in vision tasks.', depth: 3, difficulty: 4, is_scaffold: true, contributed_by: null },
      { title: 'Transformers', description: 'Attention-based architecture that replaced RNNs for sequence modelling at scale.', depth: 3, difficulty: 5, is_scaffold: false, contributed_by: 'alice_dev' },
    ],
  },
  {
    topic: 'Organic Chemistry',
    field: 'Science',
    nodes: [
      { title: 'Atomic Structure', description: 'Electrons, orbitals, and how electron configuration drives chemical behaviour.', depth: 0, difficulty: 1, is_scaffold: false, contributed_by: 'bob_learn' },
      { title: 'Chemical Bonding', description: 'Covalent, ionic, and metallic bonds — how atoms share or transfer electrons.', depth: 0, difficulty: 2, is_scaffold: false, contributed_by: 'carol_ai' },
      { title: 'Functional Groups', description: 'Characteristic atom clusters (hydroxyl, carbonyl, amine) that define reactivity.', depth: 1, difficulty: 2, is_scaffold: false, contributed_by: 'demo_user' },
      { title: 'Stereochemistry', description: 'Spatial arrangement of atoms and its effect on physical and biological properties.', depth: 2, difficulty: 3, is_scaffold: true, contributed_by: null },
      { title: 'Reaction Mechanisms', description: 'Step-by-step electron movement in substitution, addition, and elimination reactions.', depth: 2, difficulty: 4, is_scaffold: false, contributed_by: 'alice_dev' },
      { title: 'Spectroscopy', description: 'NMR, IR, and mass spec techniques used to identify molecular structure.', depth: 3, difficulty: 4, is_scaffold: true, contributed_by: null },
    ],
  },
  {
    topic: 'Roman History',
    field: 'History',
    nodes: [
      { title: 'The Roman Republic', description: 'Senate, consuls, and the SPQR — how Rome governed itself before the emperors.', depth: 0, difficulty: 1, is_scaffold: false, contributed_by: 'carol_ai' },
      { title: 'Punic Wars', description: 'Three conflicts with Carthage that made Rome the dominant Mediterranean power.', depth: 1, difficulty: 2, is_scaffold: false, contributed_by: 'demo_user' },
      { title: 'Julius Caesar', description: 'General, dictator, and catalyst for the collapse of the Republic.', depth: 1, difficulty: 2, is_scaffold: false, contributed_by: 'bob_learn' },
      { title: 'Augustus & the Principate', description: 'How Octavian rebranded autocracy as a restored republic and founded the Empire.', depth: 2, difficulty: 3, is_scaffold: false, contributed_by: 'alice_dev' },
      { title: 'Pax Romana', description: 'Two centuries of relative peace and prosperity under stable imperial rule.', depth: 2, difficulty: 2, is_scaffold: true, contributed_by: null },
      { title: 'Fall of the Western Empire', description: 'Economic strain, military pressure, and political fragmentation ending in 476 AD.', depth: 3, difficulty: 3, is_scaffold: false, contributed_by: 'carol_ai' },
    ],
  },
  {
    topic: 'Web Development',
    field: 'Computer Science',
    nodes: [
      { title: 'HTML & the DOM', description: 'Markup language and the tree structure browsers use to represent web pages.', depth: 0, difficulty: 1, is_scaffold: false, contributed_by: 'demo_user' },
      { title: 'CSS & Layout', description: 'Selectors, the box model, flexbox, and grid for visual presentation.', depth: 0, difficulty: 2, is_scaffold: false, contributed_by: 'alice_dev' },
      { title: 'JavaScript Fundamentals', description: 'Variables, functions, closures, and the event loop — the language of the browser.', depth: 1, difficulty: 2, is_scaffold: false, contributed_by: 'bob_learn' },
      { title: 'HTTP & REST APIs', description: 'Request/response cycle, status codes, and designing resource-oriented APIs.', depth: 1, difficulty: 2, is_scaffold: false, contributed_by: 'carol_ai' },
      { title: 'React & Component Model', description: 'Declarative UI with reusable components, props, state, and the virtual DOM.', depth: 2, difficulty: 3, is_scaffold: false, contributed_by: 'demo_user' },
      { title: 'Databases & SQL', description: 'Relational data modelling, queries, joins, and transactions.', depth: 2, difficulty: 3, is_scaffold: true, contributed_by: null },
      { title: 'Authentication & Security', description: 'Sessions, JWTs, OAuth, and common vulnerabilities like XSS and CSRF.', depth: 3, difficulty: 4, is_scaffold: true, contributed_by: null },
    ],
  },
]

async function seed() {
  console.log('Wiping existing data…')
  // Delete in dependency order (children first)
  await supabase.from('community_upvotes').delete().neq('username', '__none__')
  await supabase.from('community_replies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('weave_admins').delete().neq('weave_id', '__none__')
  await supabase.from('user_weaves').delete().neq('weave_id', '__none__')
  await supabase.from('weaves').delete().neq('id', '__none__')
  await supabase.from('lumens').delete().neq('username', '__none__')
  await supabase.from('users').delete().neq('username', '__none__')
  console.log('Wiped.\n')
  console.log('Seeding users…')
  for (const username of USERS) {
    await supabase.from('users').upsert({ username })
    await supabase.from('lumens').upsert({ username, balance: Math.floor(Math.random() * 800) + 100 })
  }

  console.log('Seeding weaves…')
  for (const w of WEAVES) {
    const weaveId = randomUUID()
    const nodes = w.nodes.map(n => ({ ...n, id: randomUUID() }))

    const { error } = await supabase.from('weaves').insert({ id: weaveId, topic: w.topic, field: w.field, nodes })
    if (error) { console.error(`Failed to insert ${w.topic}:`, error.message); continue }

    // Register demo_user as admin + bookmark
    await supabase.from('weave_admins').upsert({ weave_id: weaveId, username: 'demo_user' })
    await supabase.from('user_weaves').upsert({ username: 'demo_user', weave_id: weaveId })

    // Record contributions
    for (const node of nodes) {
      if (!node.is_scaffold && node.contributed_by) {
        await supabase.from('contributions').insert({
          weave_id: weaveId,
          node_id: node.id,
          username: node.contributed_by,
          type: 'scaffold_fill',
          lumens_earned: 50,
        })
      }
    }

    // Seed community messages
    const channels = ['general', 'suggestions', 'help', 'theory', 'resources']
    const seedMsgs = [
      { channel: 'general', username: 'alice_dev', text: `Welcome to the ${w.topic} community! Share insights and ask questions.`, is_question: false },
      { channel: 'general', username: 'bob_learn', text: `Just started learning ${w.topic} — the node structure here is really clear.`, is_question: false },
      { channel: 'suggestions', username: 'carol_ai', text: `Would love more worked examples in the ${w.topic} nodes.`, is_question: false },
      { channel: 'help', username: 'alice_dev', text: `What's the best way to get started with ${w.topic}?`, is_question: true },
      { channel: 'theory', username: 'carol_ai', text: `What's the theoretical foundation behind the key concepts in ${w.topic}?`, is_question: true },
    ]
    for (const msg of seedMsgs) {
      const { data: msgRow } = await supabase.from('community_messages').insert({ weave_id: weaveId, ...msg }).select().single()
      if (msgRow && msg.channel === 'help') {
        await supabase.from('community_replies').insert({ message_id: msgRow.id, username: 'bob_learn', text: `Work through the weave nodes in order, then implement each concept from scratch.` })
      }
    }

    console.log(`  ✓ ${w.topic} (${nodes.length} nodes, ${seedMsgs.length} community messages)`)
  }

  console.log('\nDone! Open http://localhost:3000/explore to see your data.')
}

seed().catch(console.error)
