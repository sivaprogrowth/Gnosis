// Minimal dependency-free SVG chart helpers for the Gnosis dataview generator.
// Pure string output — no D3, no runtime JS. Rendered as raw HTML by Quartz.

const PALETTE = {
  source: "#6366f1",
  entity: "#f97316",
  concept: "#22c55e",
  person: "#ec4899",
  company: "#14b8a6",
  project: "#eab308",
  inspiration: "#a855f7",
  other: "#94a3b8",
}

function colorFor(type) {
  return PALETTE[type] ?? PALETTE.other
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

// Donut chart. segments: [{ label, value, type? }].
function donutChart(segments, { size = 260, thickness = 42 } = {}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10
  const inner = r - thickness
  let angle = -Math.PI / 2
  const arcs = segments.map((s) => {
    const sweep = (s.value / total) * Math.PI * 2
    const start = angle
    const end = angle + sweep
    angle = end
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const x3 = cx + inner * Math.cos(end)
    const y3 = cy + inner * Math.sin(end)
    const x4 = cx + inner * Math.cos(start)
    const y4 = cy + inner * Math.sin(start)
    const large = sweep > Math.PI ? 1 : 0
    const path = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${inner} ${inner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      "Z",
    ].join(" ")
    const fill = colorFor(s.type ?? s.label)
    return `<path d="${path}" fill="${fill}"><title>${escapeHtml(s.label)}: ${s.value}</title></path>`
  })
  const legend = segments
    .map(
      (s) =>
        `<div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;margin:.15rem 0"><span style="display:inline-block;width:.75rem;height:.75rem;border-radius:2px;background:${colorFor(s.type ?? s.label)}"></span><strong>${escapeHtml(s.label)}</strong><span style="color:#64748b">&mdash; ${s.value}</span></div>`,
    )
    .join("")
  return `<div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap;margin:1rem 0"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Donut chart">${arcs.join("")}<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="2.25rem" font-weight="700" fill="currentColor">${total}</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size=".8rem" fill="currentColor" opacity=".6">pages</text></svg><div>${legend}</div></div>`
}

// Horizontal bar chart. rows: [{ label, value, type? }].
function barChart(rows, { width = 520, barHeight = 26, gap = 6 } = {}) {
  if (!rows.length) return ""
  const labelW = 220
  const valueW = 40
  const chartW = width - labelW - valueW - 20
  const max = Math.max(...rows.map((r) => r.value), 1)
  const height = rows.length * (barHeight + gap) + 10
  const bars = rows
    .map((r, i) => {
      const y = i * (barHeight + gap) + 5
      const w = Math.max(2, (r.value / max) * chartW)
      const fill = colorFor(r.type)
      return `<g><text x="0" y="${y + barHeight / 2 + 4}" font-size=".85rem" fill="currentColor">${escapeHtml(r.label)}</text><rect x="${labelW}" y="${y}" width="${w.toFixed(1)}" height="${barHeight}" rx="4" fill="${fill}"><title>${escapeHtml(r.label)}: ${r.value}</title></rect><text x="${labelW + w + 6}" y="${y + barHeight / 2 + 4}" font-size=".85rem" fill="currentColor" opacity=".75">${r.value}</text></g>`
    })
    .join("")
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Bar chart">${bars}</svg>`
}

// Tag cloud. tagCounts: Map<string, { count, dominantType }>.
function tagCloud(tagCounts, { max = 30 } = {}) {
  const entries = [...tagCounts.entries()]
    .map(([tag, { count, dominantType }]) => ({ tag, count, type: dominantType }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
  if (!entries.length) return ""
  const maxCount = entries[0].count
  const spans = entries
    .map((e) => {
      const scale = 0.8 + (e.count / maxCount) * 1.2
      const color = colorFor(e.type)
      return `<a href="tags/${encodeURIComponent(e.tag)}" style="display:inline-block;margin:.15rem .4rem;font-size:${scale.toFixed(2)}rem;color:${color};text-decoration:none;font-weight:500" title="${e.count} pages">${escapeHtml(e.tag)}</a>`
    })
    .join("")
  return `<div style="line-height:1.9;margin:1rem 0;padding:1rem;border:1px solid var(--lightgray,#e2e8f0);border-radius:8px">${spans}</div>`
}

// Stacked bar of pages created per month, split by type.
// datesByType: Map<YYYY-MM, Map<type, count>>.
function timelineBar(datesByType, { width = 520, height = 200 } = {}) {
  const months = [...datesByType.keys()].sort()
  if (!months.length) return ""
  const types = new Set()
  datesByType.forEach((m) => m.forEach((_, t) => types.add(t)))
  const typeArr = [...types]
  const totals = months.map((m) =>
    typeArr.reduce((a, t) => a + (datesByType.get(m).get(t) ?? 0), 0),
  )
  const max = Math.max(...totals, 1)
  const labelArea = 28
  const chartH = height - labelArea
  const barW = (width - 20) / months.length - 4
  const bars = months
    .map((m, i) => {
      const x = 10 + i * ((width - 20) / months.length) + 2
      let yCursor = chartH
      const segs = typeArr
        .map((t) => {
          const c = datesByType.get(m).get(t) ?? 0
          if (!c) return ""
          const h = (c / max) * (chartH - 10)
          yCursor -= h
          return `<rect x="${x.toFixed(1)}" y="${yCursor.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${colorFor(t)}"><title>${m} ${t}: ${c}</title></rect>`
        })
        .join("")
      const label = `<text x="${(x + barW / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle" font-size=".7rem" fill="currentColor" opacity=".6">${m}</text>`
      return segs + label
    })
    .join("")
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;margin:1rem 0" role="img" aria-label="Ingest timeline">${bars}</svg>`
}

module.exports = { donutChart, barChart, tagCloud, timelineBar, colorFor, escapeHtml }
