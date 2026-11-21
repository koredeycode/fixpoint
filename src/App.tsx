import { useRef, useState } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/features/Hero";
import ManualLibrary from "./components/features/ManualLibrary";
import SymptomGuide from "./components/features/SymptomGuide";
import RepairKit from "./components/features/RepairKit";
import BookingPage from "./components/features/BookingPage";
import AssistantIsland from "./components/assistant/AssistantIsland";
import ObservabilityPanel from "./components/dev/ObservabilityPanel";
import { useSiteState } from "./lib/siteBridge";
import type { PageId } from "./types/navigation";

/**
 * Composition root only: picks the page and owns the navigation state.
 * All markup lives in layout/, features/ and assistant/ components.
 */
export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const assistantRef = useRef<HTMLDivElement>(null);
  const state = useSiteState();
  const kitCount = state.kit.items.reduce((n, item) => n + item.quantity, 0);

  function navigate(next: PageId) {
    setPage(next);
    if (next === "assistant") {
      requestAnimationFrame(() =>
        assistantRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

        <div ref={assistantRef} className="scroll-mt-24">
          <AssistantIsland />
        </div>
      </main>

      <Footer />
      <ObservabilityPanel />
    </div>
  );
}
