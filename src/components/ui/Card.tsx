import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Surface primitive: white panel with a border and a soft shadow. */
export default function Card({ children, className = "" }: CardProps) {
  return (
    <article className={`rounded-2xl border border-ink-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </article>
  );
}
