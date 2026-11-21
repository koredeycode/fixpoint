import type { ReactNode } from "react";

/** Small uppercase label above headings. */
export default function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-600">
      {children}
    </p>
  );
}
