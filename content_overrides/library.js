// library.js — Library page for the Gnosis private wiki.
// Loaded as <script src="/library.js"> from content_overrides/library.md so
// Quartz's markdown processor doesn't HTML-escape JS operators.
//
// Flow:
//   1. On load: GET /api/library/books → render card grid
//   2. ?book=<id> in URL: GET /api/library/highlights?book_id=<id> → render detail
//   3. Click a card → push ?book=<id> + show detail
//   4. Click back / popstate → return to grid
//   5. Queue button → POST /api/library/queue-drain (active after Phase 2.1 ships)

(() => {
  const $ = (sel) => document.querySelector(sel)
  const grid = $("#lib-grid")
  const detail = $("#lib-detail")
  const errBox = $("#lib-error")
  const sub = $("#lib-sub")
  const search = $("#lib-q")
  const filter = $("#lib-filter")
  const backBtn = $("#lib-back")
  const logoutLink = $("#logout-link")

  let books = []

  function showError(msg) {
    errBox.textContent = msg || ""
    errBox.hidden = !msg
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function applyFilter(list) {
    const q = (search.value || "").toLowerCase().trim()
    const mode = filter.value
    return list.filter((b) => {
      if (mode === "drained" && !b.drained) return false
      if (mode === "queued" && !b.queued) return false
      if (mode === "undrained" && (b.drained || b.queued)) return false
      if (q) {
        const hay = `${b.title} ${b.author || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }

  function renderGrid() {
    const visible = applyFilter(books)
    sub.textContent = `${visible.length} of ${books.length} books`
    if (visible.length === 0) {
      grid.innerHTML = `<p class="lib-empty">No books match the current filter.</p>`
      return
    }
    grid.innerHTML = visible
      .map((b) => {
        const badges = []
        if (b.drained) badges.push(`<span class="lib-badge ok">Drained</span>`)
        if (b.queued) badges.push(`<span class="lib-badge warn">Queued</span>`)
        const cover = b.cover_image_url
          ? `<img src="${escapeHtml(b.cover_image_url)}" alt="" loading="lazy" />`
          : `<div class="lib-cover-placeholder">${escapeHtml((b.title || "?").slice(0, 1))}</div>`
        return `
          <article class="lib-card" data-id="${b.id}">
            ${cover}
            <div class="lib-card-meta">
              <h3>${escapeHtml(b.title)}</h3>
              <p class="lib-sub">${escapeHtml(b.author || "Unknown author")}</p>
              <p class="lib-sub small">${b.num_highlights} highlights</p>
              <div class="lib-badges">${badges.join("")}</div>
            </div>
          </article>
        `
      })
      .join("")

    for (const card of grid.querySelectorAll(".lib-card")) {
      card.addEventListener("click", () => {
        const id = Number(card.dataset.id)
        console.log("[library] card click → openBook", id)
        openBook(id, /*push*/ true)
      })
    }
  }

  function showGrid() {
    grid.hidden = false
    detail.hidden = true
    document.title = "Book Library — Gnosis"
    $("#lib-title").textContent = "Book Library"
    renderGrid()
  }

  function fmtDate(s) {
    if (!s) return ""
    const d = new Date(s)
    if (isNaN(d)) return ""
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  }

  async function openBook(id, push) {
    console.log("[library] openBook", id, "books.length =", books.length)
    const book = books.find((b) => b.id === id)
    if (!book) {
      console.warn("[library] book not found for id", id)
      showError(`Book ${id} not found in current library snapshot. Refresh the page.`)
      return
    }
    console.log("[library] showing detail for", book.title)
    showError("")

    grid.hidden = true
    detail.hidden = false
    detail.scrollIntoView({ block: "start" })
    $("#lib-title").textContent = book.title
    document.title = `${book.title} — Gnosis Book Library`

    $("#lib-cover").src = book.cover_image_url || ""
    $("#lib-cover").alt = book.title
    $("#lib-cover").style.display = book.cover_image_url ? "" : "none"
    $("#lib-detail-title").textContent = book.title
    $("#lib-detail-author").textContent = book.author || "Unknown author"
    $("#lib-detail-stats").textContent =
      `${book.num_highlights} highlights · last highlighted ${fmtDate(book.last_highlight_at) || "—"}`

    const queueBtn = $("#lib-queue-btn")
    const queueState = $("#lib-queue-state")
    queueBtn.disabled = false
    queueBtn.textContent = "Queue for drain"
    queueState.hidden = true
    if (book.drained) {
      queueBtn.disabled = true
      queueBtn.textContent = "Already drained"
      queueState.hidden = false
      queueState.className = "lib-badge ok"
      queueState.textContent = "Drained"
    } else if (book.queued) {
      queueBtn.disabled = true
      queueBtn.textContent = "Queued"
      queueState.hidden = false
      queueState.className = "lib-badge warn"
      queueState.textContent = "Queued"
    }
    queueBtn.onclick = () => queueForDrain(book)

    $("#lib-highlights").innerHTML = `<li class="lib-empty">Loading highlights…</li>`
    $("#lib-h-count").textContent = ""

    if (push) {
      const u = new URL(location.href)
      u.searchParams.set("book", String(id))
      history.pushState({ bookId: id }, "", u.toString())
    }

    try {
      const res = await fetch(`/api/library/highlights?book_id=${id}`, { credentials: "same-origin" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const items = data.highlights || []
      $("#lib-h-count").textContent = `(${items.length})`
      if (items.length === 0) {
        $("#lib-highlights").innerHTML = `<li class="lib-empty">No highlights in Readwise for this book.</li>`
        return
      }
      $("#lib-highlights").innerHTML = items
        .map((h) => {
          const noteBlock = h.note
            ? `<blockquote class="lib-note">${escapeHtml(h.note)}</blockquote>`
            : ""
          return `<li class="lib-highlight" data-id="${h.id}">
            <p>${escapeHtml(h.text)}</p>
            ${noteBlock}
            <p class="lib-sub small">${h.location_type ? `${escapeHtml(h.location_type)} ${h.location ?? ""}` : ""}</p>
          </li>`
        })
        .join("")
    } catch (e) {
      $("#lib-highlights").innerHTML =
        `<li class="lib-empty">Failed to load highlights: ${escapeHtml(e.message)}</li>`
    }
  }

  async function queueForDrain(book) {
    const queueBtn = $("#lib-queue-btn")
    const queueState = $("#lib-queue-state")
    queueBtn.disabled = true
    queueBtn.textContent = "Queueing…"
    showError("")

    try {
      const res = await fetch("/api/library/queue-drain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          readwise_book_id: book.id,
          book_title: book.title,
          book_author: book.author,
          requested_class: "A",
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      book.queued = true
      queueBtn.textContent = "Queued"
      queueState.hidden = false
      queueState.className = "lib-badge warn"
      queueState.textContent = "Queued"
      // Reflect in the grid view too on next render
      renderGrid()
    } catch (e) {
      showError(`Couldn't queue this book: ${e.message}`)
      queueBtn.disabled = false
      queueBtn.textContent = "Queue for drain"
    }
  }

  backBtn.addEventListener("click", () => {
    history.pushState({}, "", "/library")
    showGrid()
  })

  window.addEventListener("popstate", (e) => {
    const params = new URLSearchParams(location.search)
    const bookId = params.get("book")
    if (bookId) {
      openBook(Number(bookId), /*push*/ false)
    } else {
      showGrid()
    }
  })

  search.addEventListener("input", () => {
    if (!detail.hidden) return
    renderGrid()
  })
  filter.addEventListener("change", () => {
    if (!detail.hidden) return
    renderGrid()
  })

  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault()
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    } catch {}
    location.href = "/login"
  })

  ;(async function init() {
    sub.textContent = "Loading library…"
    try {
      const res = await fetch("/api/library/books", { credentials: "same-origin" })
      if (res.status === 401) {
        location.href = "/login?next=" + encodeURIComponent("/library" + location.search)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      books = data.books || []

      const params = new URLSearchParams(location.search)
      const bookId = params.get("book")
      if (bookId) {
        showGrid() // populate state
        openBook(Number(bookId), /*push*/ false)
      } else {
        showGrid()
      }
    } catch (e) {
      showError(`Couldn't load your Readwise library: ${e.message}`)
      sub.textContent = "Error loading library."
    }
  })()
})()
