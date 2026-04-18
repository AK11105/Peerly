'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Flame, ArrowUp, ArrowUpRight, MessageSquare, Hash,
  ChevronRight, ChevronDown, Users, Zap, Plus, Search, Send, X, CornerDownRight, Trash2, Paperclip, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'
import { RichContent } from './rich-content'
import { toast } from 'sonner'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import {
  fetchMessages, postMessage, deleteMessage,
  postReply, deleteReply,
  toggleMessageUpvote, toggleReplyUpvote,
  subscribeCommunity, type DbMessage, type DbReply,
} from '@/lib/community'

// ── Types ──────────────────────────────────────────────────────────────────

interface LinkPreview {
  url: string
  title: string
  description: string
  image?: string
  domain: string
}

interface Reply {
  id: string
  initials: string
  username: string
  timestamp: string
  createdAt: number      // ms since epoch — for reliable sort
  text: string
  upvotes: number
  isOwn?: boolean
  images?: string[]
  linkPreview?: LinkPreview
}

interface Message {
  id: string
  initials: string
  username: string
  timestamp: string
  createdAt: number      // ms since epoch — for reliable sort
  unread: boolean
  text: string
  replies: Reply[]
  upvotes: number
  rep?: string
  isOwn?: boolean
  pendingSend?: boolean
  isQuestion?: boolean
  images?: string[]
  linkPreview?: LinkPreview
}

// Each channel has a unique id, display name, category, and its own message list
interface Channel {
  id: string            // unique: 'general', 'suggestions', etc.
  name: string          // display name
  category: 'DISCUSSIONS' | 'QUERIES'
  isQuery: boolean
  messages: Message[]
}


// ── Mention helpers ────────────────────────────────────────────────────────

/** Returns the @-query being typed at cursor position, or null */
function getMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor)
  const match = before.match(/@(\w*)$/)
  return match ? match[1] : null
}

/** Replace the partial @query before cursor with the chosen username */
function insertMention(value: string, cursor: number, username: string): { text: string; cursor: number } {
  const before = value.slice(0, cursor)
  const after = value.slice(cursor)
  const replaced = before.replace(/@\w*$/, `@${username} `)
  return { text: replaced + after, cursor: replaced.length }
}

/** Render text with @mentions highlighted */
function renderWithMentions(text: string) {



  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-primary font-semibold cursor-pointer hover:underline">{part}</span>
      : <span key={i}>{part}</span>
  )
}



function renderTextWithLinksAndMentions(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-400 break-all"
        >
          {part}
        </a>
      )
    }

    return renderWithMentions(part)
  })
}



// ── Seed data ──────────────────────────────────────────────────────────────

// ── Per-topic seed content ─────────────────────────────────────────────────
type SeedContent = {
  general:    { text: string; username: string; initials: string; rep?: string; replies?: { text: string; username: string; initials: string; upvotes: number }[] ; upvotes: number }[]
  suggestions:{ text: string; username: string; initials: string; upvotes: number; replies?: { text: string; username: string; initials: string; upvotes: number }[] }[]
  deepDives:  { text: string; username: string; initials: string; upvotes: number; replies?: { text: string; username: string; initials: string; upvotes: number }[] }[]
  help:       { text: string; username: string; initials: string; rep?: string; upvotes: number; replies?: { text: string; username: string; initials: string; upvotes: number }[] }[]
  theory:     { text: string; username: string; initials: string; rep?: string; upvotes: number; replies?: { text: string; username: string; initials: string; upvotes: number }[] }[]
  resources:  { text: string; username: string; initials: string; rep?: string; upvotes: number; replies?: { text: string; username: string; initials: string; upvotes: number }[] }[]
}

