// ingest.js — drives the /ingest page.
//
// Discovery phase (URL fetch / PDF extract → synthesize → compoundingFilter)
// uses polling: POST returns {jobId} immediately, frontend polls
// /api/ingest/job every 2s until status='awaiting_user' or 'failed'. This
// replaces SSE streaming, which dropped connections on long synthesize calls.
//
// Commit phase still uses SSE because it's fast (~2-5s) and the SSE
// disconnect bug doesn't trigger on short windows.

try {
(() => {
  console.log("[ingest] script start")
  const $ = (sel) => document.querySelector(sel)
  const form = $("#ing-url-form")
  const urlInput = $("#ing-url")
  const submitBtn = $("#ing-submit")
  const formSection = $("#ing-form")
  const pdfForm = $("#ing-pdf-form")
  const pdfInput = $("#ing-pdf-input")
  const pdfPickBtn = $("#ing-pdf-pick")
  const pdfDrop = $("#ing-drop")
  const pdfChosen = $("#ing-pdf-chosen")
  const pdfSubmit = $("#ing-pdf-submit")
  const tabs = document.querySelectorAll(".ing-tab")
  const panels = document.querySelectorAll(".ing-tab-panel")
  console.log("[ingest] selectors resolved — form:", !!form, "pdfForm:", !!pdfForm, "tabs:", tabs.length, "panels:", panels.length)
  const progressSection = $("#ing-progress")
  const stagesList = $("#ing-stages")
  const logEl = $("#ing-log")
  const confirmSection = $("#ing-confirm")
  const summaryEl = $("#ing-summary")
  const takeawaysEl = $("#ing-takeaways")
  const entitiesEl = $("#ing-entities")
  const proceedBtn = $("#ing-proceed")
  const cancelBtn = $("#ing-cancel")
  const regenerateBtn = $("#ing-regenerate")
  const resultSection = $("#ing-result")
  const resultBody = $("#ing-result-body")
  const resetBtn = $("#ing-reset")
  const errEl = $("#ing-error")
  const logoutLink = $("#logout-link")

  // status -> { stage key, label }
  const STATUS_STAGE = {
    queued: { stage: "queued", label: "Queued" },
    fetching: { stage: "fetching", label: "Fetching" },
    discussing: { stage: "synthesizing", label: "Synthesizing source page + entities" },
    awaiting_user: { stage: "ready", label: "Awaiting confirmation" },
    synthesizing: { stage: "writing", label: "Generating entity stubs" },
    committing: { stage: "committing", label: "Committing to wiki-archive" },
    done: { stage: "done", label: "Done" },
    failed: { stage: "error", label: "Failed" },
    cancelled: { stage: "cancelled", label: "Cancelled" },
  }

  let currentJobId = null
  let currentJobPayload = null
  let currentStages = []
  let pendingPdf = null
  let pollAbort = null

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
    if (!stageKey) return
    let li = stagesList.querySelector(`li[data-stage="${stageKey}"]`)
    if (!li) {
      li = document.createElement("li")
      li.dataset.stage = stageKey
      li.textContent = label(stageKey)
      stagesList.appendChild(li)
      currentStages.push(stageKey)
    }
    if (status === "active" || status === "done") {
      for (const key of currentStages) {
        const el = stagesList.querySelector(`li[data-stage="${key}"]`)
        if (!el) continue
        if (key === stageKey) {
          el.className = status
        } else if (el.className !== "error") {
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

  function label(stageKey) {
    const known = {
      queued: "Queued",
      fetching: "Fetching",
      synthesizing: "Synthesizing source page + entities",
      ready: "Awaiting confirmation",
      writing: "Generating entity stubs",
      committing: "Committing to wiki-archive",
      committed: "Committed",
      done: "Done",
      error: "Failed",
      cancelled: "Cancelled",
    }
    return known[stageKey] || stageKey
  }

  function resetStages() {
    stagesList.innerHTML = ""
    logEl.textContent = ""
    currentStages = []
  }

  // -------- Polling for discovery state --------
  // Polls /api/ingest/job?id=<jobId> every intervalMs until status reaches
  // a terminal state (awaiting_user / failed / done / cancelled) OR the
  // shouldStop predicate returns true. Returns the final job state.
  async function pollJob(jobId, intervalMs = 2000) {
    pollAbort = { stopped: false }
    const myToken = pollAbort
    while (!myToken.stopped) {
      let job
      try {
        const res = await fetch(`/api/ingest/job?id=${encodeURIComponent(jobId)}`, {
          credentials: "same-origin",
        })
        if (res.status === 401) {
          location.href = "/login?next=" + encodeURIComponent("/ingest")
          throw new Error("Session expired")
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `HTTP ${res.status}`)
        }
        job = await res.json()
      } catch (e) {
        // Transient network errors: keep polling. Show only if it persists.
        console.warn("[ingest] poll error:", e.message)
        await sleep(intervalMs)
        continue
      }

      // Update UI based on status
      const stageInfo = STATUS_STAGE[job.status]
      if (stageInfo) {
        const isTerminal =
          job.status === "awaiting_user" ||
          job.status === "done" ||
          job.status === "failed" ||
          job.status === "cancelled"
        const stageStatus = job.status === "failed" ? "error" : (isTerminal ? "done" : "active")
        setStage(stageInfo.stage, stageStatus, job.progressMessage || stageInfo.label)
      }

      if (job.status === "failed") {
        showError(job.errorMessage || job.progressMessage || "Ingest failed")
        return job
      }
      if (job.status === "cancelled") {
        return job
      }
      if (job.status === "awaiting_user" && job.ready) {
        setStage("ready", "active", job.progressMessage)
        renderConfirmation({
          jobId: job.jobId,
          sourceTitle: job.sourceTitle,
          sourceUrl: job.sourceUrl,
          sourceDomain: job.ready.sourceDomain,
          suggestedSlug: job.ready.suggestedSlug,
          takeaways: job.ready.takeaways,
          promote: job.ready.promote,
          inline: job.ready.inline,
        })
        return job
      }
      if (job.status === "done") {
        return job
      }

      await sleep(intervalMs)
    }
    return null
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  function renderConfirmation(payload) {
    currentJobPayload = payload
    summaryEl.innerHTML = `
      <strong>${escapeHtml(payload.sourceTitle)}</strong><br/>
      <span class="lib-sub small">${escapeHtml(payload.sourceDomain)} · slug <code>${escapeHtml(payload.suggestedSlug)}</code></span>
    `
    takeawaysEl.innerHTML = (payload.takeaways || [])
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
    const backlinkPaths = new Set(payload.backlinkPaths || [])
    const backlinksUpdated = payload.backlinksUpdated || 0
    const newPageCount = payload.newPageCount || files.length - backlinksUpdated
    const rebuildMsg = pendingRebuildTriggered
      ? `<p class="lib-sub">✅ Site rebuild was triggered automatically — the new pages will appear on <a href="/">gnosis.progrowth.services</a> in ~60s.</p>`
      : `<p class="lib-sub">⚠️ No deploy hook configured — the new pages won't appear on <a href="/">gnosis.progrowth.services</a> until the next manual <code>vercel deploy --prod</code>.</p>`
    const backlinkHeadline = backlinksUpdated > 0
      ? ` + ${backlinksUpdated} existing page${backlinksUpdated === 1 ? "" : "s"} updated with new backlinks`
      : ""
    resultBody.innerHTML = `
      <p>Committed <a href="${escapeHtml(commitUrl)}" target="_blank" rel="noopener"><code>${escapeHtml(sha.slice(0, 7))}</code></a> to <code>wiki-archive</code>: ${newPageCount} new page${newPageCount === 1 ? "" : "s"}${escapeHtml(backlinkHeadline)}.</p>
      <ul>
        ${files.map((f) => {
          const isBacklink = backlinkPaths.has(f.path)
          const badge = isBacklink ? ' <span class="lib-badge warn">updated</span>' : ""
          return `<li><a href="${escapeHtml(f.blobUrl)}" target="_blank" rel="noopener"><code>${escapeHtml(f.path)}</code></a>${badge}</li>`
        }).join("")}
      </ul>
      ${rebuildMsg}
    `
    resultSection.hidden = false
  }

  // -------- SSE for the commit phase (fast, no disconnect risk) --------
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
          // ignore
        }
      }
    }
  }

  // -------- Tab switching --------
  console.log("[ingest] booted — tabs:", tabs.length, "panels:", panels.length, "formSection:", !!formSection)
  for (const tab of tabs) {
    tab.addEventListener("click", (e) => {
      e.preventDefault()
      const which = tab.dataset.tab
      console.log("[ingest] tab click →", which)
      for (const t of tabs) {
        const active = t.dataset.tab === which
        t.classList.toggle("active", active)
        t.setAttribute("aria-selected", active ? "true" : "false")
      }
      if (formSection) formSection.dataset.active = which
    })
  }
  for (const p of panels) p.removeAttribute("hidden")

  // -------- PDF picker + drop zone --------
  if (!pdfForm) {
    console.warn("[ingest] PDF form not found in DOM — skipping PDF wiring.")
  }

  // Threshold above which we use Vercel Blob direct upload instead of
  // inlining the file as base64 in the POST body. Stays below Vercel's
  // 4.5MB function body limit (3MB PDF ≈ 4MB base64).
  const BLOB_UPLOAD_THRESHOLD = 3 * 1024 * 1024
  const MAX_PDF_SIZE = 50 * 1024 * 1024

  function setChosenPdf(file) {
    if (!pdfChosen || !pdfSubmit) return
    if (!file) {
      pendingPdf = null
      pdfChosen.hidden = true
      pdfChosen.textContent = ""
      pdfSubmit.disabled = true
      return
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showError("That doesn't look like a PDF file.")
      return
    }
    if (file.size > MAX_PDF_SIZE) {
      showError(`File is ${(file.size / 1024 / 1024).toFixed(2)}MB — max is ${(MAX_PDF_SIZE / 1024 / 1024).toFixed(0)}MB.`)
      return
    }
    showError("")
    pdfChosen.hidden = false
    const sizeStr = file.size >= 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`
    const flow = file.size > BLOB_UPLOAD_THRESHOLD ? " — uses Blob upload" : ""
    pdfChosen.textContent = `Selected: ${file.name} (${sizeStr})${flow}`
    pdfSubmit.disabled = false

    if (file.size > BLOB_UPLOAD_THRESHOLD) {
      // Defer the actual upload to submit-time. We just hold a ref to the File.
      pendingPdf = { file, large: true }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result || "")
        const base64 = dataUrl.replace(/^data:application\/pdf;base64,/, "")
        pendingPdf = { filename: file.name, contentBase64: base64 }
      }
      reader.onerror = () => {
        showError("Couldn't read the file. Try again.")
        pendingPdf = null
        pdfSubmit.disabled = true
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload a large PDF directly to Vercel Blob via @vercel/blob/client.
  // The client SDK posts the handshake to our /api/ingest/pdf endpoint
  // (where handleUpload returns a signed token) and PUTs the file directly
  // to Blob. Returns the public blob URL we then send back to /api/ingest/pdf
  // to actually start the ingest pipeline.
  async function uploadPdfToBlob(file) {
    // Dynamic ESM import — keeps the script lean for users who only paste URLs.
    const mod = await import("https://esm.sh/@vercel/blob@2.4.0/client")
    if (!mod || typeof mod.upload !== "function") {
      throw new Error("Could not load @vercel/blob/client")
    }
    const blob = await mod.upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/ingest/pdf",
      contentType: "application/pdf",
    })
    return blob.url
  }

  if (pdfPickBtn) {
    pdfPickBtn.addEventListener("click", (e) => {
      e.preventDefault()
      pdfInput?.click()
    })
  }
  if (pdfDrop) {
    pdfDrop.addEventListener("click", (e) => {
      if (e.target === pdfPickBtn) return
      pdfInput?.click()
    })
    ;["dragenter", "dragover"].forEach((evt) => {
      pdfDrop.addEventListener(evt, (e) => {
        e.preventDefault()
        pdfDrop.classList.add("dragover")
      })
    })
    ;["dragleave", "drop"].forEach((evt) => {
      pdfDrop.addEventListener(evt, (e) => {
        e.preventDefault()
        pdfDrop.classList.remove("dragover")
      })
    })
    pdfDrop.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (file) setChosenPdf(file)
    })
  }
  if (pdfInput) {
    pdfInput.addEventListener("change", () => {
      const file = pdfInput.files && pdfInput.files[0]
      if (file) setChosenPdf(file)
    })
  }

  // -------- Start an ingest (URL or PDF) via POST + poll --------
  async function startIngest(endpoint, body, submitBtnEl, submitBtnLabel) {
    formSection.style.opacity = "0.6"
    submitBtnEl.disabled = true
    submitBtnEl.textContent = "Running…"
    progressSection.hidden = false
    confirmSection.hidden = true
    resultSection.hidden = true
    resetStages()
    showError("")

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        location.href = "/login?next=" + encodeURIComponent("/ingest")
        return
      }
      // 409 Conflict: this source was already ingested. Offer to re-ingest.
      if (res.status === 409) {
        const conflict = await res.json().catch(() => ({}))
        const ex = conflict.existing || {}
        const when = ex.createdAt ? new Date(ex.createdAt).toLocaleString() : "earlier"
        const shaShort = ex.commitSha ? ex.commitSha.slice(0, 7) : "(unknown)"
        const confirmMsg = `This source was already ingested ${when} as "${ex.sourceTitle || "(untitled)"}" (commit ${shaShort}).\n\nRe-ingest anyway? This will overwrite the existing source page.`
        if (!window.confirm(confirmMsg)) {
          // User cancelled — reset the form so they can pick a different source
          submitBtnEl.disabled = false
          submitBtnEl.textContent = submitBtnLabel
          formSection.style.opacity = "1"
          progressSection.hidden = true
          return
        }
        // Re-submit with force=true
        return await startIngest(endpoint, { ...body, force: true }, submitBtnEl, submitBtnLabel)
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }
      const { jobId } = await res.json()
      currentJobId = jobId
      setStage("queued", "done", "Queued")
      setStage("fetching", "active", "Starting…")

      const job = await pollJob(jobId)
      if (!job) return // aborted
      if (job.status === "failed") {
        submitBtnEl.disabled = false
        submitBtnEl.textContent = submitBtnLabel
        formSection.style.opacity = "1"
      }
      // For awaiting_user / done: confirm screen is rendered inside pollJob.
      // The form stays semi-transparent to discourage starting another ingest
      // while one is awaiting confirmation.
    } catch (e) {
      showError(`Ingest failed: ${e.message}`)
      submitBtnEl.disabled = false
      submitBtnEl.textContent = submitBtnLabel
      formSection.style.opacity = "1"
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const url = urlInput.value.trim()
    if (!url) return
    await startIngest("/api/ingest/url", { url }, submitBtn, "Start ingest")
  })

  if (pdfForm) {
    pdfForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      if (!pendingPdf) {
        showError("Choose a PDF first.")
        return
      }
      // Small file: existing base64 path. Large file: upload to Blob first.
      let body
      if (pendingPdf.large) {
        pdfSubmit.disabled = true
        pdfSubmit.textContent = "Uploading…"
        showError("")
        try {
          const blobUrl = await uploadPdfToBlob(pendingPdf.file)
          body = { filename: pendingPdf.file.name, blobUrl }
        } catch (err) {
          showError(`Blob upload failed: ${err.message}`)
          pdfSubmit.disabled = false
          pdfSubmit.textContent = "Start ingest"
          return
        }
      } else {
        body = { filename: pendingPdf.filename, contentBase64: pendingPdf.contentBase64 }
      }
      await startIngest("/api/ingest/pdf", body, pdfSubmit, "Start ingest")
    })
  }

  // -------- Proceed (SSE; fast commit) --------
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

  // -------- Regenerate (re-run synth on same raw_markdown) --------
  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", async () => {
      if (!currentJobId) return
      regenerateBtn.disabled = true
      proceedBtn.disabled = true
      cancelBtn.disabled = true
      regenerateBtn.textContent = "Regenerating…"
      showError("")

      try {
        const res = await fetch("/api/ingest/job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "regenerate", jobId: currentJobId }),
        })
        if (res.status === 401) {
          location.href = "/login?next=" + encodeURIComponent("/ingest")
          return
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `HTTP ${res.status}`)
        }
        // Hide confirm, surface progress, resume polling. The synth step is
        // already running in the background via waitUntil.
        confirmSection.hidden = true
        progressSection.hidden = false
        setStage("synthesizing", "active", "Re-synthesizing on the same source…")

        const job = await pollJob(currentJobId)
        if (!job) return
        // pollJob already calls renderConfirmation when status hits awaiting_user.
      } catch (e) {
        showError(`Regenerate failed: ${e.message}`)
      } finally {
        regenerateBtn.disabled = false
        proceedBtn.disabled = false
        cancelBtn.disabled = false
        regenerateBtn.textContent = "Regenerate"
      }
    })
  }

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
    if (pdfSubmit) {
      pdfSubmit.disabled = !pendingPdf
      pdfSubmit.textContent = "Start ingest"
    }
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
    if (pdfSubmit) {
      pdfSubmit.disabled = true
      pdfSubmit.textContent = "Start ingest"
    }
    urlInput.value = ""
    if (pdfInput) pdfInput.value = ""
    setChosenPdf(null)
    urlInput.focus()
    currentJobId = null
    currentJobPayload = null
  })

  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault()
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }) } catch {}
    location.href = "/login"
  })

  // On page load, check for an in-flight job and resume into the confirm screen
  ;(async function recoverPending() {
    try {
      const res = await fetch("/api/ingest/latest-pending", { credentials: "same-origin" })
      if (!res.ok) return
      const data = await res.json()
      if (!data.pending) return
      currentJobId = data.pending.jobId
      progressSection.hidden = false
      setStage("fetching", "done", "Recovered from previous session")
      setStage("synthesizing", "done", "Synthesis completed earlier")
      setStage("ready", "active", "Awaiting your confirmation")
      renderConfirmation(data.pending)
      formSection.style.opacity = "0.6"
    } catch (e) {
      // best-effort
    }
  })()

  console.log("[ingest] setup complete")
})()
} catch (err) {
  console.error("[ingest] FATAL during script init:", err)
}
