---
title: Sign in
hide: ["toc", "graph", "explorer", "backlinks"]
---

<style>
  /* Strip Quartz chrome for the login page — minimal centered form */
  body :is(.sidebar, #quartz-body > .left, #quartz-body > .right, footer) { display: none !important; }
  #quartz-body { grid-template-columns: 1fr !important; }
  article { max-width: 420px !important; margin: 6rem auto !important; }
  article > h1, article > #toc-content { display: none !important; }
  .login-card {
    background: var(--light);
    border: 1px solid var(--lightgray);
    border-radius: 12px;
    padding: 1.75rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,.04);
  }
  .login-card h2 { margin: 0 0 .25rem; font-size: 1.4rem; }
  .login-card .sub { color: var(--gray); margin: 0 0 1.25rem; font-size: .9rem; }
  .login-card label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .35rem; color: var(--darkgray); }
  .login-card input {
    width: 100%; padding: .65rem .75rem;
    border: 1px solid var(--lightgray); border-radius: 8px;
    font-size: 1rem; background: var(--light); color: var(--dark);
    box-sizing: border-box;
  }
  .login-card input:focus { outline: none; border-color: var(--secondary); }
  .login-card input.code {
    text-align: center; letter-spacing: 0.4em; font-family: var(--codeFont, monospace);
    font-size: 1.5rem; padding: .85rem;
  }
  .login-card button {
    width: 100%; padding: .75rem; margin-top: 1rem;
    background: var(--secondary); color: white; border: none; border-radius: 8px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
  }
  .login-card button:disabled { background: var(--gray); cursor: not-allowed; }
  .login-card .alt {
    display: block; width: 100%; margin-top: .5rem; padding: .5rem;
    background: transparent; color: var(--gray); border: none; cursor: pointer;
    font-size: .85rem; text-align: center;
  }
  .login-card .alt:hover { color: var(--darkgray); }
  .login-card .err {
    margin-top: .75rem; padding: .5rem .75rem;
    background: rgba(220, 38, 38, .08); border: 1px solid rgba(220, 38, 38, .25);
    border-radius: 6px; color: #b91c1c; font-size: .85rem;
  }
  .login-card .ok { color: var(--darkgray); font-size: .9rem; margin: 0 0 .75rem; }
</style>

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
     inline <script> tags, breaking the JS parser. External file works
     because Quartz's Assets plugin copies it verbatim. -->
<script src="/login.js"></script>
