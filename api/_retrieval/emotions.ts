/**
 * Controlled emotion + aesthetic vocabulary for Gnosis retrieval.
 *
 * Pages and queries carry open-vocab emotion tags (for display/serendipity)
 * alongside a mapping into this controlled vocabulary (for matching).
 *
 * Emotion primaries are Plutchik's 8. Aesthetic axes are ~20 adjective pairs
 * common to describing visual/written works.
 */

export const EMOTION_PRIMARIES = [
  "joy",
  "trust",
  "fear",
  "surprise",
  "sadness",
  "disgust",
  "anger",
  "anticipation",
] as const

export const AESTHETIC_AXES = [
  "warm",
  "cool",
  "bold",
  "subtle",
  "vintage",
  "modern",
  "organic",
  "geometric",
  "minimal",
  "ornate",
  "soft",
  "hard",
  "light",
  "dark",
  "bright",
  "muted",
  "dense",
  "spacious",
  "playful",
  "serious",
] as const

export type EmotionPrimary = (typeof EMOTION_PRIMARIES)[number]
export type AestheticAxis = (typeof AESTHETIC_AXES)[number]

const PRIMARY_SET = new Set<string>(EMOTION_PRIMARIES)
const AESTHETIC_SET = new Set<string>(AESTHETIC_AXES)

export function isEmotionPrimary(s: string): s is EmotionPrimary {
  return PRIMARY_SET.has(s)
}

export function isAestheticAxis(s: string): s is AestheticAxis {
  return AESTHETIC_SET.has(s)
}

export function filterToPrimaries(tags: readonly string[]): EmotionPrimary[] {
  return tags.filter(isEmotionPrimary)
}

export function filterToAesthetic(tags: readonly string[]): AestheticAxis[] {
  return tags.filter(isAestheticAxis)
}
