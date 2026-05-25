#!/usr/bin/env python3
"""readwise-state.py — report Readwise reading-loop state from outside a Claude session.

Reads ~/Projects/gnosis/raw/notes/readwise-state.json and (optionally) calls the
Readwise v2 API to compute "books pending drain". Prints a multi-section report;
exits 0 regardless of findings so it can be used in cron/CI.

Reads $READWISE_TOKEN from env for the books-pending lookup. If unset or the API
call fails, the books-pending section degrades gracefully.

Usage:
    python3 scripts/readwise-state.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

try:
    import certifi
    _SSL_CTX: ssl.SSLContext | None = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = None

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "raw" / "notes" / "readwise-state.json"

SYNTHESIS_LOOKBACK_WEEKS = 8
READWISE_BOOKS_ENDPOINT = "https://readwise.io/api/v2/books/"
HTTP_TIMEOUT_SECONDS = 15

# -------- helpers --------


def load_state() -> dict:
    if not STATE.exists():
        return {
            "books_processed": [],
            "synthesis_briefs": [],
            "resurface_log": [],
            "outputs_drafted": [],
            "feed_triage_runs": [],
            "mirror_runs": [],
        }
    return json.loads(STATE.read_text(encoding="utf-8"))


def parse_iso(s: str) -> datetime | None:
    if not s:
        return None
    try:
        # tolerate trailing Z
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def iso_week_key(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def fetch_readwise_books(token: str) -> list[dict]:
    """Paginate /api/v2/books/. Returns list of dicts with id + title + author."""
    books: list[dict] = []
    url: str | None = f"{READWISE_BOOKS_ENDPOINT}?page_size=1000"
    while url:
        req = urllib.request.Request(url, headers={"Authorization": f"Token {token}"})
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS, context=_SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        books.extend(data.get("results", []))
        url = data.get("next")
    return books


def report_section(title: str, items: list[str]) -> str:
    head = f"\n## {title} ({len(items)})\n"
    if not items:
        return head + "\n_none._\n"
    return head + "\n" + "\n".join(f"- {it}" for it in items) + "\n"


# -------- main --------


def main() -> int:
    state = load_state()
    now = datetime.now(timezone.utc)
    today = now.date()

    books_processed = state.get("books_processed", [])
    synthesis_briefs = state.get("synthesis_briefs", [])
    resurface_log = state.get("resurface_log", [])
    outputs_drafted = state.get("outputs_drafted", [])
    feed_triage_runs = state.get("feed_triage_runs", [])
    mirror_runs = state.get("mirror_runs", [])

    print(f"Gnosis Readwise-state report — state at {STATE.relative_to(ROOT)}")
    print(f"Generated: {now.isoformat(timespec='seconds')}")
    print()
    print(f"Summary: {len(books_processed)} books drained · "
          f"{len(synthesis_briefs)} synthesis briefs · "
          f"{len(resurface_log)} resurface sessions · "
          f"{len(outputs_drafted)} drafts · "
          f"{len(feed_triage_runs)} feed triage runs · "
          f"{len(mirror_runs)} mirrors")

    sections: list[str] = []

    # Books pending drain — needs Readwise API
    token = os.environ.get("READWISE_TOKEN", "").strip()
    processed_ids = {b.get("id") for b in books_processed if b.get("id") is not None}
    pending_lines: list[str] = []
    pending_header_suffix = ""
    if not token:
        pending_lines = ["_skipped — set $READWISE_TOKEN to enable the Readwise lookup._"]
        pending_header_suffix = " — skipped"
        sections.append(f"\n## Books pending drain{pending_header_suffix}\n\n" + pending_lines[0] + "\n")
    else:
        try:
            all_books = fetch_readwise_books(token)
            pending = [b for b in all_books if b.get("id") not in processed_ids]
            pending.sort(key=lambda b: b.get("last_highlight_at") or b.get("updated") or "", reverse=True)
            lines = []
            for b in pending[:20]:
                title = (b.get("title") or "<untitled>").strip()
                author = (b.get("author") or "").strip()
                count = b.get("num_highlights") or 0
                byline = f" — {author}" if author else ""
                lines.append(f"`{b.get('id')}` {title}{byline} ({count} highlights)")
            if len(pending) > 20:
                lines.append(f"… and {len(pending) - 20} more")
            sections.append(report_section(
                f"Books pending drain ({len(pending)} pending of {len(all_books)} total in Readwise)",
                lines,
            ))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as e:
            sections.append(f"\n## Books pending drain — error\n\n_Readwise API call failed: {e}_\n")

    # Weeks without a synthesis brief (last N weeks, including current)
    synthesized_weeks: set[str] = set()
    for b in synthesis_briefs:
        w = b.get("week_iso")
        if w:
            synthesized_weeks.add(w)

    missing_weeks: list[str] = []
    for delta in range(SYNTHESIS_LOOKBACK_WEEKS):
        d = today - timedelta(weeks=delta)
        key = iso_week_key(d)
        if key not in synthesized_weeks:
            missing_weeks.append(key)
    sections.append(report_section(
        f"Weeks without a synthesis brief (last {SYNTHESIS_LOOKBACK_WEEKS} weeks)",
        missing_weeks,
    ))

    # Days since last mirror
    mirror_dates: list[datetime] = []
    for m in mirror_runs:
        dt = parse_iso(m.get("created", ""))
        if dt:
            mirror_dates.append(dt)
    if mirror_dates:
        last_mirror = max(mirror_dates)
        delta_days = (now - last_mirror).days
        sections.append(
            f"\n## Days since last reading mirror\n\n"
            f"Last mirror: {last_mirror.isoformat(timespec='seconds')} "
            f"({delta_days} day{'s' if delta_days != 1 else ''} ago)\n"
        )
    else:
        sections.append(
            "\n## Days since last reading mirror\n\n"
            "_no mirror runs recorded — run §4.11 reading-pattern mirror to seed._\n"
        )

    # Recent activity — informational tail
    def recent_lines(records: list[dict], date_key: str, render) -> list[str]:
        rows: list[tuple[datetime, str]] = []
        for r in records:
            dt = parse_iso(r.get(date_key, ""))
            if dt:
                rows.append((dt, render(r)))
        rows.sort(key=lambda x: x[0], reverse=True)
        return [f"{dt.date().isoformat()} — {line}" for dt, line in rows[:5]]

    sections.append(report_section(
        "Recent resurface sessions (last 5)",
        recent_lines(resurface_log, "created",
                     lambda r: f"`{r.get('work_context', '?')}` "
                               f"({len(r.get('highlights_offered', []))} highlights)"),
    ))
    sections.append(report_section(
        "Recent drafts (last 5)",
        recent_lines(outputs_drafted, "created",
                     lambda r: f"{r.get('topic', '?')} → `{r.get('draft_path', '?')}`"),
    ))
    sections.append(report_section(
        "Recent feed triage runs (last 5)",
        recent_lines(feed_triage_runs, "created",
                     lambda r: f"promoted={r.get('promoted', 0)} "
                               f"archived={r.get('archived', 0)} "
                               f"deleted={r.get('deleted', 0)}"),
    ))

    for s in sections:
        print(s)

    return 0


if __name__ == "__main__":
    sys.exit(main())
