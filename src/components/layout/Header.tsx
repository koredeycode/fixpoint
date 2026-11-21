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

/** Site-wide navigation. A layout component: no feature state beyond its props. */
export default function Header({ page, onNavigate, kitCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-10">
      <button
        onClick={() => onNavigate("home")}
        aria-label="Fixpoint home"
        className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-700"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white"
        >
          ✦
        </span>
        Fixpoint
      </button>

      <nav aria-label="Main navigation">
        <ul className="flex flex-wrap items-center gap-1">
          {ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                aria-current={page === item.id ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          <li>
            <button
              onClick={() => onNavigate("assistant")}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Ask the assistant
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