function getTopicSeed(topic: string): SeedContent {
  const t = topic.toLowerCase()

  // ── Gradient Descent / Optimisation ───────────────────────────────────────
  if (/gradient|descent|optimis|optim|sgd|adam|lr|learning.rate/.test(t)) return {
    general: [
      { text: 'The ball-rolling-downhill analogy for gradient descent finally clicked for me after reading this weave. The visualisations are great.', username: 'alice_dev', initials: 'AK', upvotes: 4,
        replies: [{ text: 'Same! The 3D loss surface diagram is what made it stick.', username: 'bob_learn', initials: 'BL', upvotes: 2 }] },
      { text: 'Anyone else find momentum-based optimisers more intuitive once you think of them as a ball with inertia rather than just a gradient average?', username: 'carol_ai', initials: 'CJ', upvotes: 3, replies: [] },
    ],
    suggestions: [
      { text: 'Would love a node comparing Adam vs AdamW — the weight decay difference trips a lot of people up.', username: 'marcus_r', initials: 'MR', upvotes: 5,
        replies: [{ text: 'AdamW decouples weight decay from the gradient update — a separate node would be really useful.', username: 'sara_p', initials: 'SP', upvotes: 3 }] },
      { text: 'A visual showing how learning rate affects the loss trajectory would be a great addition to the LR scheduler node.', username: 'bob_learn', initials: 'BL', upvotes: 2, replies: [] },
    ],
    deepDives: [
      { text: 'Deep dive: saddle points are actually more common than local minima in high-dimensional loss landscapes. The literature on this is fascinating — Dauphin et al. 2014 is worth reading.', username: 'carol_ai', initials: 'CJ', upvotes: 7,
        replies: [
          { text: 'Agreed. Most "local minima" complaints in practice are actually saddle point issues.', username: 'alice_dev', initials: 'AK', upvotes: 4 },
          { text: 'The Hessian eigenvalue analysis in that paper is dense but worth it.', username: 'marcus_r', initials: 'MR', upvotes: 2 },
        ] },
    ],
    help: [
      { text: 'Why does gradient descent sometimes diverge even with a small learning rate?', username: 'theo_w', initials: 'TW', upvotes: 8, rep: '120',
        replies: [{ text: 'Batch size interacts with learning rate — if your batch is very small, gradient variance is high and can cause divergence even with a small LR. Try gradient clipping.', username: 'alice_dev', initials: 'AK', upvotes: 6 }] },
      { text: 'What is the difference between stochastic, mini-batch, and full-batch gradient descent in practice?', username: 'ravi_k', initials: 'RK', upvotes: 5, rep: '95',
        replies: [{ text: 'Full-batch is exact but slow per update. SGD is noisy but fast. Mini-batch (typical default 32–256) balances both — GPU parallelism also favours mini-batch.', username: 'carol_ai', initials: 'CJ', upvotes: 4 }] },
    ],
    theory: [
      { text: 'Is the loss surface of a neural network convex? If not, how does gradient descent find good solutions?', username: 'sara_p', initials: 'SP', upvotes: 9, rep: '310',
        replies: [
          { text: 'Not convex — highly non-convex. But over-parameterised networks have many "good enough" minima. The implicit regularisation of SGD tends to find flat minima that generalise well.', username: 'carol_ai', initials: 'CJ', upvotes: 7 },
          { text: 'The lottery ticket hypothesis also suggests that sparse subnetworks exist that train just as well — related to why we find good minima.', username: 'marcus_r', initials: 'MR', upvotes: 3 },
        ] },
    ],
    resources: [
      { text: 'What are the best resources for building intuition on optimisation algorithms beyond the basics?', username: 'theo_w', initials: 'TW', upvotes: 6, rep: '195',
        replies: [
          { text: 'Sebastian Ruder\'s blog post "An overview of gradient descent optimisation algorithms" is the canonical reference — clear, comprehensive.', username: 'alice_dev', initials: 'AK', upvotes: 8 },
          { text: 'distill.pub/2017/momentum is a beautiful interactive explainer on momentum.', username: 'bob_learn', initials: 'BL', upvotes: 5 },
        ] },
    ],
  }

  // ── CNNs / Convolutional Networks ─────────────────────────────────────────
  if (/cnn|convol|pooling|filter|feature.map|resnet|vgg|inception/.test(t)) return {
    general: [
      { text: 'The filter visualisations in this weave are excellent — you can actually see how early layers detect edges and later layers detect complex shapes.', username: 'carol_ai', initials: 'CJ', upvotes: 5,
        replies: [{ text: 'DeepDream showed this so vividly — the network drawing dog faces everywhere because it learned that pattern.', username: 'alice_dev', initials: 'AK', upvotes: 3 }] },
      { text: 'Just implemented a CNN from scratch using only NumPy. The backward pass for the convolutional layer is humbling.', username: 'marcus_r', initials: 'MR', upvotes: 4, replies: [] },
    ],
    suggestions: [
      { text: 'The pooling node should cover global average pooling separately — it\'s critical for modern architectures like ResNet and MobileNet but often glossed over.', username: 'sara_p', initials: 'SP', upvotes: 6,
        replies: [{ text: 'Seconded. GAP vs max pooling is a design choice with real implications for parameter count.', username: 'carol_ai', initials: 'CJ', upvotes: 4 }] },
      { text: 'Would be great to add a node on depthwise separable convolutions — they\'re the backbone of MobileNet and worth their own explanation.', username: 'bob_learn', initials: 'BL', upvotes: 3, replies: [] },
    ],
    deepDives: [
      { text: 'The receptive field growth across layers is under-discussed. In a 3-layer net with 3×3 filters the receptive field is only 7×7 — you need many layers or dilated convolutions to see large-scale patterns.', username: 'alice_dev', initials: 'AK', upvotes: 8,
        replies: [
          { text: 'This is exactly why ResNet-50 has 50 layers — building up receptive field while keeping compute manageable via 1×1 bottlenecks.', username: 'marcus_r', initials: 'MR', upvotes: 5 },
          { text: 'Dilated/atrous convolutions are the elegant fix for this — same filter, exponentially larger receptive field.', username: 'carol_ai', initials: 'CJ', upvotes: 3 },
        ] },
    ],
    help: [
      { text: 'Why do we use padding in convolutional layers? Does it always need to be zero-padding?', username: 'theo_w', initials: 'TW', upvotes: 7, rep: '140',
        replies: [{ text: 'Padding preserves spatial dimensions so feature maps don\'t shrink after every layer. Zero-padding is simplest but reflect/replicate padding can reduce border artefacts for some tasks.', username: 'alice_dev', initials: 'AK', upvotes: 6 }] },
      { text: 'What is the difference between valid and same padding?', username: 'ravi_k', initials: 'RK', upvotes: 4, rep: '85',
        replies: [{ text: '\'Valid\' means no padding — output shrinks. \'Same\' pads so the output matches the input size. In practice \'same\' is almost always what you want during feature extraction.', username: 'carol_ai', initials: 'CJ', upvotes: 3 }] },
    ],
    theory: [
      { text: 'Why does weight sharing in CNNs work so well? Aren\'t we losing expressivity by using the same filter everywhere?', username: 'sara_p', initials: 'SP', upvotes: 10, rep: '380',
        replies: [
          { text: 'Weight sharing enforces translation equivariance — a dog in the top-left should activate the same filters as a dog in the bottom-right. This inductive bias is a massive regulariser.', username: 'carol_ai', initials: 'CJ', upvotes: 8 },
          { text: 'The parameter count drops from O(n²) to O(k²) where k is the filter size. For a 224×224 image that\'s orders of magnitude fewer parameters.', username: 'marcus_r', initials: 'MR', upvotes: 4 },
        ] },
    ],
    resources: [
      { text: 'Best resources for really understanding CNN internals — not just how to use them?', username: 'bob_learn', initials: 'BL', upvotes: 7, rep: '160',
        replies: [
          { text: 'cs231n (Stanford) is the gold standard — lecture 5 on CNNs is exceptional. The notes are freely available.', username: 'alice_dev', initials: 'AK', upvotes: 9 },
          { text: 'Zeiler & Fergus 2014 "Visualising and Understanding CNNs" is the original paper on filter visualisation — surprisingly readable.', username: 'marcus_r', initials: 'MR', upvotes: 5 },
        ] },
    ],
  }

  // ── Transformers / Attention ───────────────────────────────────────────────
  if (/transformer|attention|self.attention|bert|gpt|llm|language.model|token|embed/.test(t)) return {
    general: [
      { text: 'The "Attention is All You Need" paper is dense but this weave\'s breakdown of Q, K, V finally made it click. The analogy to a search engine index is spot on.', username: 'alice_dev', initials: 'AK', upvotes: 6,
        replies: [{ text: 'The scaled dot-product part confused me until I realised the scaling by √d_k prevents softmax from saturating in high dimensions.', username: 'bob_learn', initials: 'BL', upvotes: 4 }] },
      { text: 'Positional encodings are one of those things that seem arbitrary until you dig into the sinusoidal pattern — it\'s actually elegant.', username: 'carol_ai', initials: 'CJ', upvotes: 3, replies: [] },
    ],
    suggestions: [
      { text: 'Would love a dedicated node on RoPE (Rotary Position Embeddings) — modern LLMs use it instead of learned positional encodings and the reasoning is non-obvious.', username: 'marcus_r', initials: 'MR', upvotes: 7,
        replies: [{ text: 'Yes! And ALiBi too — the linear attention bias approach is really different conceptually.', username: 'sara_p', initials: 'SP', upvotes: 3 }] },
      { text: 'A comparison node for encoder-only (BERT) vs decoder-only (GPT) vs encoder-decoder (T5) would help a lot of learners.', username: 'bob_learn', initials: 'BL', upvotes: 5, replies: [] },
    ],
    deepDives: [
      { text: 'Multi-head attention is doing something subtle — each head can specialise in different relationship types (syntactic, semantic, positional). Probing experiments show this empirically.', username: 'carol_ai', initials: 'CJ', upvotes: 9,
        replies: [
          { text: 'Clark et al. 2019 "What Does BERT Look At?" is fascinating on this — some heads clearly track coreference, others track syntax.', username: 'alice_dev', initials: 'AK', upvotes: 6 },
          { text: 'Attention head pruning experiments also show many heads are redundant after training — yet having them during training seems to help.', username: 'marcus_r', initials: 'MR', upvotes: 3 },
        ] },
    ],
    help: [
      { text: 'What is the difference between self-attention and cross-attention? When is each used?', username: 'theo_w', initials: 'TW', upvotes: 11, rep: '420',
        replies: [{ text: 'Self-attention: Q, K, V all from the same sequence — used in both encoder and decoder to model internal relationships. Cross-attention: Q from decoder, K and V from encoder — how the decoder "looks at" the input.', username: 'alice_dev', initials: 'AK', upvotes: 8 }] },
      { text: 'Why is the transformer\'s attention O(n²) in sequence length and why does that matter?', username: 'ravi_k', initials: 'RK', upvotes: 6, rep: '110',
        replies: [{ text: 'Every token attends to every other token — n tokens × n tokens = n² operations. At 4k tokens that\'s 16M; at 100k tokens it\'s 10B. This is why long-context is expensive and why sparse/linear attention variants exist.', username: 'carol_ai', initials: 'CJ', upvotes: 5 }] },
    ],
    theory: [
      { text: 'Is there a theoretical reason why transformers outperform RNNs, or is it purely empirical?', username: 'sara_p', initials: 'SP', upvotes: 10, rep: '340',
        replies: [
          { text: 'Partly theoretical — direct paths between any two positions means no vanishing gradient over long distances. RNNs have O(n) gradient path length; transformers have O(1). But training scale also plays a huge role.', username: 'carol_ai', initials: 'CJ', upvotes: 7 },
          { text: 'Universal approximation results for transformers also give them strong theoretical backing — Yun et al. 2019 showed they can approximate any sequence-to-sequence function.', username: 'marcus_r', initials: 'MR', upvotes: 4 },
        ] },
    ],
    resources: [
      { text: 'What\'s the best way to build intuition for transformers before reading the original paper?', username: 'bob_learn', initials: 'BL', upvotes: 8, rep: '175',
        replies: [
          { text: 'Jay Alammar\'s "The Illustrated Transformer" is the best entry point — bar none. Extremely visual.', username: 'alice_dev', initials: 'AK', upvotes: 10 },
          { text: 'Andrej Karpathy\'s "nanoGPT" walkthrough on YouTube — building one from scratch is the fastest way to really understand it.', username: 'carol_ai', initials: 'CJ', upvotes: 7 },
        ] },
    ],
  }

  // ── Backpropagation / Neural Networks ─────────────────────────────────────
  if (/backprop|neural.net|activation|relu|sigmoid|layer|deep.learn|mlp|perceptron/.test(t)) return {
    general: [
      { text: 'The chain rule explanation in this weave is the clearest I\'ve seen. Most textbooks skip the intuition and go straight to notation.', username: 'alice_dev', initials: 'AK', upvotes: 4,
        replies: [{ text: 'The computation graph approach makes the backward pass much less intimidating.', username: 'bob_learn', initials: 'BL', upvotes: 2 }] },
      { text: 'ReLU killed the vanishing gradient problem but introduced dying ReLU — worth noting both sides in the activation function comparison.', username: 'carol_ai', initials: 'CJ', upvotes: 3, replies: [] },
    ],
    suggestions: [
      { text: 'A node on batch normalisation vs layer normalisation vs group normalisation would be really valuable — they have very different use cases.', username: 'marcus_r', initials: 'MR', upvotes: 6,
        replies: [{ text: 'Yes! And the "why BatchNorm works" debate (smoothing loss landscape vs covariate shift) would make a great deep dive.', username: 'carol_ai', initials: 'CJ', upvotes: 4 }] },
      { text: 'Dropout is described but the "ensemble interpretation" isn\'t mentioned — it\'s a really elegant way to think about why it works.', username: 'sara_p', initials: 'SP', upvotes: 3, replies: [] },
    ],
    deepDives: [
      { text: 'The vanishing gradient problem is much worse than the exploding gradient problem in practice because you can clip gradients, but you can\'t easily amplify vanishing ones.', username: 'carol_ai', initials: 'CJ', upvotes: 7,
        replies: [
          { text: 'Highway networks were an early attempt to fix this before skip connections. Interesting piece of history.', username: 'alice_dev', initials: 'AK', upvotes: 4 },
          { text: 'LSTM gates are essentially a learned solution to this — the forget/input gates act as gradient highways.', username: 'marcus_r', initials: 'MR', upvotes: 3 },
        ] },
    ],
    help: [
      { text: 'Why does backprop struggle with vanishing gradients in deep nets?', username: 'theo_w', initials: 'TW', upvotes: 9, rep: '310',
        replies: [{ text: 'Sigmoid/tanh saturate — derivative near 0/1 is nearly zero. Multiply many of those across layers and the gradient disappears. ReLU fixes this: derivative is exactly 1 for positive inputs.', username: 'carol_ai', initials: 'CJ', upvotes: 7 }] },
      { text: 'What does it mean for a weight initialisation to be "bad"? Why does Xavier/He init matter?', username: 'ravi_k', initials: 'RK', upvotes: 5, rep: '100',
        replies: [{ text: 'Bad init → activations either saturate (all zeros after ReLU) or explode (activations blow up). Xavier keeps variance constant through layers for tanh; He init does the same for ReLU.', username: 'alice_dev', initials: 'AK', upvotes: 5 }] },
    ],
    theory: [
      { text: 'Is the universal approximation theorem actually useful in practice? It says a 1-hidden-layer network can approximate any function — but the required width could be exponential.', username: 'sara_p', initials: 'SP', upvotes: 8, rep: '290',
        replies: [
          { text: 'UAT is more of a existence proof than a practical guide. Depth is much more parameter-efficient than width for most function classes — this is the depth-width trade-off literature.', username: 'carol_ai', initials: 'CJ', upvotes: 6 },
          { text: 'Montufar et al. 2014 formalised why depth exponentially increases expressivity — each layer can "fold" the input space.', username: 'marcus_r', initials: 'MR', upvotes: 3 },
        ] },
    ],
    resources: [
      { text: 'Best resources for deeply understanding backpropagation, not just running it?', username: 'bob_learn', initials: 'BL', upvotes: 6, rep: '150',
        replies: [
          { text: 'Karpathy\'s micrograd — a 100-line autograd engine. Building one yourself is the only way to truly understand it.', username: 'alice_dev', initials: 'AK', upvotes: 9 },
          { text: 'Nielsen\'s "Neural Networks and Deep Learning" (free online) — chapter 2 is the best written backprop explanation I know.', username: 'carol_ai', initials: 'CJ', upvotes: 6 },
        ] },
    ],
  }

  // ── Generic ML fallback ────────────────────────────────────────────────────
  return {
    general: [
      { text: `Welcome to the ${topic} community! Feel free to share insights, ask questions, and discuss what you're learning.`, username: 'alice_dev', initials: 'AK', upvotes: 3,
        replies: [{ text: 'Great to be here. Looking forward to learning together.', username: 'bob_learn', initials: 'BL', upvotes: 1 }] },
      { text: `Just finished the first few nodes on ${topic}. The scaffolding here is really well structured.`, username: 'carol_ai', initials: 'CJ', upvotes: 2, replies: [] },
    ],
    suggestions: [
      { text: `More worked examples in the ${topic} nodes would be great — theory is solid but practice problems would help.`, username: 'marcus_r', initials: 'MR', upvotes: 4,
        replies: [{ text: 'Agreed — interactive exercises would be ideal.', username: 'sara_p', initials: 'SP', upvotes: 2 }] },
      { text: 'A prerequisite map at the start of the weave would help learners know what to study first.', username: 'bob_learn', initials: 'BL', upvotes: 3, replies: [] },
    ],
    deepDives: [
      { text: `What aspects of ${topic} do you think are most under-explained in standard resources? Happy to start a collaborative node.`, username: 'carol_ai', initials: 'CJ', upvotes: 5,
        replies: [
          { text: 'The gap between theory and implementation is usually the biggest — pseudocode would help.', username: 'alice_dev', initials: 'AK', upvotes: 3 },
          { text: 'Historical context is often missing — knowing why something was invented helps a lot.', username: 'marcus_r', initials: 'MR', upvotes: 2 },
        ] },
    ],
    help: [
      { text: `What is the best way to get started with ${topic} if you have a solid maths background but limited ML experience?`, username: 'theo_w', initials: 'TW', upvotes: 7, rep: '200',
        replies: [{ text: 'Work through the weave nodes in order, then implement each concept in Python from scratch. Nothing beats building it yourself.', username: 'alice_dev', initials: 'AK', upvotes: 5 }] },
      { text: `Are there common misconceptions about ${topic} that trip up beginners?`, username: 'ravi_k', initials: 'RK', upvotes: 4, rep: '90',
        replies: [{ text: 'Confusing the training objective with the evaluation metric is probably the most common one. They are often the same but not always.', username: 'carol_ai', initials: 'CJ', upvotes: 3 }] },
    ],
    theory: [
      { text: `What is the theoretical justification for the key design choices in ${topic}?`, username: 'sara_p', initials: 'SP', upvotes: 6, rep: '250',
        replies: [
          { text: 'Many choices are empirically motivated first, then theoretically justified after. The field moves fast.', username: 'carol_ai', initials: 'CJ', upvotes: 4 },
          { text: 'Ablation studies in the original papers usually tell you what the authors thought mattered.', username: 'marcus_r', initials: 'MR', upvotes: 2 },
        ] },
    ],
    resources: [
      { text: `What are the best papers and courses to go deep on ${topic}?`, username: 'bob_learn', initials: 'BL', upvotes: 5, rep: '170',
        replies: [
          { text: 'Find the 2–3 most-cited papers in the area and read them carefully. Then trace their citations backwards.', username: 'alice_dev', initials: 'AK', upvotes: 6 },
          { text: 'Andrej Karpathy\'s lectures and Yannic Kilcher\'s paper walkthroughs on YouTube are excellent for ML broadly.', username: 'carol_ai', initials: 'CJ', upvotes: 4 },
        ] },
    ],
  }
}

