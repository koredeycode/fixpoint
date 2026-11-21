import { useEffect } from "react";

/**
 * A DOM island owned by the browser runtime after boot.
 *
 * React renders the container and its empty data-ns-slot children once, then
 * never reconciles anything inside #agent-app. Keep this component a leaf:
 * no state, no conditional children, no props that change after mount.
 */
export default function AssistantIsland() {
  useEffect(() => {
    let cancelled = false;
    const boot = () => {
      if (!cancelled) void window.__FIXPOINT_MOUNT__?.start();
    };
    if (window.__FIXPOINT_MOUNT__) boot();
    else window.addEventListener("fixpoint:ready", boot, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("fixpoint:ready", boot);
    };
  }, []);

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="mt-12 rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="mb-6 max-w-3xl">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-600">
          Ask Fixpoint
        </p>
        <h2 id="assistant-heading" className="text-2xl font-extrabold">
          Guided diagnosis, in your browser
        </h2>
        <p className="mt-3 text-ink-600">
          Describe a symptom in plain language. The assistant reads our real manual data, walks you
          through the checks, stages the right part and can arrange a pro — using an AI key you
          control.
        </p>
        <p className="mt-2 text-sm text-ink-600">
          Your messages and this page&apos;s data go to the LLM provider you choose in the settings
          below. Nothing irreversible happens without a confirmation.
        </p>
        <p
          id="assistant-status"
          role="status"
          className="mt-2 text-sm font-semibold text-brand-700"
        >
          Connecting the assistant…
        </p>
      </div>

      {/* React must not touch these children after mount. */}
      <div id="agent-app">
        <div data-ns-slot="header" />
        <div className="assistant-panels">
          <div data-ns-slot="chat" />
          <div data-ns-slot="agents" />
        </div>
        <div data-ns-slot="settings" />
      </div>
    </section>
  );
}
