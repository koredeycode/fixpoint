import type { ReactNode } from "react";

/** Centered placeholder with an optional call to action. */
export default function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-ink-200 p-12 text-center text-ink-600">
      <p>{children}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
