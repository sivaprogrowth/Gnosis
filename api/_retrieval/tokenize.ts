/**
 * Simple tokenizer for lexical retrieval scoring.
 *
 * Lowercase → strip punctuation → split on whitespace → drop stopwords
 * → drop 1-char tokens. Returns a Set for O(1) overlap tests.
 */

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "do",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "so",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "you",
  "your",
  "yours",
])

const NON_WORD = /[^a-z0-9]+/g

export function tokenize(input: string): Set<string> {
  if (!input) return new Set()
  const lower = input.toLowerCase()
  const raw = lower.split(NON_WORD)
  const out = new Set<string>()
  for (const t of raw) {
    if (!t) continue
    if (t.length < 2) continue
    if (STOPWORDS.has(t)) continue
    out.add(t)
  }
  return out
}

export function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
  for (const t of smaller) if (larger.has(t)) count++
  return count
}
