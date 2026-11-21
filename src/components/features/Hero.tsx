import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import type { PageId } from "../../types/navigation";

const POINTS = [
  "Answers grounded in published troubleshooting steps",
  "One generated chooser per question — no wall of text",
  "Usable by people and by other agents",
];

/** Landing page. Presentational: navigation is the only side effect. */
export default function Hero({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <section className="grid gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
      <div>
        <Eyebrow>Repair, right the first time</Eyebrow>
        <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Find the fault. Get the part. Book the pro.
        </h1>
        <p className="mb-6 max-w-2xl text-lg text-ink-600">
          Fixpoint turns a service manual into a conversation. Describe what your appliance is doing
          — in plain language — and follow a grounded diagnostic tree to the exact part you need.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onNavigate("assistant")}>
            Ask Fixpoint
          </Button>
          <Button onClick={() => onNavigate("manuals")}>Browse manuals</Button>
        </div>
        <ul className="mt-8 space-y-2 text-ink-600">
          {POINTS.map((point) => (
            <li key={point}>
              <span className="mr-2 font-extrabold text-brand-600">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden="true"
        className="rounded-3xl border border-ink-200 bg-white p-6 shadow-lg lg:rotate-1"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-ink-600">
          WX-200 · Drum will not spin
        </p>
        <p className="my-5 text-lg font-bold">Does the drum turn freely by hand?</p>
        <div className="grid gap-2">
          <span className="rounded-xl border border-ink-200 bg-paper px-4 py-3">
            No, it is stuck
          </span>
          <span className="rounded-xl border border-ink-200 bg-paper px-4 py-3">
            Yes, it spins easily
          </span>
        </div>
        <p className="mt-5 border-t border-dashed border-ink-200 pt-4 font-bold text-brand-700">
          ✓ Worn drive belt · BELT-42 staged
        </p>
      </div>
    </section>
  );
}
