#!/usr/bin/env bash
# acquire.sh — CLAUDE.md §4.1 step 1 ("Acquire") for URLs.
#
#   bash scripts/acquire.sh <url> [slug]
#
# Defuddle (the engine inside the Obsidian Web Clipper) extracts clean markdown
# plus title/author/published/domain as JSON; Knap renders that through
# templates/raw-article.knap.md into raw/articles/<YYYY-MM-DD>-<slug>.md with the
# standard inbox frontmatter. Nothing is written when the extraction looks like a
# paywall or consent page (< MIN_WORDS words), so a thin page cannot be mistaken
# for a successful acquire. Prints the saved path and word count on success.
#
# Env: ACQUIRE_OUT_DIR (default raw/articles), MIN_WORDS (default 200).
set -euo pipefail

URL="${1:?usage: acquire.sh <url> [slug]}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ACQUIRE_OUT_DIR:-$ROOT/raw/articles}"
MIN_WORDS="${MIN_WORDS:-200}"
TEMPLATE="$ROOT/templates/raw-article.knap.md"

for bin in defuddle knap python3; do
  command -v "$bin" >/dev/null 2>&1 || { echo "acquire: '$bin' not found (npm install -g defuddle knap)" >&2; exit 2; }
done
[ -f "$TEMPLATE" ] || { echo "acquire: template missing at $TEMPLATE" >&2; exit 2; }

TMP="$(mktemp -t acquire.XXXXXX)"
trap 'rm -f "$TMP" "$TMP.err"' EXIT

if ! defuddle parse "$URL" --md --json > "$TMP" 2>"$TMP.err"; then
  echo "acquire: defuddle failed for $URL" >&2; sed -n 1,5p "$TMP.err" >&2; exit 3
fi

read -r WORDS TITLE_SLUG < <(python3 -I - "$TMP" <<'PY'
import json, re, sys, unicodedata
d = json.load(open(sys.argv[1]))
words = d.get("wordCount") or len((d.get("content") or "").split())
t = unicodedata.normalize("NFKD", d.get("title") or "untitled").encode("ascii", "ignore").decode()
slug = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60].rstrip("-") or "untitled"
print(words, slug)
PY
)

if [ "$WORDS" -lt "$MIN_WORDS" ]; then
  echo "acquire: only $WORDS words extracted from $URL — looks like a paywall/consent/teaser page; nothing saved." >&2
  echo "         Try the Obsidian Web Clipper from a logged-in browser, or save the page by hand to raw/articles/." >&2
  exit 4
fi

TODAY="$(date +%F)"
SLUG="${2:-$TITLE_SLUG}"
OUT="$OUT_DIR/$TODAY-$SLUG.md"
mkdir -p "$OUT_DIR"
if [ -e "$OUT" ]; then echo "acquire: $OUT already exists; pass a different slug." >&2; exit 5; fi

knap render "$TEMPLATE" --data "$TMP" --set "url=$URL" --set "clipped_at=$TODAY" -o "$OUT"
echo "$OUT  ($WORDS words)"
