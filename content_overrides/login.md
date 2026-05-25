---
title: Sign in
description: Sign in to Gnosis — a private knowledge wiki.
hide: ["toc", "graph", "explorer", "backlinks"]
---

<!-- CSS lives in content_overrides/login.css so its text isn't captured
     into <meta name="description"> by Quartz's Description plugin. -->
<link rel="stylesheet" href="/login.css" />

<div class="login-card">
  <h2>Sign in to Gnosis</h2>
  <p class="sub">Private knowledge wiki. Access is by email allowlist.</p>

  <form id="email-form">
    <label for="email">Email</label>
    <input id="email" type="email" required autocomplete="email" placeholder="you@example.com" />
    <button type="submit" id="email-btn">Send login code</button>
  </form>

  <form id="code-form" style="display:none;">
    <p class="ok">A 6-digit code was sent to <span id="email-display"></span>. It expires in 5 minutes.</p>
    <label for="code">Code</label>
    <input id="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required class="code" placeholder="000000" />
    <button type="submit" id="code-btn">Verify &amp; sign in</button>
    <button type="button" class="alt" id="back-btn">Use a different email</button>
  </form>

  <div id="error" class="err" style="display:none;"></div>
</div>

<!-- JS lives in content_overrides/login.js because Quartz's markdown
     processor HTML-escapes characters like &amp;, &quot;, and &lt; inside
     inline <script> tags, breaking the JS parser. -->
<script src="/login.js"></script>
