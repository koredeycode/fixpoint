import type { ReactNode } from "react";
import Eyebrow from "./Eyebrow";

interface PageSectionProps {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}

/** Standard page shell: eyebrow, H1, optional lede, then content. */
export default function PageSection({ eyebrow, title, lede, children }: PageSectionProps) {
  return (
    <section className="px-1 py-8 lg:py-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
      {lede ? <p className="mb-8 max-w-2xl text-lg text-ink-600">{lede}</p> : null}
      {children}
    </section>
  );
}
