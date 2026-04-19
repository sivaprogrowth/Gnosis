#!/usr/bin/env python3
"""lint-wiki.py — check the Gnosis canonical wiki for drift per CLAUDE.md §4.5.

Produces a report (does not auto-apply fixes). Exits 0 regardless of
findings so it can be used in CI without blocking.

Usage:
    python3 scripts/lint-wiki.py
"""

from __future__ import annotations

import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "wiki"
INDEX = ROOT / "index.md"
LOG = ROOT / "log.md"

STUB_WORD_THRESHOLD = 100
TAG_OVERLAP_THRESHOLD = 3  # pages sharing ≥ this many tags are candidates for cross-linking

# -------- helpers --------

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+?)(?:[|#][^\]]*)?\]\]")
LOG_PREFIX_RE = re.compile(r"^## \[(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}\] (\w+) \| (.+)$", re.M)
INDEX_ROW_RE = re.compile(r"\| \[\[([^\]|]+)(?:\|[^\]]*)?\]\]")


def parse_frontmatter(text: str) -> dict:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    fm: dict = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        fm[key.strip()] = val.strip()
    # crude list parsing
    tag_match = re.search(r"^tags:\s*\[([^\]]*)\]", m.group(1), re.M)
    if tag_match:
        fm["tags_list"] = [t.strip() for t in tag_match.group(1).split(",") if t.strip()]
    source_matches = re.findall(r"^\s*-\s*(\S.+)$", m.group(1), re.M)
    if source_matches:
        fm["sources_list"] = source_matches
    return fm


def body(text: str) -> str:
    m = FRONTMATTER_RE.match(text)
    return text[m.end():] if m else text


def wiki_pages() -> dict[str, dict]:
    """Return {basename: {path, folder, frontmatter, body, outlinks}}."""
    pages: dict[str, dict] = {}
    for md in WIKI.rglob("*.md"):
        if md.name.startswith("_"):
            continue
        if md.name == "README.md":
            continue
        basename = md.stem
        text = md.read_text(encoding="utf-8")
        b = body(text)
        outlinks = sorted({m.group(1).strip() for m in WIKILINK_RE.finditer(b)})
        folder = md.parent.name
        fm = parse_frontmatter(text)
        pages[basename] = {
            "path": md,
            "folder": folder,
            "rel_path": md.relative_to(ROOT).as_posix(),
            "frontmatter": fm,
            "body": b,
            "outlinks": outlinks,
            "word_count": len(b.split()),
            "type": fm.get("type", folder.rstrip("s")),
            "tags": fm.get("tags_list", []),
            "sources": fm.get("sources_list", []),
            "updated": fm.get("updated", ""),
            "created": fm.get("created", ""),
        }
    return pages


def report_section(title: str, items: list[str]) -> str:
    head = f"\n## {title} ({len(items)})\n"
    if not items:
        return head + "\n_none._\n"
    return head + "\n" + "\n".join(f"- {it}" for it in items) + "\n"


def main() -> int:
    pages = wiki_pages()
    all_slugs = set(pages.keys())
    print(f"Gnosis wiki lint report — {len(pages)} pages across {len(set(p['folder'] for p in pages.values()))} folders.")
    print(f"Source: {WIKI}")
    print()

    # Build inbound-link map: who links to each page?
    inbound: dict[str, list[str]] = defaultdict(list)
    undefined: list[tuple[str, str]] = []  # (source_slug, missing_target)
    for slug, p in pages.items():
        for link in p["outlinks"]:
            # Handle sub-path links: "concepts/earned-media-bias" → "earned-media-bias"
            link_base = link.split("/")[-1]
            # Try exact match, then sub-path match
            if link in all_slugs:
                inbound[link].append(slug)
            elif link_base in all_slugs:
                inbound[link_base].append(slug)
            else:
                undefined.append((slug, link))

    sections: list[str] = []

    # Orphans
    orphans = sorted(slug for slug in all_slugs if slug not in inbound and pages[slug]["type"] != "home")
    sections.append(report_section(
        "Orphans (pages with zero inbound [[links]])",
        [f"`{pages[s]['rel_path']}` ({pages[s]['type']})" for s in orphans],
    ))

    # Stubs
    stubs = sorted(
        (s for s, p in pages.items() if p["word_count"] < STUB_WORD_THRESHOLD),
        key=lambda s: pages[s]["word_count"],
    )
    sections.append(report_section(
        f"Stubs (under {STUB_WORD_THRESHOLD} words)",
        [f"`{pages[s]['rel_path']}` — {pages[s]['word_count']} words" for s in stubs],
    ))

    # Undefined wiki-links
    undefined_grouped = sorted(undefined, key=lambda x: (x[1], x[0]))
    sections.append(report_section(
        "Undefined wiki-links (targets that don't resolve)",
        [f"`{src}` → `[[{target}]]`" for src, target in undefined_grouped],
    ))

    # Index drift — pages not in index.md
    index_text = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    indexed_slugs = {m.group(1).split("/")[-1] for m in INDEX_ROW_RE.finditer(index_text)}
    # Strip " (source)" suffix variants
    indexed_slugs = {s.strip() for s in indexed_slugs}

    missing_from_index = sorted(slug for slug, p in pages.items()
                                if slug not in indexed_slugs
                                and p["type"] not in ("home", "inspiration")
                                and p["folder"] != "inspiration")
    sections.append(report_section(
        "Pages missing from index.md",
        [f"`{pages[s]['rel_path']}` ({pages[s]['type']})" for s in missing_from_index],
    ))

    # Index rows pointing at missing pages
    in_index_but_missing = sorted(s for s in indexed_slugs if s not in all_slugs and s)
    sections.append(report_section(
        "index.md rows pointing at non-existent pages",
        [f"`[[{s}]]`" for s in in_index_but_missing],
    ))

    # Log coverage — sources that don't have corresponding log entries
    log_text = LOG.read_text(encoding="utf-8") if LOG.exists() else ""
    # Normalize log titles AND log bodies: strip non-alphanumerics and lowercase
    log_entries_normalized = re.sub(r"[^a-z0-9]+", " ", log_text.lower())
    source_pages = [s for s, p in pages.items() if p["type"] == "source"]
    unlogged_sources: list[str] = []
    for s in source_pages:
        # Try: slug matches, or any 3+ word token sequence from the slug matches
        slug_normalized = re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
        tokens = slug_normalized.split()
        # Match if 3+ consecutive tokens from the slug appear in the log
        matched = False
        if len(tokens) >= 3:
            for i in range(len(tokens) - 2):
                if " ".join(tokens[i:i+3]) in log_entries_normalized:
                    matched = True
                    break
        elif slug_normalized in log_entries_normalized:
            matched = True
        if not matched:
            unlogged_sources.append(s)
    sections.append(report_section(
        "Sources with no matching log entry",
        [f"`{pages[s]['rel_path']}`" for s in unlogged_sources],
    ))

    # Tag-overlap candidates for missing cross-references
    tag_pairs: list[tuple[str, str, int]] = []
    page_list = list(pages.items())
    for i, (s1, p1) in enumerate(page_list):
        for s2, p2 in page_list[i+1:]:
            if not p1["tags"] or not p2["tags"]:
                continue
            overlap = len(set(p1["tags"]) & set(p2["tags"]))
            if overlap < TAG_OVERLAP_THRESHOLD:
                continue
            # If they already cross-link either direction, skip
            if s1 in p2["outlinks"] or s2 in p1["outlinks"]:
                continue
            # Same-type-same-folder clusters (e.g., 10 engine entities all tagged ai-engine) are noisy — skip intra-group
            if p1["folder"] == p2["folder"] and p1["type"] in ("entity", "source"):
                continue
            tag_pairs.append((s1, s2, overlap))
    tag_pairs.sort(key=lambda x: -x[2])
    top_missing_xrefs = tag_pairs[:15]
    sections.append(report_section(
        f"Possible missing cross-refs (≥{TAG_OVERLAP_THRESHOLD} shared tags, no link either direction) — top 15",
        [f"`{s1}` ↔ `{s2}` ({n} shared tags: {', '.join(sorted(set(pages[s1]['tags']) & set(pages[s2]['tags']))[:5])})"
         for s1, s2, n in top_missing_xrefs],
    ))

    # Multi-source pages — healthy compounding signal (not a bug)
    multi_source_pages = sorted(
        ((len(p["sources"]), s) for s, p in pages.items() if p["type"] not in ("source", "home") and len(p["sources"]) >= 2),
        reverse=True,
    )
    sections.append(report_section(
        "Healthy compounding — pages citing 2+ sources (informational)",
        [f"`{pages[s]['rel_path']}` — {n} sources" for n, s in multi_source_pages[:15]],
    ))

    # Most cited pages (by inbound links) — useful to know
    most_cited = sorted(inbound.items(), key=lambda x: -len(x[1]))[:10]
    sections.append(report_section(
        "Most-cited pages (top 10) — informational",
        [f"`{pages[slug]['rel_path']}` — {len(citers)} inbound link(s)" for slug, citers in most_cited if slug in pages],
    ))

    for s in sections:
        print(s)

    return 0


if __name__ == "__main__":
    sys.exit(main())
