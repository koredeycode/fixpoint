// grounding.js — cross-check generated widgets against the facts actually returned
// by tools in this invocation. Prompt rules are defence in depth; this is the guard.
//
// A CRUSE card is data produced by a model. It is structurally validated elsewhere
// (cruse.js) and its action bindings are validated in actions.js, but neither check
// stops a widget from printing a part id, price, section or quote that no tool
// returned. This module builds a small fact ledger from the tool results already in
// the conversation and drops components that assert unsupported facts.

const PART_ID = /\b[a-z][a-z0-9]*_\d+[a-z0-9_]*\b/g;
const MONEY = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g;
const NUMERIC_PRICE = /"(?:price|unitPrice|total|partsTotal|cost|fee)"\s*:\s*(\d+(?:\.\d+)?)/g;
const SECTION = /§\s*(\d+(?:\.\d+)*)/g;
const SLOT = /\bslot_[a-z0-9]+\b/g;
const RECEIPT = /\b(?:FP|RCP|BK)-\d+\b/g;
const STANDARD = /\b([A-Za-z][\w]*(?:-[\w]+)+)\s+standard\b/g;
const HISTORY = /\b(?:you said|you told me|you mentioned|earlier you(?: said| typed)?|as you said|cast-in note)[^\n]{0,160}/gi;

const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);

function stringsIn(value, out = [], key = "") {
  if (typeof value === "string") {
    if (key !== "id") out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) stringsIn(item, out, "");
  } else if (object(value)) {
    for (const [k, v] of Object.entries(value)) stringsIn(v, out, k);
  }
  return out;
}

export function createFactLedger() {
  return {
    partIds: new Set(),
    prices: new Set(),
    sections: new Set(),
    slots: new Set(),
    receipts: new Set(),
    standards: new Set(),
    text: "",
  };
}

function scan(ledger, text) {
  if (!text) return;
  ledger.text += `\n${text}`;
  for (const m of text.matchAll(PART_ID)) ledger.partIds.add(m[0]);
  for (const m of text.matchAll(MONEY)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) ledger.prices.add(n);
  }
  for (const m of text.matchAll(NUMERIC_PRICE)) ledger.prices.add(Number(m[1]));
  for (const m of text.matchAll(SECTION)) ledger.sections.add(m[1]);
  for (const m of text.matchAll(SLOT)) ledger.slots.add(m[0]);
  for (const m of text.matchAll(RECEIPT)) ledger.receipts.add(m[0]);
  for (const m of text.matchAll(STANDARD)) ledger.standards.add(m[1].toLowerCase());
}

// Feed every tool result to the ledger as soon as it arrives. Called by the runner
// for both the manual and the LangChain loop, so the guard is runner-independent.
export function addToolResultToLedger(ledger, content) {
  if (!ledger || content == null) return ledger;
  scan(ledger, typeof content === "string" ? content : JSON.stringify(content));
  return ledger;
}

function unsupportedClaims(component, ledger, conversation) {
  const found = [];
  const ledgerText = String(ledger?.text || "").toLowerCase();
  for (const text of stringsIn(component)) {
    for (const m of text.matchAll(PART_ID)) {
      if (!ledger?.partIds.has(m[0])) found.push(`unsupported part id ${m[0]}`);
    }
    for (const m of text.matchAll(MONEY)) {
      const n = Number(m[1].replace(/,/g, ""));
      if (!ledger?.prices.has(n)) found.push(`unsupported price ${m[0]}`);
    }
    for (const m of text.matchAll(SECTION)) {
      if (!ledger?.sections.has(m[1])) found.push(`unsupported manual section ${m[0]}`);
    }
    for (const m of text.matchAll(SLOT)) {
      if (!ledger?.slots.has(m[0])) found.push(`unsupported slot ${m[0]}`);
    }
    for (const m of text.matchAll(RECEIPT)) {
      if (!ledger?.receipts.has(m[0])) found.push(`unsupported receipt ${m[0]}`);
    }
    for (const m of text.matchAll(STANDARD)) {
      if (!ledger?.standards.has(m[1].toLowerCase())) found.push(`unsourced standard ${m[1]}`);
    }
    for (const m of text.matchAll(HISTORY)) {
      const quoted = [...m[0].matchAll(/["']([^"']{3,120})["']/g)].map((q) => q[1].toLowerCase());
      const verified = quoted.length
        ? quoted.some((q) => conversation.includes(q))
        : conversation.includes(m[0].toLowerCase().slice(-60));
      if (!verified) found.push("unverifiable reference to earlier conversation");
    }
  }
  return [...new Set(found)];
}

const hasMoney = (s) => /\$\s?\d/.test(s);
const hasPartId = (s) => /\b[a-z][a-z0-9]*_\d+\b/.test(s);

/**
 * Drop presentation components that assert facts no tool returned.
 * Returns { presentation, issues, rejected }. `prose` is used to catch a card that
 * contradicts the assistant's own answer (e.g. a price next to "not a quote").
 */
export function validatePresentationGrounding(presentation, ledger, { conversationText = "", prose = "" } = {}) {
  const issues = [];
  if (!presentation || !Array.isArray(presentation.components)) {
    return { presentation: presentation || null, issues, rejected: 0 };
  }
  const conversation = String(conversationText || "").toLowerCase();
  const kept = [];
  let rejected = 0;
  for (const component of presentation.components) {
    const claims = unsupportedClaims(component, ledger, conversation);
    if (claims.length) {
      rejected += 1;
      issues.push(`Dropped widget '${component.id || component.kind}': ${claims.join("; ")}.`);
    } else {
      kept.push(component);
    }
  }

  // A widget must not contradict the prose. Only the explicit negations used by
  // this assistant are handled, so a grounded parts table is not dropped merely
  // because the kit is empty.
  const deniesPrice = /no price|not a quote|unsupported|no tool (?:ever )?returned|disregard/i.test(prose);
  const deniesPart = /no part id|no part (?:is |was )?staged|nothing (?:has been )?staged/i.test(prose);
  if (deniesPrice || deniesPart) {
    const consistent = [];
    for (const component of kept) {
      const text = stringsIn(component).join(" ");
      const badPrice = deniesPrice && hasMoney(text);
      const badPart = deniesPart && hasPartId(text);
      if (badPrice || badPart) {
        rejected += 1;
        issues.push(`Dropped widget '${component.id || component.kind}': it contradicts the answer about ${badPrice ? "prices" : "parts"}.`);
      } else {
        consistent.push(component);
      }
    }
    kept.length = 0;
    kept.push(...consistent);
  }

  return {
    presentation: kept.length ? { ...presentation, components: kept } : null,
    issues,
    rejected,
  };
}