// Seed factory — called with weaveId + optional topic name per weave
function makeSeedChannels(topic = 'this topic'): Channel[] {
  const now = Date.now()
  const t   = (minsAgo: number) => now - minsAgo * 60_000
  const seed = getTopicSeed(topic)

  function buildMsg(
    id: string,
    minsAgo: number,
    d: { text: string; username: string; initials: string; upvotes: number; rep?: string; replies?: { text: string; username: string; initials: string; upvotes: number }[] },
    isQuestion = false,
  ): Message {
    return {
      id,
      initials: d.initials,
      username: d.username,
      timestamp: minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.round(minsAgo / 60)}h ago` : `${Math.round(minsAgo / 1440)}d ago`,
      createdAt: t(minsAgo),
      unread: minsAgo < 15,
      text: d.text,
      replies: (d.replies ?? []).map((r, ri) => ({
        id: `${id}-r${ri}`,
        initials: r.initials,
        username: r.username,
        timestamp: `${Math.max(1, minsAgo - 3 - ri * 2)}m ago`,
        createdAt: t(Math.max(1, minsAgo - 3 - ri * 2)),
        text: r.text,
        upvotes: r.upvotes,
      })),
      upvotes: d.upvotes,
      rep: d.rep,
      isQuestion,
    }
  }

  return [
    {
      id: 'general', name: 'general', category: 'DISCUSSIONS', isQuery: false,
      messages: seed.general.map((d, i) => buildMsg(`gen-${i}`, 5 + i * 12, d)),
    },
    {
      id: 'suggestions', name: 'suggestions', category: 'DISCUSSIONS', isQuery: false,
      messages: seed.suggestions.map((d, i) => buildMsg(`sug-${i}`, 18 + i * 25, d)),
    },
    {
      id: 'deep-dives', name: 'deep-dives', category: 'DISCUSSIONS', isQuery: false,
      messages: seed.deepDives.map((d, i) => buildMsg(`dd-${i}`, 65 + i * 40, d)),
    },
    {
      id: 'help', name: 'help', category: 'QUERIES', isQuery: true,
      messages: seed.help.map((d, i) => buildMsg(`help-${i}`, 8 + i * 18, d, true)),
    },
    {
      id: 'theory', name: 'theory', category: 'QUERIES', isQuery: true,
      messages: seed.theory.map((d, i) => buildMsg(`theory-${i}`, 25 + i * 35, d, true)),
    },
    {
      id: 'resources', name: 'resources', category: 'QUERIES', isQuery: true,
      messages: seed.resources.map((d, i) => buildMsg(`res-${i}`, 90 + i * 60, d, true)),
    },
  ]
}

const ONLINE_MEMBERS = [
  { initials: 'AK', name: 'alice_dev', status: 'online', activity: 'Editing · Gradient Descent' },
  { initials: 'BL', name: 'bob_learn', status: 'online', activity: 'Reading · Neural Nets' },
  { initials: 'CJ', name: 'carol_ai', status: 'idle', activity: 'Away' },
  { initials: 'MR', name: 'marcus_r', status: 'online', activity: 'Contributing node' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

/** Upload files to Supabase Storage and return public URLs */
async function uploadFilesToStorage(files: FileList | File[]): Promise<string[]> {
  const { supabase: sb } = await import('@/lib/supabase')
  const urls: string[] = []
  for (const file of Array.from(files)) {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await sb.storage.from('attachments').upload(path, file, { upsert: false })
    if (!error) {
      const { data } = sb.storage.from('attachments').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

/** Extract domain from URL */
function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Detect first URL in a string */
function detectUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : null
}

/** Fetch Open Graph preview via jsonlink.io (free, no key, works for YouTube/Twitter/news) */
async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const endpoint = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json() as {
      title?: string; description?: string; images?: string[]; url?: string
    }
    const title       = (data.title ?? extractDomain(url)).slice(0, 100)
    const description = (data.description ?? '').slice(0, 200)
    const image       = data.images?.[0]
    return { url, title, description, image, domain: extractDomain(url) }
  } catch {
    return null
  }
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d0d] ${
      status === 'online' ? 'bg-primary' : 'bg-yellow-500'
    }`} />
  )
}

// ── localStorage helpers ───────────────────────────────────────────────────

// Keys are namespaced per weave so each community is isolated
function lsKeys(weaveId: string) {
  const ns = `peerly_community_${weaveId}`
  return {
    channels:    `${ns}_channels`,
    voted:       `${ns}_voted`,
    replyVoted:  `${ns}_reply_voted`,
    active:      `${ns}_active_channel`,
  }
}

