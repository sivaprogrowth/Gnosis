// ingest.js — drives the /ingest page.
// Two-phase flow: submit URL → SSE through fetch/synth/compounding → ready
// frame → user confirms or cancels → SSE through write/commit → done frame.

(() => {
  const $ = (sel) => document.querySelector(sel)
  const form = $("#ing-url-form")
  const urlInput = $("#ing-url")
  const submitBtn = $("#ing-submit")
  const formSection = $("#ing-form")
  const progressSection = $("#ing-progress")
  const stagesList = $("#ing-stages")
  const logEl = $("#ing-log")
  const confirmSection = $("#ing-confirm")
  const summaryEl = $("#ing-summary")
  const takeawaysEl = $("#ing-takeaways")
  const entitiesEl = $("#ing-entities")
  const proceedBtn = $("#ing-proceed")
  const cancelBtn = $("#ing-cancel")
  const resultSection = $("#ing-result")
  const resultBody = $("#ing-result-body")
  const resetBtn = $("#ing-reset")
  const errEl = $("#ing-error")
  const logoutLink = $("#logout-link")

  // Stage ordering for the timeline. We add steps dynamically as frames come in.
  const STAGE_LABELS = {
    fetching: "Fetching URL",
    fetched: "Fetched",
    synthesizing: "Synthesizing source page + entities",
    synthesized: "Synthesized",
    compounding: "Applying compounding bar",
    ready: "Awaiting confirmation",
    writing: "Generating entity stubs",
    committing: "Committing to wiki-archive",
    committed: "Committed",
    done: "Done",
  }

  let currentJobId = null
  let currentJobPayload = null // last `ready` frame data
  let currentStages = [] // ordered list of stage keys we've added

  function showError(msg) {
    errEl.textContent = msg || ""
    errEl.hidden = !msg
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function setStage(stageKey, status, message) {
    // status: 'active' | 'done' | 'error'
    if (!STAGE_LABELS[stageKey]) return
    let li = stagesList.querySelector(`li[data-stage="${stageKey}"]`)
    if (!li) {
      li = document.createElement("li")
      li.dataset.stage = stageKey
      li.textContent = STAGE_LABELS[stageKey]
      stagesList.appendChild(li)
      currentStages.push(stageKey)
    }
    // Mark all prior stages done
    if (status === "active" || status === "done") {
      for (const key of currentStages) {
        const el = stagesList.querySelector(`li[data-stage="${key}"]`)
        if (key === stageKey) {
          el.className = status
        } else if (el.className !== "error") {
          // Only mark non-final stages done if a later one is active/done.
          el.className = currentStages.indexOf(key) < currentStages.indexOf(stageKey) ? "done" : el.className
        }
      }
    } else if (status === "error") {
      li.className = "error"
    }
    if (message) {
      const stamp = new Date().toLocaleTimeString()
      logEl.textContent += `[${stamp}] ${stageKey}: ${message}\n`
      logEl.scrollTop = logEl.scrollHeight
    }
  }

  function resetStages() {
    stagesList.innerHTML = ""
    logEl.textContent = ""
    currentStages = []
  }

  /**
   * Consume an SSE stream from `path` POSTed with `body`. Calls `onFrame` for
   * each parsed `data: {...}` frame. Resolves when `[DONE]` arrives.
   */
  async function consumeSse(path, body, onFrame) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      location.href = "/login?next=" + encodeURIComponent("/ingest")
      throw new Error("Session expired")
    }
    if (!res.ok || !res.body) {
      const errBody = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200) || res.statusText}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buf = ""
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 2)
        if (!block.startsWith("data:")) continue
        const payload = block.slice(5).trim()
        if (payload === "[DONE]") return
        try {
          const frame = JSON.parse(payload)
          onFrame(frame)
        } catch {
          // ignore malformed frames
        }
      }
    }
  }

  function renderConfirmation(payload) {
    currentJobPayload = payload
    summaryEl.innerHTML = `
      <strong>${escapeHtml(payload.sourceTitle)}</strong><br/>
      <span class="lib-sub small">${escapeHtml(payload.sourceDomain)} · slug <code>${escapeHtml(payload.suggestedSlug)}</code></span>
    `
    takeawaysEl.innerHTML = payload.takeaways
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("")

    const promoteEls = (payload.promote || []).map(
      (e) => `
        <div class="ing-entity">
          <span class="ing-entity-type">${escapeHtml(e.type)}</span>
          <div>
            <div class="ing-entity-name">${escapeHtml(e.name)}</div>
            <div class="ing-entity-rationale">${escapeHtml(e.rationale)}</div>
          </div>
          <span class="ing-entity-badge promote">New page</span>
        </div>
      `,
    )
    const inlineEls = (payload.inline || []).map(
      (e) => `
        <div class="ing-entity">
          <span class="ing-entity-type">${escapeHtml(e.type)}</span>
          <div>
            <div class="ing-entity-name">${escapeHtml(e.name)}</div>
            <div class="ing-entity-rationale">${escapeHtml(e.reason)}</div>
          </div>
          <span class="ing-entity-badge inline">Inline only</span>
        </div>
      `,
    )
    entitiesEl.innerHTML = [...promoteEls, ...inlineEls].join("") ||
      `<p class="lib-sub">No entities surfaced.</p>`

    confirmSection.hidden = false
  }

  let pendingRebuildTriggered = false

  function renderResult(payload) {
    const sha = payload.sha || ""
    const commitUrl = payload.commitUrl || ""
    const files = payload.files || []
    const rebuildMsg = pendingRebuildTriggered
      ? `<p class="lib-sub">✅ Site rebuild was triggered automatically — the new pages will appear on <a href="/">gnosis.progrowth.services</a> in ~60s.</p>`
      : `<p class="lib-sub">⚠️ No deploy hook configured — the new pages won't appear on <a href="/">gnosis.progrowth.services</a> until the next manual <code>vercel deploy --prod</code>.</p>`
    resultBody.innerHTML = `
      <p>Committed <a href="${escapeHtml(commitUrl)}" target="_blank" rel="noopener"><code>${escapeHtml(sha.slice(0, 7))}</code></a> to <code>wiki-archive</code>:</p>
      <ul>
        ${files.map((f) => `<li><a href="${escapeHtml(f.blobUrl)}" target="_blank" rel="noopener"><code>${escapeHtml(f.path)}</code></a></li>`).join("")}
      </ul>
      ${rebuildMsg}
    `
    resultSection.hidden = false
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    showError("")
    const url = urlInput.value.trim()
    if (!url) return

    formSection.style.opacity = "0.6"
    submitBtn.disabled = true
    submitBtn.textContent = "Running…"
    progressSection.hidden = false
    confirmSection.hidden = true
    resultSection.hidden = true
    resetStages()

    try {
      await consumeSse("/api/ingest/url", { url }, (frame) => {
        if (frame.stage === "fetching" && frame.data && frame.data.jobId) {
          currentJobId = frame.data.jobId
        }
        setStage(frame.stage, frame.stage === "error" ? "error" : (frame.stage.endsWith("ing") || frame.stage === "ready" ? "active" : "done"), frame.message)
        if (frame.stage === "ready" && frame.data) {
          setStage("ready", "active", frame.message)
          renderConfirmation(frame.data)
        }
        if (frame.stage === "error") {
          showError(frame.message)
          submitBtn.disabled = false
          submitBtn.textContent = "Start ingest"
          formSection.style.opacity = "1"
        }
      })
    } catch (e) {
      showError(`Ingest failed: ${e.message}`)
      submitBtn.disabled = false
      submitBtn.textContent = "Start ingest"
      formSection.style.opacity = "1"
    }
  })

  proceedBtn.addEventListener("click", async () => {
    if (!currentJobId) return
    proceedBtn.disabled = true
    cancelBtn.disabled = true
    proceedBtn.textContent = "Committing…"
    showError("")

    try {
      let lastCommitFrame = null
      pendingRebuildTriggered = false
      await consumeSse("/api/ingest/continue", { job_id: currentJobId, decision: "proceed" }, (frame) => {
        if (frame.stage === "committed" && frame.data) {
          lastCommitFrame = frame.data
        }
        if (frame.stage === "done" && frame.data && frame.data.rebuildTriggered) {
          pendingRebuildTriggered = true
        }
        setStage(frame.stage, frame.stage === "error" ? "error" : (frame.stage.endsWith("ing") ? "active" : "done"), frame.message)
        if (frame.stage === "error") {
          showError(frame.message)
        }
      })
      if (lastCommitFrame) {
        confirmSection.hidden = true
        renderResult(lastCommitFrame)
      }
    } catch (e) {
      showError(`Commit failed: ${e.message}`)
    } finally {
      proceedBtn.disabled = false
      cancelBtn.disabled = false
      proceedBtn.textContent = "Proceed and commit"
    }
  })

  cancelBtn.addEventListener("click", async () => {
    if (!currentJobId) return
    cancelBtn.disabled = true
    proceedBtn.disabled = true
    try {
      await fetch("/api/ingest/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ job_id: currentJobId, decision: "cancel" }),
      })
    } catch {}
    confirmSection.hidden = true
    progressSection.hidden = true
    formSection.style.opacity = "1"
    submitBtn.disabled = false
    submitBtn.textContent = "Start ingest"
    cancelBtn.disabled = false
    proceedBtn.disabled = false
    currentJobId = null
  })

  resetBtn.addEventListener("click", () => {
    resultSection.hidden = true
    progressSection.hidden = true
    formSection.style.opacity = "1"
    submitBtn.disabled = false
    submitBtn.textContent = "Start ingest"
    urlInput.value = ""
    urlInput.focus()
    currentJobId = null
    currentJobPayload = null
  })

  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault()
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }) } catch {}
    location.href = "/login"
  })

  // On page load, check for an in-flight job (e.g. user lost SSE connection
  // during a long synthesize call but the server finished). If one is found,
  // jump straight to the confirm screen so the user can proceed or cancel.
  ;(async function recoverPending() {
    try {
      const res = await fetch("/api/ingest/latest-pending", { credentials: "same-origin" })
      if (!res.ok) return
      const data = await res.json()
      if (!data.pending) return
      currentJobId = data.pending.jobId
      progressSection.hidden = false
      setStage("fetching", "done", "Recovered from previous session")
      setStage("fetched", "done", "Source fetched earlier")
      setStage("synthesizing", "done", "Synthesis completed earlier")
      setStage("synthesized", "done")
      setStage("compounding", "done", "Compounding bar applied earlier")
      setStage("ready", "active", "Awaiting your confirmation")
      renderConfirmation(data.pending)
      formSection.style.opacity = "0.6"
    } catch (e) {
      // Silent — recovery is best-effort
    }
  })()
})()
