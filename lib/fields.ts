import { Braces, Zap, Microscope, BookOpen, DollarSign, Clock, Palette } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FieldConfig {
  name: string
  icon: LucideIcon
  keywords: string[]
}

export const FIELDS: FieldConfig[] = [
  {
    name: 'Computer Science',
    icon: Braces,
    keywords: [
      'computer', 'programming', 'software', 'algorithm', 'machine learning',
      'data structure', 'neural', 'artificial intelligence', 'python', 'javascript',
      'web dev', 'database', 'networking', 'operating system', 'deep learning',
      'nlp', 'computer vision', 'cybersecurity', 'cloud', 'devops',
    ],
  },
  {
    name: 'Mathematics',
    icon: Zap,
    keywords: [
      'math', 'calculus', 'algebra', 'geometry', 'statistics', 'probability',
      'linear', 'differential', 'number theory', 'topology', 'discrete',
      'combinatorics', 'analysis', 'trigonometry',
    ],
  },
  {
    name: 'Physics',
    icon: Microscope,
    keywords: [
      'physics', 'quantum', 'mechanics', 'thermodynamics', 'electro',
      'relativity', 'optics', 'particle', 'astrophysics', 'fluid dynamics',
      'nuclear', 'wave',
    ],
  },
  {
    name: 'Biology',
    icon: BookOpen,
    keywords: [
      'biology', 'cell', 'genetics', 'dna', 'evolution', 'ecology',
      'anatomy', 'microbiology', 'biochemistry', 'neuroscience', 'immunology',
      'molecular', 'organism', 'protein',
    ],
  },
  {
    name: 'Economics',
    icon: DollarSign,
    keywords: [
      'economics', 'finance', 'macroeconomics', 'microeconomics', 'market',
      'trading', 'investment', 'fiscal', 'monetary', 'supply chain',
      'behavioural economics', 'crypto', 'blockchain',
    ],
  },
  {
    name: 'Language Learning',
    icon: BookOpen,
    keywords: [
      'language', 'linguistics', 'grammar', 'vocabulary', 'spanish',
      'french', 'japanese', 'mandarin', 'english', 'german', 'arabic',
      'phonetics', 'syntax', 'writing',
    ],
  },
  {
    name: 'History',
    icon: Clock,
    keywords: [
      'history', 'historical', 'ancient', 'medieval', 'war', 'civilization',
      'empire', 'revolution', 'world war', 'renaissance', 'colonialism',
      'archaeology', 'political history',
    ],
  },
  {
    name: 'Design',
    icon: Palette,
    keywords: [
      'design', 'ui', 'ux', 'typography', 'graphic', 'figma', 'branding',
      'color theory', 'illustration', 'motion', 'product design', 'visual',
      'interface', 'accessibility',
    ],
  },
]

/** Match a weave to a field.
 *  Checks the stored `field` tag first (exact match) — set when a weave is
 *  created from inside a field page. Falls back to keyword matching for
 *  weaves created before field tagging was added. */
export function matchesField(
  weave: { topic: string; field?: string },
  fieldName: string,
  keywords: string[]
): boolean {
  if (weave.field) {
    return weave.field.toLowerCase() === fieldName.toLowerCase()
  }
  const t = weave.topic.toLowerCase()
  return keywords.some(k => t.includes(k))
}