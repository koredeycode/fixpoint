import { useEffect, useState } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/features/Hero";
import ManualLibrary from "./components/features/ManualLibrary";
import SymptomGuide from "./components/features/SymptomGuide";
import RepairKit from "./components/features/RepairKit";
import BookingPage from "./components/features/BookingPage";
import AssistantWidget from "./components/assistant/AssistantWidget";
import ObservabilityPanel from "./components/dev/ObservabilityPanel";
import { callPage, useSiteState } from "./lib/siteBridge";
import type { PageId } from "./types/navigation";

/**
 * Composition root only: picks the page and owns the navigation state.
 * All markup lives in layout/, features/ and assistant/ components.
 */
export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const state = useSiteState();
  const kitCount = state.kit.items.reduce((n, item) => n + item.quantity, 0);

  // Stable citation links: #<appliance>--<symptom> opens that exact manual entry.
  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw || raw === "manual_library") {
        if (raw === "manual_library") setPage("manuals");
        return;
      }
      const [applianceId, symptomId] = raw.split("--");
      if (!applianceId || !symptomId) return;
      const result = callPage<{ ok: boolean }>("setSelectedSymptom", applianceId, symptomId);
      if (result?.ok !== false) setPage("symptoms");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  function navigate(next: PageId) {
    if (next === "assistant") {
      // The assistant is a floating widget, not a page. Any CTA can open it.
      window.dispatchEvent(new Event("fixpoint:open-chat"));
      return;
    }
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <Header page={page} onNavigate={navigate} kitCount={kitCount} />

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {page === "home" ? <Hero onNavigate={navigate} /> : null}
        {page === "manuals" ? <ManualLibrary onNavigate={navigate} /> : null}
        {page === "symptoms" ? <SymptomGuide onNavigate={navigate} /> : null}
        {page === "kit" ? <RepairKit onNavigate={navigate} /> : null}
        {page === "book" ? <BookingPage /> : null}
      </main>

      <Footer />
      <AssistantWidget />
      <ObservabilityPanel />
    </div>
  );
}
