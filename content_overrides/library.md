---
title: Library
description: Browse your Readwise book library and queue books for the next drain pass.
hide: ["toc", "graph", "explorer", "backlinks"]
---

<!-- CSS lives in content_overrides/library.css so its text isn't captured
     into <meta name="description"> by Quartz's Description plugin. -->
<link rel="stylesheet" href="/library.css" />

<div class="lib-shell">
  <aside class="lib-sidebar">
    <div class="lib-brand">Gnosis</div>
    <nav class="lib-nav">
      <a href="/library" class="active" data-icon="book">Library</a>
      <a href="/ingest" data-icon="plus">Ingest</a>
      <a href="/chat" data-icon="chat">Chat</a>
    </nav>
    <div class="lib-foot">
      <a href="/api/auth/logout" id="logout-link">Sign out</a>
    </div>
  </aside>

  <main class="lib-main">
    <header class="lib-header">
      <div>
        <h1 id="lib-title">Library</h1>
        <p id="lib-sub" class="lib-sub">Loading…</p>
      </div>
      <div class="lib-search">
        <input id="lib-q" type="search" placeholder="Filter by title or author…" autocomplete="off" />
        <select id="lib-filter">
          <option value="all">All books</option>
          <option value="undrained">Not yet drained</option>
          <option value="queued">Queued</option>
          <option value="drained">Drained</option>
        </select>
      </div>
    </header>

    <section id="lib-grid" class="lib-grid" hidden></section>

    <section id="lib-detail" class="lib-detail" hidden>
      <button id="lib-back" class="lib-back">← Back to library</button>
      <div class="lib-detail-head">
        <img id="lib-cover" alt="" />
        <div>
          <h2 id="lib-detail-title"></h2>
          <p id="lib-detail-author" class="lib-sub"></p>
          <p id="lib-detail-stats" class="lib-sub"></p>
          <div class="lib-actions">
            <button id="lib-queue-btn" class="lib-btn">Queue for drain</button>
            <span id="lib-queue-state" class="lib-badge" hidden></span>
          </div>
        </div>
      </div>
      <h3 class="lib-highlights-heading">Highlights <span id="lib-h-count"></span></h3>
      <ol id="lib-highlights" class="lib-highlights"></ol>
    </section>

    <div id="lib-error" class="lib-err" hidden></div>
  </main>
</div>

<!-- JS lives in content_overrides/library.js because Quartz's markdown
     processor HTML-escapes characters like &amp;, &quot;, and &lt; inside
     inline <script> tags, breaking the JS parser. -->
<script src="/library.js"></script>
