/**
 * Fire-and-forget bridge: after a Gnosis commit succeeds, POST the article
 * metadata to the progrowth-life-system so it appears in the Learning section
 * of the weekly review.
 *
 * Gnosis already generates `takeaways` during synthesis — we reuse those
 * directly as key_ideas rather than making a second AI call.
 *
 * Never throws. A life-system outage must not block or fail a Gnosis commit.
 */

const LIFE_SYSTEM_URL = "https://progrowth-life-ingest.vercel.app/api/ingest/gnosis-article";

export async function syncToLifeSystem(opts: {
  title: string;
  url: string | null;
  takeaways: string[];
  theme: string | null;
  docSlug: string;
}): Promise<void> {
  const secret = process.env.LIFE_SYSTEM_SECRET;
  if (!secret) {
    console.warn("[lifeSystemSync] LIFE_SYSTEM_SECRET not set — skipping sync");
    return;
  }

  const payload = {
    title:         opts.title,
    url:           opts.url,
    key_ideas:     opts.takeaways.length > 0 ? opts.takeaways.map((t) => `- ${t}`).join("\n") : null,
    theme:         opts.theme,
    gnosis_doc_id: opts.docSlug,
    source:        "gnosis",
  };

  try {
    const res = await fetch(LIFE_SYSTEM_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[lifeSystemSync] HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[lifeSystemSync] failed:", err instanceof Error ? err.message : String(err));
  }
}
