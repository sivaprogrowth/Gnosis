/**
 * Reduce whatever the model returned as a slug to a bare kebab-case name.
 * Strips folder components ("concept/companies/anthropic" → "anthropic"),
 * a trailing ".md", and anything that is not [a-z0-9-]. Returns "" if nothing
 * usable remains.
 */
export function sanitizeEntitySlug(raw: string): string {
  const last = raw.trim().split("/").filter(Boolean).pop() ?? ""
  return last
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
