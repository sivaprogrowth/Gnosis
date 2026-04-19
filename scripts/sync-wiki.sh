#!/usr/bin/env bash
# sync-wiki.sh — Copy Gnosis wiki content into Quartz's content/ dir.
# Strips any "## ProGrowth relevance" section (section + body until next ## or EOF)
# so internal tactical notes don't end up in the public demo.
#
# Canonical wiki stays at ~/Projects/gnosis/wiki/ — unchanged by this script.

set -euo pipefail

WIKI_SRC="${WIKI_SRC:-$HOME/Projects/gnosis/wiki}"
SITE_DST="${SITE_DST:-$HOME/Projects/gnosis-site/content}"

if [[ ! -d "$WIKI_SRC" ]]; then
  echo "ERROR: wiki source not found at $WIKI_SRC" >&2
  exit 1
fi

mkdir -p "$SITE_DST"

echo "→ Clearing $SITE_DST/ (except index.md and .gitkeep)..."
find "$SITE_DST" -mindepth 1 \
  ! -name 'index.md' \
  ! -name '.gitkeep' \
  -delete 2>/dev/null || true

echo "→ Copying wiki/{sources,entities,concepts}/ into content/..."
for sub in sources entities concepts; do
  if [[ -d "$WIKI_SRC/$sub" ]]; then
    mkdir -p "$SITE_DST/$sub"
    # copy all .md files (skip .gitkeep)
    find "$WIKI_SRC/$sub" -maxdepth 1 -type f -name '*.md' -exec cp {} "$SITE_DST/$sub/" \;
  fi
done

echo "→ Stripping any H2 section whose heading contains 'ProGrowth'..."
for f in $(find "$SITE_DST" -type f -name '*.md'); do
  # Drop lines from any "## ... ProGrowth ..." header until the next "## " header or EOF.
  # Handles: "## ProGrowth relevance", "## Strategic significance for ProGrowth", etc.
  awk '
    /^## .*ProGrowth/ { skip=1; next }
    skip && /^## / { skip=0 }
    !skip { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

echo "→ Stripping ProGrowth tag from frontmatter..."
for f in $(find "$SITE_DST" -type f -name '*.md'); do
  sed -i.bak -E 's/, progrowth//g; s/progrowth, //g; s/\[progrowth\]/[]/g' "$f" && rm -f "$f.bak"
done

echo "→ Final check: any files still mentioning ProGrowth?"
LEAKS=$(grep -l "ProGrowth\|progrowth" "$SITE_DST"/**/*.md 2>/dev/null || true)
if [[ -n "$LEAKS" ]]; then
  echo "  WARNING: leaks remain in:"
  echo "$LEAKS" | sed 's/^/    /'
  echo "  (inline prose mentions may be fine; review manually)"
else
  echo "  (clean)"
fi

COUNT=$(find "$SITE_DST" -type f -name '*.md' | wc -l | tr -d ' ')
echo "✓ Synced $COUNT markdown files to $SITE_DST"
