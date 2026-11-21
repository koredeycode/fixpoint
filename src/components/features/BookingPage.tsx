import { useSiteState } from "../../lib/siteBridge";
import Card from "../ui/Card";
import PageSection from "../ui/PageSection";

/** Shows the slots returned by the repair peer and the final receipt. */
export default function BookingPage() {
  const state = useSiteState();
  const total = state.kit.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (state.booking) {
    return (
      <PageSection eyebrow="Confirmed" title="You're booked">
        <Card className="max-w-lg border-emerald-200 bg-emerald-50">
          <p className="text-xl font-extrabold text-brand-700">{state.booking.confirmation}</p>
          <p className="mt-2">{state.booking.slot}</p>
          <p>{state.booking.items} part(s) staged</p>
          <p className="font-bold">Total ${state.booking.total.toFixed(2)}</p>
        </Card>
      </PageSection>
    );
  }

  return (
    <PageSection
      eyebrow="Service"
      title="Book a pro"
      lede="Slots come from our repair-peer network. Choosing one asks the assistant to confirm the exact parts and total in your browser before anything is reserved."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {state.slots.map((slot) => (
          <Card key={slot.id}>
            <h2 className="text-lg font-bold">{slot.label}</h2>
            <p className="mt-1 text-sm text-ink-600">Call-out fee ${slot.price.toFixed(2)}</p>
            <p className="text-sm text-ink-600">Parts ${total.toFixed(2)}</p>
            <p className="mt-3 text-lg font-extrabold text-brand-700">
              Total ${(total + slot.price).toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-ink-600">Ask the assistant to book this slot.</p>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
