// login.js — OTP flow for the Gnosis /login page.
// Loaded as <script src="login.js"> from content_overrides/login.md so
// Quartz's markdown processor doesn't HTML-escape JS operators (it does
// when JS is inline inside a <script> tag in markdown).

(() => {
  const emailForm = document.getElementById("email-form")
  const codeForm = document.getElementById("code-form")
  const emailInput = document.getElementById("email")
  const codeInput = document.getElementById("code")
  const emailDisplay = document.getElementById("email-display")
  const emailBtn = document.getElementById("email-btn")
  const codeBtn = document.getElementById("code-btn")
  const backBtn = document.getElementById("back-btn")
  const errBox = document.getElementById("error")

  function showError(msg) {
    errBox.textContent = msg
    errBox.style.display = msg ? "block" : "none"
  }

  function nextUrl() {
    const params = new URLSearchParams(location.search)
    const n = params.get("next")
    return n && n.startsWith("/") ? n : "/"
  }

  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    showError("")
    const email = emailInput.value.trim()
    if (!email) return
    emailBtn.disabled = true
    emailBtn.textContent = "Sending…"
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || "Failed to send code.")
        return
      }
      // Always switch to code step (the API returns success even for
      // unknown emails so the allowlist isn't enumerable).
      emailDisplay.textContent = email
      emailForm.style.display = "none"
      codeForm.style.display = "block"
      codeInput.focus()
    } catch {
      showError("Network error. Try again.")
    } finally {
      emailBtn.disabled = false
      emailBtn.textContent = "Send login code"
    }
  })

  codeForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    showError("")
    const email = emailInput.value.trim()
    const code = codeInput.value.replace(/\D/g, "").slice(0, 6)
    if (code.length !== 6) return
    codeBtn.disabled = true
    codeBtn.textContent = "Verifying…"
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || "Invalid or expired code.")
        return
      }
      // Session cookie is now set; navigate to the originally requested page.
      window.location.href = nextUrl()
    } catch {
      showError("Network error. Try again.")
    } finally {
      codeBtn.disabled = false
      codeBtn.textContent = "Verify & sign in"
    }
  })

  backBtn.addEventListener("click", () => {
    codeForm.style.display = "none"
    emailForm.style.display = "block"
    codeInput.value = ""
    showError("")
    emailInput.focus()
  })

  codeInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6)
  })
})()
