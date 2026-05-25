#!/usr/bin/env bash
# strip-progrowth-sections.sh — Strip ProGrowth tactical notes from a tree of
# markdown files so they don't ship to the public site.
#
# Two passes:
#   1. Drop any H2 section whose heading contains "ProGrowth" (the section + body
#      until the next ## heading or EOF). Catches `## ProGrowth relevance`,
#      `## Strategic significance for ProGrowth`, etc.
#   2. Strip the literal `progrowth` tag from frontmatter `tags: […]` arrays,
#      preserving `[[progrowth]]` wiki-links (which look similar but aren't tags).
#
# Idempotent — running twice produces the same result.
#
# Usage:
#   strip-progrowth-sections.sh <directory>
#
# Used by:
#   - scripts/sync-wiki.sh   (legacy local sync)
#   - scripts/build-content.cjs (new build-time pipeline)

set -euo pipefail

DIR="${1:-}"
if [[ -z "$DIR" || ! -d "$DIR" ]]; then
  echo "usage: $(basename "$0") <directory>" >&2
  echo "  $DIR is not a directory" >&2
  exit 2
fi

# Pass 1: Drop H2 sections whose heading contains "ProGrowth"
# Note: `find … -exec sh -c` instead of process substitution → safe under POSIX shells.
find "$DIR" -type f -name '*.md' -print0 | while IFS= read -r -d '' f; do
  awk '
    /^## .*ProGrowth/ { skip=1; next }
    skip && /^## / { skip=0 }
    !skip { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

# Pass 2: Strip `progrowth` tag from frontmatter (preserving [[wiki-links]])
# Perl with lookarounds: the `(?![-\w])` and `(?<!\[)` guards prevent mangling
# `[[progrowth]]` or compound tags like `progrowth-website`.
find "$DIR" -type f -name '*.md' -print0 | while IFS= read -r -d '' f; do
  perl -i -pe 's/, progrowth(?![-\w])//g; s/progrowth, //g; s/(?<!\[)\[progrowth\](?!\])/[]/g' "$f"
done
