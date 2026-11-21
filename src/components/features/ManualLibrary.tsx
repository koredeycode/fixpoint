import { callPage, useSiteState } from "../../lib/siteBridge";
import type { PageId } from "../../types/navigation";
import Button from "../ui/Button";
import Card from "../ui/Card";
import PageSection from "../ui/PageSection";

interface Props {
  onNavigate: (page: PageId) => void;
}

/** Lists the grounded dataset. Symptoms link into the guided flow. */
export default function ManualLibrary({ onNavigate }: Props) {
  const { appliances } = useSiteState();

  return (
    <PageSection
      eyebrow="Grounded in the manual"
      title="Manual library"
      lede="Every answer the assistant gives comes from these published troubleshooting trees. No guessed part numbers, no invented prices."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {appliances.map((appliance) => (
          <Card key={appliance.id}>
            <h2 className="text-xl font-bold">{appliance.name}</h2>
            <p className="mt-1 text-sm text-ink-600">{appliance.manual}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {appliance.symptoms.map((symptom) => (
                <li key={symptom.id}>
                  <Button
                    className="rounded-full px-3 py-1.5 text-xs"
                    onClick={() => {
                      // Selection lives in the same store the agent reads.
                      callPage("setSelectedSymptom", appliance.id, symptom.id);
                      onNavigate("symptoms");
                    }}
                  >
                    {symptom.name} →
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