function loadChannels(weaveId: string, topic = 'this topic'): Channel[] {
  if (typeof window === 'undefined') return makeSeedChannels(topic)
  try {
    const raw = localStorage.getItem(lsKeys(weaveId).channels)
    if (!raw) return makeSeedChannels(topic)
    const parsed = JSON.parse(raw) as Channel[]
    // Back-fill createdAt for any stored messages that predate the field
    return parsed.map(ch => ({
      ...ch,
      messages: ch.messages.map(m => ({
        ...m,
        createdAt: m.createdAt ?? Date.now(),
        replies: m.replies.map(r => ({ ...r, createdAt: r.createdAt ?? Date.now() })),
      })),
    }))
  } catch { return makeSeedChannels(topic) }
}

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveChannels(weaveId: string, channels: Channel[]) {
  try { localStorage.setItem(lsKeys(weaveId).channels, JSON.stringify(channels)) } catch {}
}

function saveSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])) } catch {}
}

// ── Main component ─────────────────────────────────────────────────────────

interface CommunityHubProps {
  weaveId?: string       // e.g. weave slug or id — defaults to 'global'
  weaveName?: string     // display name shown in the header
}

function toDisplayName(display_name: string | null, username: string | null): string {
  if (display_name) return display_name
  if (!username) return 'anonymous'
  // Clerk IDs look like user_2abc... — show last 6 chars as a readable fallback
  return username.startsWith('user_') ? `user_${username.slice(-6)}` : username
}

function dbRowToMessage(r: DbMessage, userId: string | null): Message {
  const authorName = toDisplayName(r.display_name, r.username)
  const initials = authorName.slice(0, 2).toUpperCase()
  return {
    id: r.id,
    initials,
    username: authorName,
    timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date(r.created_at).getTime(),
    unread: false,
    text: r.text,
    isQuestion: r.is_question,
    upvotes: r.upvotes,
    isOwn: r.username === userId,
    images: (r as any).attachments ?? undefined,
    replies: (r.community_replies ?? []).map(rep => {
      const repName = toDisplayName(rep.display_name, rep.username)
      return {
        id: rep.id,
        initials: repName.slice(0, 2).toUpperCase(),
        username: repName,
        timestamp: new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date(rep.created_at).getTime(),
        text: rep.text,
        upvotes: rep.upvotes,
        isOwn: rep.username === userId,
        images: (rep as any).attachments ?? undefined,
      }
    }),
  }
}

