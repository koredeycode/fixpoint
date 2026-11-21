import { useEffect, useMemo, useState } from "react";
import type { ObsEvent, ObsSummary } from "../../types/global";

const EMPTY: ObsSummary = {
  turns: 0,
  toolCalls: 0,
  peerCalls: 0,
  consentDecisions: 0,
  errors: 0,
  avgToolMs: 0,
  avgSpanMs: 0,
  lastAt: null,
  uptimeMs: 0,
};

const CHIPS: Array<{ key: keyof ObsSummary; label: string }> = [
  { key: "turns", label: "turns" },
  { key: "toolCalls", label: "tools" },
  { key: "peerCalls", label: "peers" },
  { key: "consentDecisions", label: "consent" },
  { key: "errors", label: "errors" },
  { key: "avgToolMs", label: "avg tool ms" },
];

/**
 * Developer-only view of the runtime's structured trace.
 * Shown in dev builds or with ?debug in the URL. It lives OUTSIDE #agent-app.
 */
export default function ObservabilityPanel() {
  const enabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug");
  const [events, setEvents] = useState<ObsEvent[]>([]);
  const [summary, setSummary] = useState<ObsSummary>(EMPTY);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setEvents(window.__FIXPOINT_OBS__?.events() ?? []);
      setSummary(window.__FIXPOINT_OBS__?.summary() ?? EMPTY);
    };
    refresh();
    window.addEventListener("fixpoint:obs", refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("fixpoint:obs", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const recent = useMemo(() => events.slice(-40).reverse(), [events]);

  if (!enabled) return null;

  function download() {
    const payload = JSON.stringify(window.__FIXPOINT_OBS__?.export() ?? {}, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fixpoint-observability.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-ink-200 bg-white/95 shadow-xl backdrop-blur">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold text-brand-700"
      >
        <span>● Agent trace {summary.errors ? `— ${summary.errors} errors` : ""}</span>
        <span aria-hidden="true">{open ? "▾" : "▴"}</span>
      </button>

      {open ? (
        <div className="border-t border-ink-200 p-4">
          <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
            {CHIPS.map((chip) => {
              const value = summary[chip.key];
              return (
                <div key={chip.key} className="rounded-lg bg-paper px-2 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-ink-600">{chip.label}</dt>
                  <dd
                    className={`text-sm font-bold ${chip.key === "errors" && Number(value) > 0 ? "text-red-600" : "text-ink-900"}`}
                  >
                    {String(value)}
                  </dd>
                </div>
              );
            })}
          </dl>

          <ol className="max-h-72 space-y-1 overflow-auto font-mono text-xs">
            {recent.length === 0 ? (
              <li className="text-ink-600">Waiting for trace events…</li>
            ) : (
              recent.map((event) => (
                <li key={event.seq ?? Math.random()} className="rounded-lg bg-paper px-2 py-1.5">
                  <button
                    onClick={() => setExpanded(expanded === event.seq ? null : (event.seq ?? null))}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-full ${
                        event.status === "error" || event.error
                          ? "bg-red-500"
                          : event.phase === "start"
                            ? "bg-accent-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    <span className="font-bold text-brand-700">{event.kind}</span>
                    <span className="text-ink-600">{event.phase}</span>
                    {event.tool ? <span className="text-ink-600">{event.tool}</span> : null}
                    {typeof event.durationMs === "number" ? (
                      <span className="ml-auto text-ink-600">{Math.round(event.durationMs)}ms</span>
                    ) : null}
                  </button>
                  {expanded === event.seq ? (
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-[10px] text-ink-600">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))
            )}
          </ol>

          <div className="mt-3 flex gap-2">
            <button
              onClick={download}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Download JSON
            </button>
            <button
              onClick={() => window.__FIXPOINT_OBS__?.clear()}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-600"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
