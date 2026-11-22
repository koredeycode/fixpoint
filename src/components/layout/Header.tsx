import { Wrench } from "lucide-react";
import type { NavItem, PageId } from "../../types/navigation";

const ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "manuals", label: "Manual library" },
  { id: "symptoms", label: "Symptom guide" },
  { id: "kit", label: "My kit" },
  { id: "book", label: "Book a pro" },
];

interface HeaderProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  kitCount: number;
}

/** Site-wide navigation: brand left, links right on desktop; scrollable row on mobile. */
export default function Header({ page, onNavigate, kitCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate("home")}
          aria-label="Fixpoint home"
          className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-brand-700 sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white"
          >
            <Wrench size={17} strokeWidth={2.4} />
          </span>
          Fixpoint
        </button>

        <button
          onClick={() => onNavigate("assistant")}
          className="ml-auto shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white sm:hidden"
        >
          Ask Fixpoint
        </button>

        <nav
          aria-label="Main navigation"
          className="order-3 w-full sm:order-none sm:ml-auto sm:w-auto"
        >
          <ul className="flex items-center gap-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
            {ITEMS.map((item) => (
              <li key={item.id} className="shrink-0">
                <button
                  onClick={() => onNavigate(item.id)}
                  aria-current={page === item.id ? "page" : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    page === item.id
                      ? "bg-brand-100 text-brand-700"
                      : "text-ink-600 hover:bg-paper hover:text-ink-900"
                  }`}
                >
                  {item.label}
                  {item.id === "kit" && kitCount > 0 ? (
                    <span
                      className="ml-2 inline-grid min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-xs font-bold text-ink-900"
                      aria-label={`${kitCount} parts in kit`}
                    >
                      {kitCount}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            <li className="hidden shrink-0 sm:block">
              <button
                onClick={() => onNavigate("assistant")}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Ask the assistant
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
