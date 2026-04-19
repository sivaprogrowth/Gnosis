// @ts-ignore — inline scripts are resolved by Quartz at build time
import chatScript from "./scripts/chat.inline"
import styles from "./styles/chat.scss"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const ChatWidget: QuartzComponent = () => {
  return (
    <div id="gnosis-chat" class="gnosis-chat collapsed" aria-live="polite">
      <button
        type="button"
        id="gnosis-chat-toggle"
        class="gnosis-chat-toggle"
        aria-label="Open chat"
        title="Ask the wiki"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="gnosis-chat-toggle-label">Ask the wiki</span>
      </button>

      <div class="gnosis-chat-panel" role="dialog" aria-label="Gnosis chat">
        <header class="gnosis-chat-header">
          <div class="gnosis-chat-title">
            <strong>Ask Gnosis</strong>
            <span class="gnosis-chat-subtitle">Answers cite pages in this wiki.</span>
          </div>
          <button type="button" id="gnosis-chat-close" class="gnosis-chat-close" aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="gnosis-chat-messages" id="gnosis-chat-messages">
          <div class="gnosis-chat-empty">
            <p>Ask anything about the wiki. Every claim will cite the page it came from.</p>
            <div class="gnosis-chat-suggestions">
              <button type="button" class="gnosis-chat-suggestion" data-prompt="What's the difference between ChatGPT and Claude in AI search behavior?">
                ChatGPT vs Claude in AI search →
              </button>
              <button type="button" class="gnosis-chat-suggestion" data-prompt="Why doesn't my brand-owned content show up in AI search?">
                Why isn't my brand content showing up? →
              </button>
              <button type="button" class="gnosis-chat-suggestion" data-prompt="Show me the contradiction between Chen et al. and McKinsey on big brand bias.">
                Big brand bias: the contradiction →
              </button>
              <button type="button" class="gnosis-chat-suggestion" data-prompt="Give me a 5-bullet summary of the Generative Engine Optimization framework.">
                Summarize the GEO framework →
              </button>
            </div>
          </div>
        </div>

        <form class="gnosis-chat-form" id="gnosis-chat-form">
          <textarea
            id="gnosis-chat-input"
            class="gnosis-chat-input"
            rows={1}
            placeholder="Ask about the wiki…"
            autocomplete="off"
          ></textarea>
          <button type="submit" id="gnosis-chat-send" class="gnosis-chat-send" aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

ChatWidget.afterDOMLoaded = chatScript
ChatWidget.css = styles

export default (() => ChatWidget) satisfies QuartzComponentConstructor
