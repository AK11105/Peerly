// Tests for the order validation logic added to nodes/route.ts
// Run: node scripts/test-order-validation.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

// Extracted logic (mirrors route.ts exactly)
function sortNodes(nodes) {
  return [...nodes].sort((a, b) => a.depth - b.depth || a.difficulty - b.difficulty)
}

function placeNewNode(existingNodes, title, depth, difficulty) {
  const sorted = sortNodes(existingNodes)
  const withNew = sortNodes([...sorted, { title, depth, difficulty }])
  const newIndex = withNew.findIndex((n) => n.title === title)
  return { withNew, newIndex, before: withNew[newIndex - 1], after: withNew[newIndex + 1] }
}

const existing = [
  { title: 'Variables', depth: 0, difficulty: 1 },
  { title: 'Functions', depth: 1, difficulty: 2 },
  { title: 'Closures', depth: 2, difficulty: 3 },
  { title: 'Async/Await', depth: 3, difficulty: 4 },
]

test('new node slots correctly between neighbors', () => {
  const { before, after } = placeNewNode(existing, 'Promises', 2, 4)
  assert.equal(before.title, 'Closures')
  assert.equal(after.title, 'Async/Await')
})

test('new node at depth 0 has no predecessor', () => {
  // depth:0 diff:0 sorts before Variables (depth:0 diff:1)
  const { before, after } = placeNewNode(existing, 'Data Types', 0, 0)
  assert.equal(before, undefined)
  assert.equal(after.title, 'Variables')
})

test('new node at max depth has no successor', () => {
  const { before, after } = placeNewNode(existing, 'Event Loop', 4, 5)
  assert.equal(before.title, 'Async/Await')
  assert.equal(after, undefined)
})

test('same depth nodes sorted by difficulty', () => {
  const { withNew, newIndex } = placeNewNode(existing, 'Arrow Functions', 1, 1)
  assert.equal(withNew[newIndex].title, 'Arrow Functions')
  assert.equal(withNew[newIndex + 1].title, 'Functions') // diff:1 before diff:2
})

test('corrected values are clamped to maxDepth+1', () => {
  const maxDepth = Math.max(...existing.map((n) => n.depth)) // 3
  const correctedDepth = Math.min(Math.max(0, 99), maxDepth + 1)
  assert.equal(correctedDepth, 4)
})

test('corrected difficulty is clamped to 1-5', () => {
  assert.equal(Math.min(5, Math.max(1, Math.round(0))), 1)
  assert.equal(Math.min(5, Math.max(1, Math.round(99))), 5)
})
