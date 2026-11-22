import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  ChevronRight,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

interface Suggestion {
  text: string;
  action?: "settings";
}

const OPEN_EVENT = "fixpoint:open-chat";

/**
 * A floating chat widget. The runtime owns everything inside #agent-app, so the
 * whole widget stays mounted and is only shown/hidden with CSS — never unmounted.
 */
export default function AssistantWidget() {
  // The runtime deliberately reloads the page after "Save and start" applies a
  // key, so keep the widget open across that reload.
  const [open, setOpen] = useState(() => {
    try {
      return window.sessionStorage.getItem("fixpoint-widget-open") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem("fixpoint-widget-open", open ? "1" : "0");
    } catch {
      /* private browsing with storage disabled */
    }
  }, [open]);
  const [showAgents, setShowAgents] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const [generated, setGenerated] = useState<Suggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const pendingQuery = useRef<string | null>(null);
  const suggestController = useRef<AbortController | null>(null);

  // Only model-generated follow-ups are shown. No static fallback.
  const suggestions = generated;

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Rotate one context-aware suggestion at a time, just above the composer.
  useEffect(() => {
    setSuggestion(0);
    if (!suggestions.length) return;
    const timer = window.setInterval(() => {
      setSuggestion((index) => (index + 1) % suggestions.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [suggestions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (settingsOpen) setSettingsOpen(false);
      else if (showAgents) setShowAgents(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, settingsOpen, showAgents]);

  // Mirror the runtime-managed status text into a data attribute for styling.
  useEffect(() => {
    const status = document.querySelector("#assistant-status");
    const pill = document.querySelector("#assistant-status-pill");
    if (!status || !pill) return;
    const sync = () => {
      const text = status.textContent ?? "";
      let kind = "connecting";
      if (text.includes("could not load")) kind = "error";
      else if (text.includes("Add your AI")) kind = "need-key";
      else if (text.includes("connected")) kind = "connected";
      pill.setAttribute("data-status", kind);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Claude-style follow-ups: one small model call after each completed turn.
  // Uses the visitor's active router/key, with the deterministic chips as fallback.
  useEffect(() => {
    const generate = async () => {
      const config = window.__FIXPOINT_ACTIVE_CONFIG__?.();
      if (!config?.key || !config.router || /mock/i.test(config.router)) return;
      if (suggestController.current) suggestController.current.abort();
      const controller = new AbortController();
      suggestController.current = controller;
      setGenerating(true);
      try {
        const history = [...document.querySelectorAll("#ns-msgs .ns-msg")]
          .slice(-8)
          .map((element) => ({
            role: element.classList.contains("user") ? "user" : "assistant",
            content: (element.textContent || "").slice(0, 400),
          }));
        if (!history.length) return;
        const response = await fetch(`${config.router.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.key}`,
          },
          body: JSON.stringify({
            model: config.model || undefined,
            messages: [
              {
                role: "system",
                content:
                  "Suggest the next questions a visitor could ask an appliance-repair assistant. Reply ONLY with a JSON array of 3 short questions, each under 12 words, about diagnosis, parts, booking or the Open Agentic Web. Never write code.",
              },
              ...history,
              { role: "user", content: "Suggest 3 short follow-up questions now." },
            ],
            // Reasoning models spend tokens in reasoning_content before content;
            // 200 left them truncated with an empty answer.
            max_tokens: 1000,
            temperature: 0.4,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        const message = body?.choices?.[0]?.message || {};
        const reasoning =
          message.reasoning_content || message.provider_specific_fields?.reasoning_content || "";
        // Prefer the real answer, but reasoning models sometimes put everything
        // there and leave content empty — recover the questions from either.
        const source = String(message.content || reasoning || "");
        const clean = source.replace(/```(?:json)?/gi, "").trim();
        let parsed: unknown = null;
        const start = clean.indexOf("[");
        const end = clean.lastIndexOf("]");
        if (start >= 0 && end > start) {
          try {
            parsed = JSON.parse(clean.slice(start, end + 1));
          } catch {
            parsed = null;
          }
        }
        let items = Array.isArray(parsed)
          ? parsed
              .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              .slice(0, 3)
              .map((item) => ({ text: item.trim().slice(0, 120) }))
          : [];
        if (!items.length) {
          items = clean
            .split("\n")
            .map((line) =>
              line
                .replace(/^\s*\d+[.)]\s*/, "")
                .replace(/^["']|["']$/g, "")
                .trim(),
            )
            .filter((line) => line.includes("?") && line.length < 160)
            .slice(0, 3)
            .map((line) => ({ text: line }));
        }
        if (items.length) setGenerated(items);
      } catch {
        setGenerated([]);
      } finally {
        if (!controller.signal.aborted) setGenerating(false);
      }
    };

    const onTrace = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; phase?: string; status?: string }>)
        .detail;
      if (!detail || detail.kind !== "run") return;
      if (detail.phase === "start") {
        setGenerated([]);
        return;
      }
      if (detail.phase === "end" && detail.status === "ok") void generate();
    };
    window.addEventListener("fixpoint:obs", onTrace);
    return () => {
      window.removeEventListener("fixpoint:obs", onTrace);
      suggestController.current?.abort();
    };
  }, []);

  // Drive the runtime's settings <details> from our bottom-sheet state, and
  // follow it when the runtime opens the sheet itself (e.g. after a key error).
  useEffect(() => {
    const app = document.querySelector("#agent-app");
    const slot = document.querySelector('[data-ns-slot="settings"]');
    const details = document.querySelector<HTMLDetailsElement>("#agent-app .ns-settings");
    if (app) app.setAttribute("data-settings", String(settingsOpen));
    if (details) {
      if (settingsOpen) details.setAttribute("open", "");
      else details.removeAttribute("open");
    }
    // A real sheet header keeps the close control clear of the content divider.
    if (slot) {
      let header = slot.querySelector<HTMLDivElement>(".ns-sheet-header");
      if (settingsOpen && !header) {
        header = document.createElement("div");
        header.className = "ns-sheet-header";
        const title = document.createElement("span");
        title.textContent = "AI model settings";
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Close settings");
        close.innerHTML =
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        close.addEventListener("click", () => setSettingsOpen(false));
        header.append(title, close);
        slot.prepend(header);
      } else if (!settingsOpen && header) {
        header.remove();
      }
      // Do this last: opening the <details> can scroll the slot to the bottom.
      if (settingsOpen) slot.scrollTop = 0;
    }
  }, [settingsOpen]);

  useEffect(() => {
    const details = document.querySelector<HTMLDetailsElement>("#agent-app .ns-settings");
    if (!details) return;
    const observer = new MutationObserver(() => setSettingsOpen(details.open));
    observer.observe(details, { attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const app = document.querySelector("#agent-app");
    if (app) app.setAttribute("data-show-agents", String(showAgents));
  }, [showAgents]);

  // Boot once. The mount may already exist or be announced by site.js after
  // Vite's head-injected React bundle has already rendered this component.
  useEffect(() => {
    let cancelled = false;
    let started = false;

    const applyPending = () => {
      const query = pendingQuery.current;
      if (!query) return;
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>("#ns-input");
      if (!input) return;
      input.value = query;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      pendingQuery.current = null;
    };

    const boot = () => {
      if (cancelled || started || !window.__FIXPOINT_MOUNT__) return;
      started = true;
      void window.__FIXPOINT_MOUNT__
        .start()
        .then(() => {
          document.querySelector("#agent-app .ns-settings")?.removeAttribute("open");
          applyPending();
        })
        .catch((error) => {
          console.error("Assistant boot failed", error);
          const status = document.querySelector("#assistant-status");
          if (status)
            status.textContent =
              "The assistant could not load. You can still use the site directly.";
        });
    };

    boot();
    window.addEventListener("fixpoint:mount-ready", boot);
    window.addEventListener("fixpoint:ready", boot);
    return () => {
      cancelled = true;
      window.removeEventListener("fixpoint:mount-ready", boot);
      window.removeEventListener("fixpoint:ready", boot);
    };
  }, []);

  const ask = (query: string) => {
    pendingQuery.current = query;
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>("#ns-input");
    if (!input) return;
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    pendingQuery.current = null;
  };

  const newChat = () => {
    document.querySelector<HTMLButtonElement>("#ns-newchat")?.click();
    setSettingsOpen(false);
  };

  const focusTimer = () => {
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement | HTMLTextAreaElement>("#ns-input")?.focus();
    }, 120);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          focusTimer();
        }}
        aria-label="Open Fixpoint assistant"
        className={`fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl transition-all hover:bg-brand-700 hover:scale-105 ${open ? "hidden" : ""}`}
      >
        <MessageCircle size={23} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 size-2 rounded-full bg-accent-400"
        />
      </button>

      <section
        role="dialog"
        aria-label="Ask Fixpoint assistant"
        className={`fixed bottom-2 left-2 right-2 z-40 flex h-[92vh] flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:h-[min(38rem,calc(100vh-2rem))] sm:w-[min(26rem,calc(100vw-2rem))] xl:h-[min(40rem,calc(100vh-4rem))] xl:w-[min(56rem,calc(100vw-4rem))] ${open ? "" : "hidden"}`}
      >
        <header className="flex items-center justify-between bg-linear-to-br from-brand-600 to-brand-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <Bot size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold">Ask Fixpoint</p>
              <p className="text-[11px] text-white/75">Runs in your browser · your own AI key</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Open AI model settings"
              className="grid size-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="grid size-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-paper px-4 py-2.5">
          <div
            id="assistant-status-pill"
            data-status="connecting"
            className="flex w-fit min-w-0 items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 data-[status=connected]:border-emerald-200 data-[status=connected]:text-emerald-700 data-[status=error]:border-red-200 data-[status=error]:text-red-700 data-[status=need-key]:border-amber-300 data-[status=need-key]:text-amber-900"
          >
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
            <p id="assistant-status" role="status" aria-live="polite" className="truncate">
              Connecting the assistant…
            </p>
          </div>
          <button
            onClick={newChat}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
          >
            <RotateCcw size={12} aria-hidden="true" />
            New chat
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-visible p-2 sm:p-3">
          {/* One rotating suggestion, sitting just above the runtime composer.
              Hidden while a drawer or sheet is open so it never floats on top. */}
          {!showAgents && !settingsOpen ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-[58px] z-10 flex justify-center">
              {suggestions.length ? (
                <button
                  disabled={generating}
                  onClick={() => {
                    const current = suggestions[suggestion % suggestions.length];
                    if (current.action === "settings") setSettingsOpen(true);
                    else ask(current.text);
                  }}
                  title="Suggested by your AI provider"
                  className="pointer-events-auto flex max-w-full items-center gap-1.5 truncate rounded-full border border-brand-100 bg-white/95 px-2.5 py-1 text-[11px] text-brand-700 shadow-sm transition-colors hover:border-brand-600 disabled:opacity-60"
                >
                  <Sparkles size={11} aria-hidden="true" />
                  <span className="truncate">
                    {generating && !generated.length
                      ? "Thinking of next questions…"
                      : suggestions[suggestion % suggestions.length].text}
                  </span>
                  <ChevronRight size={11} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}

          {settingsOpen ? (
            <button
              aria-label="Close settings"
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 z-20 cursor-default bg-ink-900/25"
            />
          ) : showAgents ? (
            <button
              aria-label="Close agent activity"
              onClick={() => setShowAgents(false)}
              className="absolute inset-0 z-[25] cursor-default bg-ink-900/20 xl:hidden"
            />
          ) : null}

          {/* React must not touch these children after mount. */}
          <div id="agent-app" className="h-full">
            <div data-ns-slot="header" />
            <div className="assistant-panels">
              <div data-ns-slot="chat" />
              <div data-ns-slot="agents" />
            </div>
            <div data-ns-slot="settings" />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-ink-200 px-4 py-2 text-[11px] text-ink-600">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-brand-600" aria-hidden="true" />
            Your key stays in this browser.
          </span>
          <button
            onClick={() => setShowAgents((value) => !value)}
            aria-pressed={showAgents}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-brand-700 hover:bg-brand-50"
          >
            <Activity size={12} aria-hidden="true" />
            {showAgents ? "Hide activity" : "Agent activity"}
          </button>
        </footer>
      </section>
    </>
  );
}