export function CommunityHub({ weaveId = 'global', weaveName }: CommunityHubProps) {
  const { earn } = useLumens()
  const currentUser = useCurrentUser()
  const { user: clerkUser } = useUser()
  const userId = clerkUser?.id ?? currentUser?.id ?? null
  const displayName = currentUser?.displayName ?? 'anonymous'

  // keys is stable per weaveId — memoised so effects deps don't fire on every render
  const keys = useMemo(() => lsKeys(weaveId), [weaveId])

  const [channels, setChannels] = useState<Channel[]>(() => makeSeedChannels(weaveName))
  const [activeChannelId, setActiveChannelId] = useState<string>('general')
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({})
  const [showMembers, setShowMembers] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  // sortMode — per-channel map; derivation is below activeChannel
  const [sortModes, setSortModes] = useState<Record<string, 'top' | 'new' | 'hot'>>({}) 
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [replyVotedIds, setReplyVotedIds] = useState<Set<string>>(new Set())
  // expanded reply threads: set of message ids
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  // which message we're replying to (null = new top-level post)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [newPostChannelId, setNewPostChannelId] = useState<string>('general')
  const [newPostType, setNewPostType] = useState<'message' | 'question'>('message')
  const [votingNodes, setVotingNodes] = useState<any[]>([])
  const [nodeUserVotes, setNodeUserVotes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!weaveId || weaveId === 'global') return
    supabase.from('nodes').select('*').eq('weave_id', weaveId).eq('status', 'PENDING_VOTE')
      .then(({ data }) => setVotingNodes(data ?? []))
  }, [weaveId])

  useEffect(() => {
    if (!userId || !weaveId || weaveId === 'global') return
    supabase.from('node_votes').select('node_id, vote').eq('username', userId)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const v of data ?? []) map[v.node_id] = v.vote
        setNodeUserVotes(map)
      })
  }, [userId, weaveId])

  async function castNodeVote(nodeId: string, vote: 'accept' | 'reject') {
    const res = await fetch(`/api/nodes/${nodeId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Vote failed'); return }
    setNodeUserVotes(prev => ({ ...prev, [nodeId]: prev[nodeId] === vote ? '' : vote }))
    if (data.node_status === 'approved' || data.node_status === 'rejected') {
      setVotingNodes(prev => prev.filter(n => n.id !== nodeId))
      toast.success(`Node ${data.node_status} by community vote!`)
    }
  }
  // confirmDelete: { kind: 'message', msgId } | { kind: 'reply', msgId, replyId } | null
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: 'message'; msgId: string }
    | { kind: 'reply'; msgId: string; replyId: string }
    | null
  >(null)

  // ── Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [knownUsers, setKnownUsers] = useState<{ username: string; initials: string; rep: string }[]>([])

  useEffect(() => {
    supabase.from('users').select('username, display_name').then(({ data }) => {
      if (data) setKnownUsers(data.map((u: any) => {
        const name = u.display_name ?? u.username
        return {
          username: name,
          initials: name.slice(0, 2).toUpperCase(),
          rep: u.username === userId ? 'You' : 'Member',
        }
      }))
    })
  }, [])

  // ── Mention autocomplete state ─────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)   // null = closed
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionAnchor, setMentionAnchor] = useState<'main' | 'reply' | 'modal'>('main')

  // ── Slash command state ───────────────────────────────────────────────────
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashAnchor, setSlashAnchor] = useState<'main' | 'reply' | 'modal'>('main')

  // Only one command for now; easy to extend later
  const SLASH_COMMANDS = [
    {
      cmd: '/query',
      label: '/query',
      desc: 'Escalate this message as a question to the Q&A section',
      icon: '🔀',
    },
  ]
  const mentionResults = mentionQuery !== null
    ? knownUsers.filter(u =>
        u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) &&
        u.username !== displayName
      )
    : []

  // ── Media state ───────────────────────────────────────────────────────────
  // pending attachments per input surface
  const [mainImages,  setMainImages]  = useState<string[]>([])
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [modalImages, setModalImages] = useState<string[]>([])
  // link preview per surface (null = no URL found, undefined = loading)
  const [mainPreview,  setMainPreview]  = useState<LinkPreview | null | undefined>(null)
  const [replyPreview, setReplyPreview] = useState<LinkPreview | null | undefined>(null)
  const [modalPreview, setModalPreview] = useState<LinkPreview | null | undefined>(null)

  const mainFileRef  = useRef<HTMLInputElement>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)
  const modalFileRef = useRef<HTMLInputElement>(null)

  const msgEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)
  const newPostTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeChannel = channels.find(c => c.id === activeChannelId)!

  // Derived here (after activeChannel) to avoid temporal dead zone
  const sortMode = (activeChannel?.isQuery ? sortModes[activeChannelId] ?? 'top' : 'new') as 'top' | 'new' | 'hot'
  const setSortMode = (mode: 'top' | 'new' | 'hot') => setSortModes(prev => ({ ...prev, [activeChannelId]: mode }))

  const discussionChannels = channels.filter(c => c.category === 'DISCUSSIONS')
  const queryChannels = channels.filter(c => c.category === 'QUERIES')

  // ── Scoring & sorting ────────────────────────────────────────────────────

  function ageMinutes(m: Message): number {
    // Use real createdAt if available, otherwise fall back to parsed timestamp string
    if (m.createdAt) return (Date.now() - m.createdAt) / 60_000
    const match = m.timestamp.match(/^(\d+)(m|h|d)/)
    if (!match) return 0
    return Number(match[1]) * (match[2] === 'h' ? 60 : match[2] === 'd' ? 1440 : 1)
  }

  function scoreMessage(m: Message): number {
    if (m.pendingSend) return -Infinity
    const rep      = parseFloat(m.rep ?? '0') || 0
    const ageHours = ageMinutes(m) / 60
    // Decay is capped so a 0-upvote post never beats a post with even 1 upvote
    const decay = Math.min(ageHours * 0.05, 0.9)
    return m.upvotes * 10 + rep * 0.02 + m.replies.length * 2 - decay
  }

  function hotScore(m: Message): number {
    if (m.pendingSend) return -Infinity
    const ageHours = ageMinutes(m) / 60
    // Recency bonus (0-2 pts) never overrides upvotes (10 pts each)
    const recencyBonus = Math.max(0, 1 - ageHours / 24) * 2
    return m.upvotes * 10 + m.replies.length * 2 + recencyBonus
  }

  const baseMessages = activeChannel && searchQuery.trim()
    ? activeChannel.messages.filter(m =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeChannel?.messages ?? []

  const displayedMessages = [...baseMessages].sort((a, b) => {
    if (a.pendingSend && !b.pendingSend) return 1
    if (!a.pendingSend && b.pendingSend) return -1
    if (!activeChannel?.isQuery) return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    if (sortMode === 'new') return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    if (sortMode === 'hot') return hotScore(b) - hotScore(a)
    return scoreMessage(b) - scoreMessage(a)
  })

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannelId, channels])

  // Mark channel read on open
  useEffect(() => {
    setChannels(prev => prev.map(ch =>
      ch.id === activeChannelId
        ? { ...ch, messages: ch.messages.map(m => ({ ...m, unread: false })) }
        : ch
    ))
    setExpandedReplies(new Set())
    setReplyingTo(null)
    setMsgInput('')
  }, [activeChannelId])

  // Simulate an inbound message every 45-75s (once per session, no re-registration on nav)
  const activeChannelIdRef = useRef(activeChannelId)
  useEffect(() => { activeChannelIdRef.current = activeChannelId }, [activeChannelId])

  useEffect(() => {
    const GHOST: { channelId: string; text: string; initials: string; username: string; isQuestion?: boolean }[] = [
      { channelId: 'general', initials: 'EL', username: 'elena_ml', text: 'Just filled the Backpropagation scaffold — check it out!' },
      { channelId: 'suggestions', initials: 'JD', username: 'jan_dev', text: 'Would love a "related weaves" sidebar on each node.' },
      { channelId: 'theory', initials: 'PR', username: 'priya_cs', text: 'What is the difference between batch and layer normalization?', isQuestion: true },
      { channelId: 'help', initials: 'RK', username: 'ravi_k', text: 'Can scaffold nodes have multiple contributors?', isQuestion: true },
    ]
    // Shuffle so each session gets a different order, preventing same ghost every time
    const shuffled = [...GHOST].sort(() => Math.random() - 0.5)
    let idx = 0
    const fire = () => {
      const g = shuffled[idx % shuffled.length]
      idx++
      const newMsg: Message = {
        id: genId(),
        initials: g.initials,
        username: g.username,
        timestamp: 'just now',
        createdAt: Date.now(),
        unread: g.channelId !== activeChannelIdRef.current,
        text: g.text,
        replies: [],
        upvotes: 0,
        isQuestion: g.isQuestion,
      }
      setChannels(prev => {
        const ch = prev.find(c => c.id === g.channelId)
        // Deduplicate: skip if this ghost text already exists in the channel
        if (ch?.messages.some(m => m.text === g.text)) return prev
        return prev.map(c => c.id === g.channelId ? { ...c, messages: [...c.messages, newMsg] } : c)
      })
    }
    const id = setInterval(fire, 45000 + Math.random() * 30000)
    return () => clearInterval(id)
  }, [])  // empty deps — fires once, uses ref for activeChannelId

  // ── Persistence ──────────────────────────────────────────────────────────

  // Load messages from Supabase when channel changes
  useEffect(() => {
    if (!weaveId || weaveId === 'global') return
    fetchMessages(weaveId, activeChannelId).then((rows) => {
      setChannels(prev => prev.map(ch =>
        ch.id !== activeChannelId ? ch : { ...ch, messages: rows.map(r => dbRowToMessage(r, userId)) }
      ))
    })
  }, [weaveId, activeChannelId])

  // Realtime subscription — only refetch on INSERT/UPDATE/DELETE, not on initial subscribe
  useEffect(() => {
    if (!weaveId || weaveId === 'global') return
    let ready = false
    const unsub = subscribeCommunity(weaveId, () => {
      if (!ready) return
      fetchMessages(weaveId, activeChannelId).then((rows) => {
        setChannels(prev => prev.map(ch =>
          ch.id !== activeChannelId ? ch : { ...ch, messages: rows.map(r => dbRowToMessage(r, userId)) }
        ))
      })
    })
    setTimeout(() => { ready = true }, 500)
    return () => { unsub?.() }
  }, [weaveId, activeChannelId])



  // When weaveId prop changes (user opens a different weave), reload all state.
  // Skip on first mount — useState lazy initialisers already loaded the right data.
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    const k = lsKeys(weaveId)
    setChannels(loadChannels(weaveId, weaveName))
    setActiveChannelId(
      (typeof window !== 'undefined' ? localStorage.getItem(k.active) : null) ?? 'general'
    )
    setVotedIds(loadSet(k.voted))
    setReplyVotedIds(loadSet(k.replyVoted))
    setExpandedReplies(new Set())
    setReplyingTo(null)
    setMsgInput('')
    setSearchQuery('')
    setShowSearch(false)
    setSortModes({})
    clearMedia('main'); clearMedia('reply'); clearMedia('modal')
  }, [weaveId])

  const switchChannel = useCallback((id: string) => {
    setActiveChannelId(id)
    setShowMembers(false)
    setShowSearch(false)
    setSearchQuery('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const toggleReplies = useCallback((msgId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      next.has(msgId) ? next.delete(msgId) : next.add(msgId)
      return next
    })
  }, [])

  const startReply = useCallback((msgId: string, username: string) => {
    setReplyingTo(msgId)
    setExpandedReplies(prev => new Set(prev).add(msgId)) // keep thread open
    setMsgInput(`@${username} `)
    inputRef.current?.focus()
  }, [])

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
    setMsgInput('')
  }, [])

  const handleUpvote = useCallback(async (msgId: string) => {
    const alreadyVoted = votedIds.has(msgId)
    setVotedIds(prev => { const s = new Set(prev); alreadyVoted ? s.delete(msgId) : s.add(msgId); return s })
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id === msgId ? { ...m, upvotes: alreadyVoted ? Math.max(0, m.upvotes - 1) : m.upvotes + 1 } : m
        ),
      }
    ))
    if (weaveId !== 'global') { await toggleMessageUpvote(msgId, userId ?? undefined); if (!alreadyVoted) earn(1) }
    else if (!alreadyVoted) earn(1)
  }, [votedIds, activeChannelId, earn, weaveId])

  const handleReplyUpvote = useCallback(async (msgId: string, replyId: string) => {
    const alreadyVoted = replyVotedIds.has(replyId)
    setReplyVotedIds(prev => { const s = new Set(prev); alreadyVoted ? s.delete(replyId) : s.add(replyId); return s })
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id !== msgId ? m : {
            ...m,
            replies: m.replies.map(r =>
              r.id !== replyId ? r : { ...r, upvotes: alreadyVoted ? Math.max(0, r.upvotes - 1) : r.upvotes + 1 }
            ),
          }
        ),
      }
    ))
    if (weaveId !== 'global') { await toggleReplyUpvote(replyId, userId ?? undefined); if (!alreadyVoted) earn(1) }
    else if (!alreadyVoted) earn(1)
  }, [replyVotedIds, activeChannelId, earn, weaveId])

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : { ...ch, messages: ch.messages.filter(m => m.id !== msgId) }
    ))
    setConfirmDelete(null)
    if (weaveId !== 'global') await deleteMessage(weaveId, msgId, userId ?? undefined)
    // toast('Post deleted.', { style: { borderLeft: '3px solid #EF4444' } })
  }, [activeChannelId, weaveId])

  const handleDeleteReply = useCallback(async (msgId: string, replyId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id !== msgId ? m : { ...m, replies: m.replies.filter(r => r.id !== replyId) }
        ),
      }
    ))
    setConfirmDelete(null)
    if (weaveId !== 'global') await deleteReply(msgId, replyId, userId ?? undefined)
    // toast('Reply deleted.', { style: { borderLeft: '3px solid #EF4444' } })
  }, [activeChannelId, weaveId])

  const handleSend = useCallback(async () => {
    const raw = msgInput.trim()
    const surface = replyingTo ? 'reply' : 'main'
    const images  = surface === 'reply' ? replyImages : mainImages
    const preview = surface === 'reply' ? replyPreview : mainPreview
    if (!raw && images.length === 0) return
    if (!activeChannel) return

    // /query prefix: strip it, auto-escalate to first query channel
    const isQueryCommand = !replyingTo && /^\/query\s*/i.test(raw)
    const text = raw.replace(/^\/query\s*/i, '').trim() || raw

    setSending(true)
    setMsgInput('')
    clearMedia(surface)

    if (replyingTo) {
      const reply: Reply = {
        id: genId(),
        initials: displayName.slice(0, 2).toUpperCase(),
        username: displayName,
        timestamp: 'just now',
        createdAt: Date.now(),
        text,
        upvotes: 0,
        isOwn: true,
        images: images.length > 0 ? images : undefined,
        linkPreview: preview ?? undefined,
      }
      setChannels(prev => prev.map(ch =>
        ch.id !== activeChannelId ? ch : {
          ...ch,
          messages: ch.messages.map(m =>
            m.id === replyingTo ? { ...m, replies: [...m.replies, reply] } : m
          ),
        }
      ))
      setReplyingTo(null)
      if (weaveId !== 'global') await postReply(replyingTo, text, userId ?? undefined, images.length > 0 ? images : undefined)
      await new Promise(r => setTimeout(r, 400))
      setSending(false)
      earn(2)
    //   toast.success('Reply posted! +2 LM', { style: { borderLeft: '3px solid #22C55E' } })
    } else {
      // /query: post into the first query channel (help), switch to it
      const targetChannelId = isQueryCommand
        ? (channels.find(c => c.isQuery)?.id ?? activeChannelId)
        : activeChannelId
      const targetChannel = channels.find(c => c.id === targetChannelId) ?? activeChannel

      const newMsg: Message = {
        id: genId(),
        initials: displayName.slice(0, 2).toUpperCase(),
        username: displayName,
        timestamp: 'just now',
        createdAt: Date.now(),
        unread: false,
        text,
        replies: [],
        upvotes: 0,
        isOwn: true,
        pendingSend: true,
        isQuestion: isQueryCommand || targetChannel.isQuery,
        images: images.length > 0 ? images : undefined,
        linkPreview: preview ?? undefined,
      }
      setChannels(prev => prev.map(ch =>
        ch.id !== targetChannelId ? ch : { ...ch, messages: [...ch.messages, newMsg] }
      ))
      if (isQueryCommand) {
        setActiveChannelId(targetChannelId)
        toast('🔀 Escalated to #' + targetChannel.name, { style: { borderLeft: '3px solid #6366f1' } })
      }
      if (weaveId !== 'global') {
        const saved = await postMessage(weaveId, targetChannelId, text, isQueryCommand || targetChannel.isQuery, userId ?? undefined, images.length > 0 ? images : undefined)
        if (saved) {
          setChannels(prev => prev.map(ch =>
            ch.id !== targetChannelId ? ch : {
              ...ch,
              messages: ch.messages.map(m => m.id === newMsg.id ? { ...m, id: saved.id, pendingSend: false } : m),
            }
          ))
        }
      } else {
        await new Promise(r => setTimeout(r, 600))
        setChannels(prev => prev.map(ch =>
          ch.id !== targetChannelId ? ch : {
            ...ch,
            messages: ch.messages.map(m => m.id === newMsg.id ? { ...m, pendingSend: false } : m),
          }
        ))
      }
      setSending(false)
      earn(isQueryCommand || targetChannel.isQuery ? 5 : 2)
    //   toast.success(
    //     isQueryCommand ? 'Question escalated to #' + targetChannel.name + '! +5 LM'
    //       : targetChannel.isQuery ? 'Question posted! +5 LM'
    //       : 'Message sent! +2 LM',
    //     { style: { borderLeft: '3px solid #22C55E' } }
    //   )
    }
  }, [msgInput, replyingTo, activeChannel, activeChannelId, channels, earn, mainImages, replyImages, mainPreview, replyPreview])

  const handleNewPost = useCallback(async () => {
    const text = newPostText.trim()
    if (!text && modalImages.length === 0) return
    const targetChannel = channels.find(c => c.id === newPostChannelId)
    if (!targetChannel) return
    setSending(true)
    const isQ = newPostType === 'question' || targetChannel.isQuery
    const newMsg: Message = {
      id: genId(),
      initials: displayName.slice(0, 2).toUpperCase(),
      username: displayName,
      timestamp: 'just now',
      createdAt: Date.now(),
      unread: false,
      text,
      replies: [],
      upvotes: 0,
      isOwn: true,
      pendingSend: true,
      isQuestion: isQ,
      images: modalImages.length > 0 ? modalImages : undefined,
      linkPreview: modalPreview ?? undefined,
    }
    setChannels(prev => prev.map(ch =>
      ch.id !== newPostChannelId ? ch : { ...ch, messages: [...ch.messages, newMsg] }
    ))
    // Switch to the channel the post went to
    setActiveChannelId(newPostChannelId)
    if (weaveId !== 'global') {
      const saved = await postMessage(weaveId, newPostChannelId, text, isQ, userId ?? undefined)
      if (saved) {
        setChannels(prev => prev.map(ch =>
          ch.id !== newPostChannelId ? ch : {
            ...ch,
            messages: ch.messages.map(m => m.id === newMsg.id ? { ...m, id: saved.id, pendingSend: false } : m),
          }
        ))
      }
    } else {
      await new Promise(r => setTimeout(r, 500))
      setChannels(prev => prev.map(ch =>
        ch.id !== newPostChannelId ? ch : {
          ...ch,
          messages: ch.messages.map(m => m.id === newMsg.id ? { ...m, pendingSend: false } : m),
        }
      ))
    }
    setSending(false)
    setShowNewPost(false)
    setNewPostText('')
    clearMedia('modal')
    earn(isQ ? 5 : 2)
    // toast.success(`Posted to #${targetChannel.name}! ${isQ ? '+5 LM' : '+2 LM'}`, { style: { borderLeft: '3px solid #22C55E' } })
  }, [newPostText, newPostType, newPostChannelId, channels, earn, modalImages, modalPreview])

  // Promote a discussion message to the first available query channel
  const handlePromoteToQuery = useCallback((msgId: string) => {
    const sourceChannel = channels.find(c => c.id === activeChannelId)
    const targetChannel = channels.find(c => c.isQuery)
    if (!sourceChannel || !targetChannel) return
    const msg = sourceChannel.messages.find(m => m.id === msgId)
    if (!msg) return

    const promoted: Message = { ...msg, isQuestion: true, id: genId(), createdAt: Date.now(), pendingSend: false }

    setChannels(prev => prev.map(ch => {
      if (ch.id === activeChannelId) return { ...ch, messages: ch.messages.filter(m => m.id !== msgId) }
      if (ch.id === targetChannel.id) return { ...ch, messages: [...ch.messages, promoted] }
      return ch
    }))
    setActiveChannelId(targetChannel.id)
    // toast('🔀 Promoted to #' + targetChannel.name, { style: { borderLeft: '3px solid #6366f1' } })
  }, [channels, activeChannelId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Slash command dropdown navigation
    if (slashOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickSlashCommand(SLASH_COMMANDS[0].cmd, slashAnchor)
        return
      }
      if (e.key === 'Escape') { setSlashOpen(false); return }
    }
    // Mention dropdown navigation
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(mentionResults[mentionIndex].username)
        return
      }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { cancelReply() }
  }

  /** Called on every keystroke in any mention-aware input */
  function handleMentionInput(
    value: string,
    setter: (v: string) => void,
    anchor: 'main' | 'reply' | 'modal',
    inputEl: HTMLInputElement | HTMLTextAreaElement | null,
  ) {
    setter(value)
    const cursor = inputEl?.selectionStart ?? value.length
    // Slash command: show if value starts with / (and we're not in a reply)
    if (anchor !== 'reply' && /^\/[a-z]*$/i.test(value.slice(0, cursor))) {
      setSlashOpen(true)
      setSlashAnchor(anchor)
      setMentionQuery(null)
      return
    } else {
      setSlashOpen(false)
    }
    // Mention detection
    const q = getMentionQuery(value, cursor)
    if (q !== null) {
      setMentionQuery(q)
      setMentionIndex(0)
      setMentionAnchor(anchor)
    } else {
      setMentionQuery(null)
    }
  }

  /** Insert /command into the right input, placing cursor after the command */
  function pickSlashCommand(cmd: string, anchor: 'main' | 'reply' | 'modal') {
    const ref    = anchor === 'modal' ? newPostTextareaRef.current : inputRef.current
    const setter = anchor === 'modal' ? setNewPostText : setMsgInput
    const text   = cmd + ' '
    setter(text)
    setSlashOpen(false)
    requestAnimationFrame(() => {
      if (ref) { ref.focus(); ref.setSelectionRange(text.length, text.length) }
    })
  }

  /** Insert chosen username into the right input */
  function pickMention(username: string) {
    const ref =
      mentionAnchor === 'main'  ? inputRef.current :
      mentionAnchor === 'reply' ? replyInputRef.current :
                                  newPostTextareaRef.current
    const current =
      mentionAnchor === 'main'  ? msgInput :
      mentionAnchor === 'reply' ? msgInput :   // reply reuses msgInput
                                  newPostText
    const setter =
      mentionAnchor === 'modal' ? setNewPostText : setMsgInput

    const cursor = ref?.selectionStart ?? current.length
    const { text, cursor: newCursor } = insertMention(current, cursor, username)
    setter(text)
    setMentionQuery(null)
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      if (ref) { ref.focus(); ref.setSelectionRange(newCursor, newCursor) }
    })
  }

  // ── Media handlers ────────────────────────────────────────────────────────

  async function handleImagePick(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    if (!files || files.length === 0) return
    const urls = await uploadFilesToStorage(files)
    setter(prev => [...prev, ...urls].slice(0, 4))
  }

  function removeImage(
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  // Debounced link preview fetch — one per surface
  const previewTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  function triggerLinkPreview(
    text: string,
    setter: React.Dispatch<React.SetStateAction<LinkPreview | null | undefined>>,
    key: string,
  ) {
    clearTimeout(previewTimers.current[key])
    const url = detectUrl(text)
    if (!url) { setter(null); return }
    setter(undefined) // loading
    previewTimers.current[key] = setTimeout(async () => {
      const preview = await fetchLinkPreview(url)
      setter(preview)
    }, 600)
  }

  // Wrap handleMentionInput to also trigger link preview
  function handleMediaMentionInput(
    value: string,
    setter: (v: string) => void,
    anchor: 'main' | 'reply' | 'modal',
    inputEl: HTMLInputElement | HTMLTextAreaElement | null,
    previewSetter: React.Dispatch<React.SetStateAction<LinkPreview | null | undefined>>,
    previewKey: string,
  ) {
    handleMentionInput(value, setter, anchor, inputEl)
    triggerLinkPreview(value, previewSetter, previewKey)
  }

  // Reset all media for a surface
  function clearMedia(surface: 'main' | 'reply' | 'modal') {
    if (surface === 'main')  { setMainImages([]);  setMainPreview(null)  }
    if (surface === 'reply') { setReplyImages([]); setReplyPreview(null) }
    if (surface === 'modal') { setModalImages([]); setModalPreview(null) }
  }

  // ── Media sub-components ─────────────────────────────────────────────────

  function ImagePreviewStrip({
    images, onRemove
  }: {
    images: string[]
    onRemove: (i: number) => void
  }) {
    if (images.length === 0) return null
    return (
      <div className="flex gap-1.5 flex-wrap px-1 pt-1">
        {images.map((src, i) => (
          <div key={i} className="relative group h-14 w-14 rounded-md overflow-hidden border border-border shrink-0">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              onMouseDown={e => { e.preventDefault(); onRemove(i) }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  function LinkPreviewCard({ preview }: { preview: LinkPreview | null | undefined }) {
    if (preview === null) return null
    if (preview === undefined) return (
      <div className="mx-1 mt-1 rounded-md border border-border/50 bg-secondary/30 px-3 py-2 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
        <span className="text-[10px] text-muted-foreground">Loading preview…</span>
      </div>
    )
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-1 mt-1.5 flex gap-2.5 rounded-md border border-border/60 bg-secondary/30 hover:bg-secondary/60 overflow-hidden transition-colors no-underline"
        onMouseDown={e => e.stopPropagation()}
      >
        {preview.image && (
          <img
            src={preview.image}
            alt=""
            className="h-16 w-16 shrink-0 object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="min-w-0 py-2 pr-2 flex-1">
          <p className="text-[10px] font-bold text-primary truncate">{preview.domain}</p>
          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1 mt-0.5">{preview.title}</p>
          {preview.description && (
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{preview.description}</p>
          )}
        </div>
      </a>
    )
  }

  // ── Mention dropdown ──────────────────────────────────────────────────────

  function MentionDropdown({ anchor }: { anchor: 'main' | 'reply' | 'modal' }) {
    if (mentionQuery === null || mentionAnchor !== anchor || mentionResults.length === 0) return null
    return (
      <div className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
        <div className="px-2 py-1 border-b border-border/40">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mention a user</span>
        </div>
        {mentionResults.map((u, i) => (
          <button
            key={u.username}
            onMouseDown={e => { e.preventDefault(); pickMention(u.username) }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              i === mentionIndex ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary/50'
            }`}
          >
            <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
              {u.initials}
            </div>
            <span className="text-xs font-semibold">@{u.username}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{u.rep}</span>
          </button>
        ))}
      </div>
    )
  }

  // ── Slash command dropdown ───────────────────────────────────────────────

  function CommandDropdown({ anchor }: { anchor: 'main' | 'reply' | 'modal' }) {
    if (!slashOpen || slashAnchor !== anchor) return null
    return (
      <div className="absolute bottom-full mb-1.5 left-0 right-0 z-50 rounded-lg border border-indigo-500/30 bg-card shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-indigo-500/5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Commands</span>
          <span className="text-[9px] text-muted-foreground ml-auto">Tab or Enter to select</span>
        </div>
        {SLASH_COMMANDS.map(c => (
          <button
            key={c.cmd}
            onMouseDown={e => { e.preventDefault(); pickSlashCommand(c.cmd, anchor) }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-indigo-500/10 transition-colors group"
          >
            <span className="text-base leading-none">{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300">{c.label}</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{c.desc}</p>
            </div>
            <kbd className="shrink-0 rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground font-mono">↵</kbd>
          </button>
        ))}
      </div>
    )
  }

  // ── Sidebar channel row ───────────────────────────────────────────────────

  function ChannelRow({ ch }: { ch: Channel }) {
    const unreadCount = ch.messages.filter(m => m.unread).length
    const isActive = ch.id === activeChannelId && !showMembers
    return (
      <button
        onClick={() => switchChannel(ch.id)}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors ${
          isActive
            ? 'bg-primary/15 text-foreground'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        }`}
      >
        <Hash className={`h-3 w-3 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <span className={`flex-1 truncate text-xs ${isActive ? 'font-semibold' : ''}`}>{ch.name}</span>
        {unreadCount > 0 && !isActive && (
          <span className="shrink-0 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground leading-4 min-w-[16px] text-center">
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  // ── Message card ──────────────────────────────────────────────────────────

  function MessageCard({ msg }: { msg: Message }) {
    const hasVoted = votedIds.has(msg.id)
    const isExpanded = expandedReplies.has(msg.id)
    const isHot = msg.upvotes > 5
    const replyCount = msg.replies.length

    return (
      <div className={`rounded-lg px-3 py-2.5 transition-all ${
        msg.pendingSend ? 'opacity-60' : ''
      } ${msg.isOwn ? 'border-l-2 border-l-primary/40 bg-secondary/20' : 'hover:bg-secondary/20'}`}>

        {/* Top row: avatar + username + timestamp + rep */}
        <div className="flex items-start gap-2.5">
          <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {msg.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-bold text-foreground">@{msg.username}</span>
              <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
              {msg.pendingSend && <span className="text-[9px] text-muted-foreground italic">sending…</span>}
              {msg.rep && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                  {msg.rep}
                </span>
              )}
            </div>

            {/* Message text + attachments */}
            {msg.text && (
              <RichContent
                text={msg.text}
                attachments={msg.images}
                className="text-xs"
              />
            )}

            {/* Link preview */}
            {msg.linkPreview && <LinkPreviewCard preview={msg.linkPreview} />}

            {/* Action row */}
            <div className="flex items-center gap-3 mt-1.5">
              {/* Replies toggle */}
              <button
                onClick={() => toggleReplies(msg.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                title={replyCount > 0 ? `${isExpanded ? 'Hide' : 'Show'} ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : 'Reply'}
              >
                <MessageSquare className="h-3 w-3" />
                {replyCount > 0 ? (
                  <span>{replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
                ) : (
                  <span>Reply</span>
                )}
              </button>

              {/* Upvote */}
              <button
                onClick={() => handleUpvote(msg.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  hasVoted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                title={hasVoted ? 'Remove vote' : 'Upvote'}
              >
                <ArrowUp className={`h-3 w-3 ${hasVoted ? 'fill-primary' : ''}`} />
                {msg.upvotes > 0 && <span>{msg.upvotes}</span>}
                {isHot && <Flame className="h-3 w-3 text-orange-400 ml-0.5" />}
              </button>

              {/* Promote to query — only in discussion channels */}
              {!activeChannel.isQuery && !msg.isQuestion && (
                <button
                  onClick={() => handlePromoteToQuery(msg.id)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-indigo-400 transition-colors"
                  title="Escalate to Q&A"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Escalate</span>
                </button>
              )}

              {/* Delete — own posts only */}
              {msg.isOwn && (
                <button
                  onClick={() => setConfirmDelete({ kind: 'message', msgId: msg.id })}
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded reply thread */}
        {isExpanded && (
          <div className="mt-2.5 ml-9 border-l-2 border-border/40 pl-3 space-y-2.5">
            {/* Existing replies — sorted by upvotes */}
            {msg.replies.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">No replies yet — be the first!</p>
            )}
            {[...msg.replies].sort((a, b) => b.upvotes - a.upvotes).map(r => {
              const replyVoted = replyVotedIds.has(r.id)
              return (
                <div key={r.id} className={`flex gap-2 ${r.isOwn ? 'opacity-90' : ''}`}>
                  <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                    {r.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-foreground">@{r.username}</span>
                      <span className="text-[10px] text-muted-foreground">{r.timestamp}</span>
                    </div>
                    {r.text && (
                      <RichContent text={r.text} attachments={r.images} className="text-[11px]" />
                    )}
                    {/* Reply link preview */}
                    {r.linkPreview && <LinkPreviewCard preview={r.linkPreview} />}

                    {/* Reply actions: upvote + delete-own */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleReplyUpvote(msg.id, r.id)}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${
                          replyVoted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        }`}
                        title={replyVoted ? 'Remove vote' : 'Upvote this reply'}
                      >
                        <ArrowUp className={`h-2.5 w-2.5 ${replyVoted ? 'fill-primary' : ''}`} />
                        {r.upvotes > 0 && <span>{r.upvotes}</span>}
                      </button>
                      {r.isOwn && (
                        <button
                          onClick={() => setConfirmDelete({ kind: 'reply', msgId: msg.id, replyId: r.id })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete reply"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Reply input inline */}
            {replyingTo === msg.id ? (
              <div className="flex gap-2 items-start">
                <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">D</div>
                <div className="flex-1 space-y-1">
                  {/* Hidden file input */}
                  <input
                    ref={replyFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handleImagePick(e.target.files, setReplyImages)}
                  />
                  <ImagePreviewStrip images={replyImages} onRemove={i => removeImage(i, setReplyImages)} />
                  <LinkPreviewCard preview={replyPreview} />
                  <div className="relative flex items-center gap-1.5 rounded-md bg-secondary/50 border border-primary/30 px-2 py-1.5">
                    <MentionDropdown anchor="reply" />
                    <button
                      onMouseDown={e => { e.preventDefault(); replyFileRef.current?.click() }}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Attach image"
                    >
                      <Paperclip className="h-3 w-3" />
                    </button>
                    <input
                      autoFocus
                      ref={replyInputRef}
                      type="text"
                      value={msgInput}
                      onChange={e => handleMediaMentionInput(e.target.value, setMsgInput, 'reply', e.target, setReplyPreview, 'reply')}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a reply… (@ or paste link)"
                      disabled={sending}
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {(msgInput.trim() || replyImages.length > 0) && (
                      <button onClick={handleSend} disabled={sending} className="text-primary hover:text-primary/80 shrink-0">
                        <Send className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startReply(msg.id, msg.username)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                <CornerDownRight className="h-3 w-3" />
                <span>Add a reply</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d0d] relative">

      {/* ── Sidebar ── */}
      <div className="flex w-44 shrink-0 flex-col border-r border-border/40 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 sticky top-0 bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {weaveName ?? 'Community'}
              </p>
              {weaveName && (
                <p className="text-[9px] text-muted-foreground leading-none">community hub</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-1 rounded transition-colors ${showMembers ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="Members"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Channel list */}
        <div className="flex-1 py-2">
          {/* DISCUSSIONS */}
          <div className="mb-1">
            <button
              onClick={() => setCollapsedCats(p => ({ ...p, DISCUSSIONS: !p.DISCUSSIONS }))}
              className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsedCats.DISCUSSIONS ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              DISCUSSIONS
            </button>
            {!collapsedCats.DISCUSSIONS && (
              <div className="mt-0.5 px-2 flex flex-col gap-0.5">
                {discussionChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
              </div>
            )}
          </div>

          {/* QUERIES */}
          <div className="mb-1 mt-2">
            <button
              onClick={() => setCollapsedCats(p => ({ ...p, QUERIES: !p.QUERIES }))}
              className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsedCats.QUERIES ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              QUERIES
            </button>
            {!collapsedCats.QUERIES && (
              <div className="mt-0.5 px-2 flex flex-col gap-0.5">
                {queryChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
              </div>
            )}
          </div>

          {/* VOTES */}
          {votingNodes.length > 0 && (
            <div className="mb-1 mt-2">
              <p className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                VOTES
              </p>
              <div className="mt-0.5 px-2">
                <button
                  onClick={() => setActiveChannelId('__votes__')}
                  className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors ${activeChannelId === '__votes__' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                >
                  <ThumbsUp className="h-3 w-3 shrink-0" />
                  <span className="truncate text-xs">community votes</span>
                  <span className="ml-auto shrink-0 rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">{votingNodes.length}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Self */}
        <div className="border-t border-border/40 px-2 py-2 flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">D</div>
            <StatusDot status="online" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-primary truncate">Online</p>
          </div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {activeChannelId === '__votes__' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <ThumbsUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Community Votes</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{votingNodes.length} pending</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {votingNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-8">No nodes up for vote right now.</p>
              ) : votingNodes.map((node) => (
                <div key={node.id} className="rounded-lg border border-border bg-card/60 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground">{node.title}</p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">Vote</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 line-clamp-4 whitespace-pre-wrap">{node.description}</p>
                  {node.contributed_by && <p className="text-[10px] text-muted-foreground mb-2">by @{node.contributed_by}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => castNodeVote(node.id, 'accept')}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${nodeUserVotes[node.id] === 'accept' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-border text-muted-foreground hover:text-green-400 hover:border-green-500/40'}`}
                    >
                      <ThumbsUp className="h-3 w-3" /> Accept
                    </button>
                    <button
                      onClick={() => castNodeVote(node.id, 'reject')}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${nodeUserVotes[node.id] === 'reject' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40'}`}
                    >
                      <ThumbsDown className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showMembers ? (
          <>
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Members</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{ONLINE_MEMBERS.length} online</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Online — {ONLINE_MEMBERS.filter(m => m.status === 'online').length}
              </p>
              {ONLINE_MEMBERS.map(m => (
                <div key={m.name} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">{m.initials}</div>
                    <StatusDot status={m.status} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">@{m.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.activity}</p>
                  </div>
                </div>
              ))}
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Offline — 12</p>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 opacity-35">
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center text-xs text-muted-foreground">?</div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d0d] bg-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">member_{i + 5}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">{activeChannel.name}</span>
              <span className="text-[10px] text-muted-foreground ml-1">
                {activeChannel.isQuery ? '· Q&A' : '· Discussion'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* Sort toggle — queries only; discussions are always newest-first */}
                {activeChannel.isQuery && (
                  <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
                    {(['top', 'hot', 'new'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setSortMode(mode)}
                        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${
                          sortMode === mode
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={mode === 'top' ? 'Top (score + rep)' : mode === 'hot' ? 'Hot (trending now)' : 'New (recent first)'}
                      >
                        {mode === 'hot' ? '🔥' : mode === 'top' ? '↑' : '🕐'}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setShowSearch(p => !p); if (showSearch) setSearchQuery('') }}
                  className={`transition-colors ${showSearch ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Search"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setNewPostChannelId(activeChannelId)
                    setNewPostType(activeChannel.isQuery ? 'question' : 'message')
                    setShowNewPost(true)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="New post"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Inline search */}
            {showSearch && (
              <div className="px-3 py-2 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/50 px-2 py-1.5">
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search in this channel…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                    {displayedMessages.length} result{displayedMessages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Sponsored */}
            <div className="px-3 pt-3 shrink-0">
              <SponsoredCard ad={SPONSORED_ADS[1]} variant="banner" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {/* Date divider */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] text-muted-foreground">Today</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  {searchQuery ? (
                    <p className="text-xs text-muted-foreground">No results for "{searchQuery}"</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">No posts yet in #{activeChannel.name}</p>
                      <button
                        onClick={() => setShowNewPost(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Be the first to post
                      </button>
                    </>
                  )}
                </div>
              ) : (
                displayedMessages.map(msg => <MessageCard key={msg.id} msg={msg} />)
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Bottom input — only for new top-level posts when not replying */}
            {replyingTo === null && (
              <div className="shrink-0 px-3 pb-3 pt-1">
                {/* Hidden file input */}
                <input
                  ref={mainFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleImagePick(e.target.files, setMainImages)}
                />
                {/* Image preview strip */}
                <ImagePreviewStrip images={mainImages} onRemove={i => removeImage(i, setMainImages)} />
                {/* Link preview */}
                <LinkPreviewCard preview={mainPreview} />
                <div className={`relative flex items-center gap-2 rounded-lg bg-secondary/50 border px-2 py-2 transition-colors mt-1 ${slashOpen && slashAnchor === 'main' ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-border/50 focus-within:border-primary/40'}`}>
                  <CommandDropdown anchor="main" />
                  <MentionDropdown anchor="main" />
                  {/* Attach button */}
                  <button
                    onMouseDown={e => { e.preventDefault(); mainFileRef.current?.click() }}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Attach image"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={activeChannel.isQuery ? 'Ask a question… (@ or paste link)' : `Message #${activeChannel.name} — type /query to escalate`}
                    value={msgInput}
                    onChange={e => handleMediaMentionInput(e.target.value, setMsgInput, 'main', e.target, setMainPreview, 'main')}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className={`flex-1 bg-transparent text-xs placeholder:text-muted-foreground outline-none disabled:opacity-60 ${slashOpen && slashAnchor === 'main' ? 'text-indigo-400 font-medium' : 'text-foreground'}`}
                  />
                  {(msgInput.trim() || mainImages.length > 0) ? (
                    <button onClick={handleSend} disabled={sending} className="shrink-0 text-primary hover:text-primary/80 disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1 ml-1">Enter to send · /query to escalate to Q&A · @ to mention · 📎 attach</p>
              </div>
            )}
          </>
        )}
      </div>
      )

      {/* ── New post modal ── */}
      {showNewPost && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowNewPost(false) }}
        >
          <div className="w-80 rounded-xl border border-border bg-card p-5 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">New Post</h3>
              <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Channel picker — two columns: Discussions | Queries */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Post to</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setNewPostChannelId(ch.id)
                    // auto-flip type to match channel kind
                    setNewPostType(ch.isQuery ? 'question' : 'message')
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all border ${
                    newPostChannelId === ch.id
                      ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                      : 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <Hash className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                  {ch.isQuery && (
                    <span className="ml-auto text-[9px] opacity-60">Q&A</span>
                  )}
                </button>
              ))}
            </div>

            {/* Type toggle — only shown for discussion channels */}
            {!channels.find(c => c.id === newPostChannelId)?.isQuery && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Type</p>
                <div className="flex gap-2 mb-4">
                  {(['message', 'question'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewPostType(t)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        newPostType === t
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground border-border hover:border-primary/30'
                      }`}
                    >
                      {t === 'question' ? '? Question' : '# Message'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Hidden file input for modal */}
            <input
              ref={modalFileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleImagePick(e.target.files, setModalImages)}
            />

            <div className="relative">
              <CommandDropdown anchor="modal" />
              <MentionDropdown anchor="modal" />
              <textarea
                ref={newPostTextareaRef}
                autoFocus
                rows={3}
                placeholder={
                  channels.find(c => c.id === newPostChannelId)?.isQuery || newPostType === 'question'
                    ? 'What do you want to know? (@ or paste link)'
                    : 'Share something… (@ or paste link)'
                }
                value={newPostText}
                onChange={e => handleMediaMentionInput(e.target.value, setNewPostText, 'modal', e.target, setModalPreview, 'modal')}
                onKeyDown={e => {
                  if (slashOpen) {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickSlashCommand(SLASH_COMMANDS[0].cmd, 'modal'); return }
                    if (e.key === 'Escape') { setSlashOpen(false); return }
                  }
                  if (mentionQuery !== null && mentionResults.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionResults[mentionIndex].username); return }
                    if (e.key === 'Escape')    { setMentionQuery(null); return }
                  }
                  if (e.key === 'Escape') setShowNewPost(false)
                }}
                className="w-full resize-none bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Modal image preview + link preview */}
            <ImagePreviewStrip images={modalImages} onRemove={i => removeImage(i, setModalImages)} />
            <LinkPreviewCard preview={modalPreview} />

            <div className="flex items-center gap-2 mt-3">
              {/* Attach button */}
              <button
                onClick={() => modalFileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground border border-border hover:text-primary hover:border-primary/40 transition-colors shrink-0"
                title="Attach images"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {modalImages.length > 0 && <span className="text-primary font-semibold">{modalImages.length}</span>}
              </button>
              <button
                onClick={() => { setShowNewPost(false); setNewPostText(''); clearMedia('modal') }}
                className="flex-1 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewPost}
                disabled={(!newPostText.trim() && modalImages.length === 0) || sending}
                className="flex-1 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? 'Posting…' : `Post to #${channels.find(c => c.id === newPostChannelId)?.name ?? ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightboxSrc && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[90%] max-w-[90%] rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div className="w-64 rounded-xl border border-border bg-card p-5 shadow-2xl mx-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete {confirmDelete.kind}?</p>
                <p className="text-[10px] text-muted-foreground">This can't be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.kind === 'message') {
                    handleDeleteMessage(confirmDelete.msgId)
                  } else {
                    handleDeleteReply(confirmDelete.msgId, confirmDelete.replyId)
                  }
                }}
                className="flex-1 py-2 rounded-md text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}