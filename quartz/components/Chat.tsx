// @ts-ignore — inline scripts are resolved by Quartz at build time
import chatPageScript from "./scripts/chat-page.inline"
import styles from "./styles/chat-page.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * Full-page conversational interface at /chat.
 *
 * Renders only on the chat page itself; returns null elsewhere so the global
 * afterBody slot doesn't inject the UI into every page.
 *
 * Layout:
 *   ┌──────────────────────┬────────────────────────────────────┐
 *   │ parsed query         │ messages (streaming)               │
 *   │ ─────────            │                                    │
 *   │ retrieved pages      │                                    │
 *   │  (top-K cards)       │                                    │
 *   │                      │ input form                         │
 *   └──────────────────────┴────────────────────────────────────┘
 */
const Chat: QuartzComponent = (props: QuartzComponentProps) => {
  if (props.fileData.slug !== "chat") return null

  return (
    <div id="gnosis-chat-page" class="gnosis-chat-page" aria-live="polite">
      <aside class="gnosis-chat-page-sidebar" aria-label="Retrieval details">
        <section class="gnosis-chat-page-parsed" id="gnosis-chat-page-parsed">
          <header class="gnosis-chat-page-sidebar-heading">
            <strong>Parsed query</strong>
            <span class="gnosis-chat-page-sidebar-subtitle">
              How the retriever understood your question
            </span>
          </header>
          <div class="gnosis-chat-page-parsed-body" id="gnosis-chat-page-parsed-body">
            <p class="gnosis-chat-page-placeholder">
              Ask a question and the parsed intent, topic, and any emotional signals will appear
              here.
            </p>
          </div>
        </section>

        <section class="gnosis-chat-page-retrieved" id="gnosis-chat-page-retrieved">
          <header class="gnosis-chat-page-sidebar-heading">
            <strong>Retrieved pages</strong>
            <span class="gnosis-chat-page-sidebar-subtitle" id="gnosis-chat-page-retrieved-count">
              The pages the retriever selected to answer from
            </span>
          </header>
          <ol class="gnosis-chat-page-retrieved-list" id="gnosis-chat-page-retrieved-list"></ol>
        </section>
      </aside>

      <main class="gnosis-chat-page-main">
        <header class="gnosis-chat-page-header">
          <div class="gnosis-chat-page-title">
            <strong>Ask Gnosis</strong>
            <span class="gnosis-chat-page-subtitle">
              Answers cite the pages they came from. Click any [[link]] to open it.
            </span>
          </div>
        </header>

        <div
          class="gnosis-chat-page-messages"
          id="gnosis-chat-page-messages"
          role="log"
          aria-live="polite"
        >
          <div class="gnosis-chat-page-empty" id="gnosis-chat-page-empty">
            <p>
              Ask anything about this wiki. Every claim in the answer will cite the page it came
              from.
            </p>
            <div class="gnosis-chat-page-suggestions">
              <button
                type="button"
                class="gnosis-chat-page-suggestion"
                data-prompt="What's the difference between ChatGPT and Claude in AI search behavior?"
              >
                ChatGPT vs Claude in AI search →
              </button>
              <button
                type="button"
                class="gnosis-chat-page-suggestion"
                data-prompt="Why doesn't my brand-owned content show up in AI search?"
              >
                Why isn't my brand content showing up? →
              </button>
              <button
                type="button"
                class="gnosis-chat-page-suggestion"
                data-prompt="Show me the contradiction between Chen et al. and McKinsey on big brand bias."
              >
                Big brand bias: the contradiction →
              </button>
              <button
                type="button"
                class="gnosis-chat-page-suggestion"
                data-prompt="Give me a 5-bullet summary of the Generative Engine Optimization framework."
              >
                Summarize the GEO framework →
              </button>
            </div>
          </div>
        </div>

        <form class="gnosis-chat-page-form" id="gnosis-chat-page-form">
          <textarea
            id="gnosis-chat-page-input"
            class="gnosis-chat-page-input"
            rows={1}
            placeholder="Ask about the wiki…"
            autocomplete="off"
          ></textarea>
          <button
            type="submit"
            id="gnosis-chat-page-send"
            class="gnosis-chat-page-send"
            aria-label="Send"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </main>
    </div>
  )
}

Chat.afterDOMLoaded = chatPageScript
Chat.css = styles

export default (() => Chat) satisfies QuartzComponentConstructor
