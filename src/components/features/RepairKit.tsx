import { useSiteState, callPage } from "../../lib/siteBridge";
import type { PageId } from "../../types/navigation";
import type { KitItem } from "../../types/global";
import Button from "../ui/Button";
import DataTable, { type Column } from "../ui/DataTable";
import EmptyState from "../ui/EmptyState";
import PageSection from "../ui/PageSection";

const COLUMNS: Array<Column<KitItem>> = [
  { key: "name", header: "Part", cell: (item) => item.name },
  { key: "quantity", header: "Qty", cell: (item) => item.quantity },
  { key: "unit", header: "Unit", cell: (item) => `$${item.unitPrice.toFixed(2)}` },
  {
    key: "subtotal",
    header: "Subtotal",
    align: "right",
    cell: (item) => `$${(item.quantity * item.unitPrice).toFixed(2)}`,
  },
];

/** Reads the shared store; writes go back through the same functions the agent uses. */
export default function RepairKit({ onNavigate }: Props) {
  const { kit } = useSiteState();
  const total = kit.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <PageSection
      eyebrow="Your repair"
      title="Repair kit"
      lede={`Parts staged by you or by the assistant. Version ${kit.version}.`}
    >
      {kit.items.length === 0 ? (
        <EmptyState
          action={
            <Button variant="primary" onClick={() => onNavigate("assistant")}>
              Diagnose a fault
            </Button>
          }
        >
          Nothing staged yet.
        </EmptyState>
      ) : (
        <>
          <DataTable
            columns={COLUMNS}
            rows={kit.items}
            caption="Parts staged in the repair kit"
            footer={
              <tr>
                <th colSpan={3} className="px-4 py-3 text-right">
                  Parts total
                </th>
                <th className="px-4 py-3 text-right">${total.toFixed(2)}</th>
              </tr>
            }
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => onNavigate("book")}>
              Book a pro
            </Button>
            <Button variant="quiet" onClick={() => callPage("clearKit")}>
              Clear kit
            </Button>
          </div>
        </>
      )}
    </PageSection>
  );
}

interface Props {
  onNavigate: (page: PageId) => void;
}
