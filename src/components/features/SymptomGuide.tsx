import { useSiteState } from "../../lib/siteBridge";
import type { PageId } from "../../types/navigation";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Eyebrow from "../ui/Eyebrow";
import PageSection from "../ui/PageSection";

const STEPS = [
  {
    title: "Unplug the appliance",
    body: "Always disconnect power before inspecting the drum, filter or pump.",
  },
  {
    title: "Answer the manual's question",
    body: "The assistant asks one question at a time with a generated chooser, using the exact options from the service manual.",
  },
  {
    title: "Stage the part, then book",
    body: "The right part goes into your kit. A pro slot is shown only after the diagnosis is grounded in the manual.",
  },
];

/** Human-readable version of the same decision tree the agent follows. */
export default function SymptomGuide({ onNavigate }: Props) {
  const state = useSiteState();
  const appliance =
    state.appliances.find((a) => a.id === state.selected.applianceId) ?? state.appliances[0];
  const symptom =
    appliance?.symptoms.find((s) => s.id === state.selected.symptomId) ?? appliance?.symptoms[0];

  return (
    <PageSection
      eyebrow="Symptom guide"
      title={symptom?.name ?? "Find your symptom"}
      lede="Follow the same decision tree the assistant uses. When a branch needs a part, stage it in your kit."
    >
      <div className="grid gap-3">
        {STEPS.map((step, index) => (
          <Card key={step.title} className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 font-extrabold text-brand-700">
              {index + 1}
            </span>
            <div>
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="mt-1 text-ink-600">{step.body}</p>
              {index === 1 ? (
                <p className="mt-2 text-sm text-ink-600">
                  Source:{" "}
                  <code className="rounded bg-paper px-1">{appliance?.manual ?? "manual"}</code>
                </p>
              ) : null}
              {index === 2 ? (
                <Button variant="primary" className="mt-4" onClick={() => onNavigate("assistant")}>
                  Start a guided diagnosis
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <aside className="mt-6 rounded-r-xl border-l-4 border-accent-500 bg-accent-400/10 px-5 py-4 text-ink-900">
        <Eyebrow>Prefer to ask?</Eyebrow>
        <p>
          The assistant can run this whole flow in chat — and other agent sites can call the same
          network by URL after you consent.
        </p>
      </aside>
    </PageSection>
  );
}

interface Props {
  onNavigate: (page: PageId) => void;
}
