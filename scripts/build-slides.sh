#!/usr/bin/env bash
# build-slides.sh — Export a Marp markdown deck to PDF + HTML + PPTX.
#
# Usage:
#   bash scripts/build-slides.sh                       # build every .md in slides/
#   bash scripts/build-slides.sh <deck>                # build one deck (with or without .md)
#   bash scripts/build-slides.sh <deck> pdf            # one deck, PDF only
#   bash scripts/build-slides.sh <deck> html pptx pdf  # one deck, specified formats
#
# Outputs land in slides/dist/<deck>.{pdf,html,pptx}.
# Requires: node + npx (pulls @marp-team/marp-cli on demand).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLIDES_DIR="$REPO_ROOT/slides"
DIST_DIR="$SLIDES_DIR/dist"

mkdir -p "$DIST_DIR"

DEFAULT_FORMATS=(pdf html pptx)

build_one() {
  local deck="$1"
  shift
  local formats=("$@")
  if [[ ${#formats[@]} -eq 0 ]]; then
    formats=("${DEFAULT_FORMATS[@]}")
  fi

  local base
  base=$(basename "$deck" .md)
  local src="$SLIDES_DIR/${base}.md"
  if [[ ! -f "$src" ]]; then
    echo "✗ $src not found"
    return 1
  fi

  echo "→ $base"
  for fmt in "${formats[@]}"; do
    local flag
    case "$fmt" in
      pdf)  flag="--pdf" ;;
      html) flag="--html" ;;
      pptx) flag="--pptx" ;;
      png)  flag="--images png" ;;
      *) echo "  skipped unknown format: $fmt" ; continue ;;
    esac

    # Need --allow-local-files for PDF/PPTX when the deck references local images.
    npx --yes @marp-team/marp-cli@latest \
      $flag \
      --allow-local-files \
      -o "$DIST_DIR/${base}.${fmt}" \
      "$src" \
      >/dev/null 2>&1 && echo "  ✓ ${base}.${fmt}" || echo "  ✗ ${base}.${fmt}"
  done
}

if [[ $# -eq 0 ]]; then
  # Build every deck (skip _template.md)
  count=0
  for deck in "$SLIDES_DIR"/*.md; do
    base=$(basename "$deck" .md)
    [[ "$base" == _* ]] && continue
    [[ "$base" == README ]] && continue
    build_one "$base"
    count=$((count + 1))
  done
  echo ""
  echo "Done. Built $count deck(s). Output: $DIST_DIR/"
else
  deck="$1"
  shift
  build_one "$deck" "$@"
  echo ""
  echo "Done. Output: $DIST_DIR/"
fi
