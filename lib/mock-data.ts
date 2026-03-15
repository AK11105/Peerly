import type { Weave } from './types'

export const mockWeave: Weave = {
  id: 'demo-ml-weave',
  topic: 'Machine Learning',
  nodes: [
    {
      id: 'node-1',
      title: 'Linear Algebra Basics',
      description:
        'Vectors, matrices, and transformations as the mathematical backbone of ML algorithms.',
      depth: 1,
      difficulty: 2,
      is_scaffold: false,
      contributed_by: 'alice_dev',
    },
    {
      id: 'node-2',
      title: 'Probability & Statistics',
      description:
        'Distributions, expectations, and Bayesian reasoning underpinning modern ML models.',
      depth: 1,
      difficulty: 3,
      is_scaffold: false,
      contributed_by: 'bob_learn',
    },
    {
      id: 'node-3',
      title: 'Gradient Descent',
      description:
        'How models minimise a loss function through iterative parameter updates along the gradient.',
      depth: 2,
      difficulty: 3,
      is_scaffold: false,
      contributed_by: 'community',
    },
    {
      id: 'node-4',
      title: 'Backpropagation',
      description:
        'Chain rule applied to compute gradients through every layer of a neural network.',
      depth: 2,
      difficulty: 4,
      is_scaffold: true,
      contributed_by: null,
    },
    {
      id: 'node-5',
      title: 'Convolutional Neural Networks',
      description:
        'Spatial feature extraction using learned filters — the workhorse of computer vision.',
      depth: 3,
      difficulty: 4,
      is_scaffold: false,
      contributed_by: 'carol_ai',
    },
    {
      id: 'node-6',
      title: 'Attention Mechanisms',
      description:
        'Learned weighted relationships between sequence elements powering transformer architectures.',
      depth: 3,
      difficulty: 5,
      is_scaffold: true,
      contributed_by: null,
    },
  ],
}
