// Static catalogue of real Local Repair Pros slots.
// The site exposes these read-only through site-actions.js and bridge-actions.js.

export const SLOTS = [
  { id: "slot_am", label: "Morning visit 09:00-12:00", price: 65, date: "2026-11-24" },
  { id: "slot_pm", label: "Afternoon visit 13:00-16:00", price: 55, date: "2026-11-24" },
  { id: "slot_early", label: "Early visit 08:00-11:00", price: 70, date: "2026-11-25" },
  { id: "slot_evening", label: "Evening visit 17:00-20:00", price: 75, date: "2026-11-25" },
];

// `date` may be a full YYYY-MM-DD value or a prefix such as "2026-11".
// With no date (or an empty one), every slot is returned.
export function filterSlots(date) {
  const prefix = typeof date === "string" ? date.trim() : "";
  if (!prefix) return SLOTS.slice();
  return SLOTS.filter((slot) => slot.date.startsWith(prefix));
}
