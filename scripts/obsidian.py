#!/usr/bin/env python3
"""obsidian.py — thin Python client for the Obsidian Local REST API plugin.

Use this in `scripts/*.py` when you need to interact with the **live vault**
(unsaved buffers, currently-active file, "open this in Obsidian") rather than
the on-disk markdown files. For plain file reads/writes, prefer `pathlib.Path`
— the REST API has no advantage over the filesystem there.

Reads OBSIDIAN_API_KEY from env (typically exported from 1Password via shell rc).

Usage:
    from scripts.obsidian import ObsidianClient

    o = ObsidianClient.from_env()
    if o.is_alive():
        o.open("concepts/earned-media-bias.md")

CLI:
    python3 scripts/obsidian.py --status
    python3 scripts/obsidian.py --open Home.md
    python3 scripts/obsidian.py --search "earned media"
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

DEFAULT_HOST = "127.0.0.1"
DEFAULT_HTTP_PORT = 27123
DEFAULT_HTTPS_PORT = 27124
DEFAULT_TIMEOUT_SECONDS = 10


class ObsidianError(RuntimeError):
    """Raised for any non-2xx response from the Obsidian REST API."""


@dataclass
class ObsidianClient:
    """Minimal client for the Obsidian Local REST API plugin.

    The plugin binds to whichever vault is currently open in Obsidian.
    Vault-relative paths use forward slashes (e.g. `concepts/earned-media-bias.md`).
    """

    api_key: str
    host: str = DEFAULT_HOST
    port: int = DEFAULT_HTTP_PORT
    scheme: str = "http"
    timeout: float = DEFAULT_TIMEOUT_SECONDS
    verify_ssl: bool = False

    @classmethod
    def from_env(cls, **overrides: Any) -> "ObsidianClient":
        """Build a client from environment variables.

        Honored vars:
          OBSIDIAN_API_KEY  (required)
          OBSIDIAN_HOST     (default 127.0.0.1)
          OBSIDIAN_PORT     (default 27123 — the plugin's HTTP port)
          OBSIDIAN_SCHEME   (default http; set to "https" for the 27124 port)
        """
        key = os.environ.get("OBSIDIAN_API_KEY", "").strip()
        if not key:
            raise ObsidianError(
                "OBSIDIAN_API_KEY is not set. Export it via 1Password or shell rc "
                "before running scripts that need the live vault."
            )
        kwargs: dict[str, Any] = {"api_key": key}
        if "OBSIDIAN_HOST" in os.environ:
            kwargs["host"] = os.environ["OBSIDIAN_HOST"]
        if "OBSIDIAN_PORT" in os.environ:
            kwargs["port"] = int(os.environ["OBSIDIAN_PORT"])
        if "OBSIDIAN_SCHEME" in os.environ:
            kwargs["scheme"] = os.environ["OBSIDIAN_SCHEME"]
        kwargs.update(overrides)
        return cls(**kwargs)

    # -------- HTTP plumbing --------

    @property
    def base_url(self) -> str:
        return f"{self.scheme}://{self.host}:{self.port}"

    def _ssl_context(self) -> ssl.SSLContext | None:
        if self.scheme != "https":
            return None
        if self.verify_ssl:
            return ssl.create_default_context()
        # Plugin ships a self-signed cert; the user's already trusting it via 1Password.
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: bytes | None = None,
        content_type: str | None = None,
        accept: str = "application/json",
    ) -> tuple[int, bytes]:
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url, method=method, data=body)
        req.add_header("Authorization", f"Bearer {self.api_key}")
        req.add_header("Accept", accept)
        if content_type:
            req.add_header("Content-Type", content_type)
        try:
            with urllib.request.urlopen(
                req, timeout=self.timeout, context=self._ssl_context()
            ) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            raise ObsidianError(
                f"{method} {path} → HTTP {e.code}: {detail.strip() or e.reason}"
            ) from e
        except urllib.error.URLError as e:
            raise ObsidianError(
                f"{method} {path} → cannot reach {self.base_url}: {e.reason}. "
                f"Is Obsidian running with the Local REST API plugin enabled?"
            ) from e

    # -------- Public API --------

    def is_alive(self) -> bool:
        """Return True if the Obsidian REST API is reachable + authenticated."""
        try:
            status, _ = self._request("GET", "/")
            return status == 200
        except ObsidianError:
            return False

    def server_info(self) -> dict[str, Any]:
        """GET / — returns the plugin's server info (version, vault, status)."""
        _, body = self._request("GET", "/")
        return json.loads(body)

    def read(self, vault_path: str) -> str:
        """Return the markdown content of a vault file (live — includes unsaved edits)."""
        path = "/vault/" + urllib.parse.quote(vault_path.lstrip("/"))
        _, body = self._request("GET", path, accept="text/markdown")
        return body.decode("utf-8")

    def write(self, vault_path: str, content: str) -> None:
        """Replace the contents of a vault file. Creates the file if absent."""
        path = "/vault/" + urllib.parse.quote(vault_path.lstrip("/"))
        self._request(
            "PUT",
            path,
            body=content.encode("utf-8"),
            content_type="text/markdown",
        )

    def append(self, vault_path: str, content: str) -> None:
        """Append to an existing vault file. Creates the file if absent."""
        path = "/vault/" + urllib.parse.quote(vault_path.lstrip("/"))
        self._request(
            "POST",
            path,
            body=content.encode("utf-8"),
            content_type="text/markdown",
        )

    def search(self, query: str, context_length: int = 100) -> list[dict[str, Any]]:
        """Plain-text search across the vault.

        Returns a list of `{filename, score, matches: [{match, context}]}` dicts.
        """
        path = f"/search/simple/?query={urllib.parse.quote(query)}&contextLength={context_length}"
        _, body = self._request("POST", path)
        return json.loads(body)

    def open(self, vault_path: str, *, new_leaf: bool = False) -> None:
        """Open a vault file in the running Obsidian app."""
        suffix = "?newLeaf=true" if new_leaf else ""
        path = f"/open/{urllib.parse.quote(vault_path.lstrip('/'))}{suffix}"
        self._request("POST", path)

    def active_file(self) -> dict[str, Any] | None:
        """Return the currently-active file in Obsidian (path + content + frontmatter), or None."""
        try:
            _, body = self._request("GET", "/active/")
        except ObsidianError as e:
            if "404" in str(e):
                return None
            raise
        return json.loads(body)

    def execute_command(self, command_id: str) -> None:
        """Trigger an Obsidian command by its id (e.g. `editor:toggle-bold`)."""
        path = f"/commands/{urllib.parse.quote(command_id)}/"
        self._request("POST", path)


# -------- CLI --------


def _main() -> int:
    parser = argparse.ArgumentParser(
        description="Quick tests against the Obsidian Local REST API.",
        epilog="Reads OBSIDIAN_API_KEY from env.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--status", action="store_true", help="Show plugin server info")
    group.add_argument("--open", metavar="PATH", help="Open a vault file in Obsidian")
    group.add_argument("--read", metavar="PATH", help="Print a vault file's content")
    group.add_argument("--search", metavar="QUERY", help="Plain-text search")
    args = parser.parse_args()

    try:
        client = ObsidianClient.from_env()
    except ObsidianError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    try:
        if args.status:
            info = client.server_info()
            print(json.dumps(info, indent=2))
        elif args.open:
            client.open(args.open)
            print(f"opened {args.open!r} in Obsidian")
        elif args.read:
            print(client.read(args.read))
        elif args.search:
            results = client.search(args.search)
            print(f"{len(results)} match(es):")
            for r in results[:20]:
                print(f"  - {r.get('filename', '?')} (score {r.get('score', '?')})")
    except ObsidianError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(_main())
