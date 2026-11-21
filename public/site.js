// Boots the browser runtime into the React-rendered #agent-app island.
// Loaded as a plain module from public/ (see index.html). React calls
// window.__FIXPOINT_MOUNT__.start() after the island has rendered.

import { App } from "./store.js";
import { installObservability } from "./observability.js";

export class AssistantMount {
  static GREETING =
    "I can diagnose faults from the Fixpoint manuals, stage the right part, and book a pro — using your own AI key.";

  static DIALOGS = {
    book_repair: {
      title: "Book this repair?",
      sentence:
        "We will reserve the slot and stage the parts below. You confirm the final booking on the pro's page.",
      confirm: "Book the repair",
      decline: "Don't book yet",
    },
  };

  static async start() {
    if (AssistantMount.engine) return AssistantMount.engine;
    const status = document.querySelector("#assistant-status");
    const siteBase = new URL("./", import.meta.url).href;
    try {
      const { boot } = await import("./runtime/index.js");
      const booted = await boot("#agent-app", {
        originUrl: siteBase,
        sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
      });
      AssistantMount.engine = booted.engine;
      AssistantMount.defaultReview = booted.engine.onActionConfirm;
      booted.engine.onActionConfirm = AssistantMount.review;
      AssistantMount.defaultConsent = booted.engine.onConsent;
      booted.engine.onConsent = AssistantMount.consent;

      installObservability(booted.engine);
      window.__FIXPOINT_OBS__?.note("assistant_boot", {
        origin: siteBase,
        needsKey: !booted.engine.byokKey || booted.engine.byokKey === "demo",
      });

      const needsKey =
        !booted.engine.mockLLM && (!booted.engine.byokKey || booted.engine.byokKey === "demo");
      if (status) {
        status.textContent = needsKey
          ? "Add your AI provider key in AI model settings below to start."
          : "Assistant connected to this page.";
      }
      if (!needsKey) AssistantMount.greet();
      return booted.engine;
    } catch (error) {
      if (status)
        status.textContent = "The assistant could not load. You can still use the site directly.";
      console.error("Assistant startup failed", error);
      return null;
    }
  }

  static greet() {
    const first = document.querySelector("#ns-msgs .ns-msg.bot");
    if (first) first.textContent = AssistantMount.GREETING;
  }

  static async review(items) {
    const pageOrigin = new URL(document.URL).origin;

    // A chat form that bundles one of our gated actions with others runs nothing.
    for (const item of items) {
      if (
        items.length > 1 &&
        item.origin === pageOrigin &&
        Object.hasOwn(AssistantMount.DIALOGS, item.action)
      ) {
        throw new Error(
          `Nothing ran. "${AssistantMount.DIALOGS[item.action].confirm}" needs its own confirmation, so ask for it on its own.`,
        );
      }
    }

    const own = items.length === 1 && items[0].origin === pageOrigin;
    let confirmed;
    if (own && Object.hasOwn(AssistantMount.DIALOGS, items[0].action)) {
      const content = AssistantMount.dialogContent(items[0]);
      if (content.refusal) throw new Error(content.refusal);
      confirmed = await new Promise(AssistantMount.openDialog.bind(null, content));
    } else {
      confirmed = await AssistantMount.defaultReview(items);
    }
    window.__FIXPOINT_OBS__?.note("action_review", {
      action: items[0]?.action,
      effect: items[0]?.effect,
      origin: items[0]?.origin,
      confirmed,
    });
    AssistantMount.keepFocusInChat();
    return confirmed;
  }

  static async consent(info) {
    const answer = AssistantMount.defaultConsent(info);
    // The runtime's consent card is added synchronously; focus its title while waiting.
    const cards = document.querySelectorAll("#ns-msgs .ns-consent");
    const title = cards[cards.length - 1]?.querySelector(".ns-consent-title");
    if (title) {
      title.tabIndex = -1;
      title.focus();
    }
    const decision = await answer;
    window.__FIXPOINT_OBS__?.note("peer_consent", {
      destination: info?.origin || info?.host,
      decision,
    });
    AssistantMount.keepFocusInChat();
    return decision;
  }

  static dialogContent(item) {
    let details = {};
    try {
      details = AssistantMount.reviewDetails(item.action, item.arguments) || {};
    } catch (error) {
      console.error("Could not add details to the confirmation dialog", error);
    }
    return {
      ...AssistantMount.DIALOGS[item.action],
      details,
      refusal: details.refusal,
      exact: `${item.action} on ${item.origin} (${item.effect})\n${JSON.stringify(item.arguments, null, 2)}`,
    };
  }

  static reviewDetails(action, args) {
    if (action === "book_repair") {
      const check = App.page.checkBooking(args);
      if (!check.ok) return { refusal: check.reason };
      return {
        Parts: check.items,
        Slot: check.slot,
        "Parts total": `$${check.partsTotal.toFixed(2)}`,
        Total: `$${check.total.toFixed(2)}`,
      };
    }
    return {};
  }

  static openDialog(content, resolve) {
    const dialog = document.createElement("dialog");
    dialog.className = "assistant-review";
    dialog.setAttribute("aria-labelledby", "assistant-review-title");
    const heading = document.createElement("h2");
    heading.id = "assistant-review-title";
    heading.textContent = content.title;
    heading.tabIndex = -1;
    heading.autofocus = true;
    const sentence = document.createElement("p");
    sentence.textContent = content.sentence;
    dialog.append(heading, sentence);

    const exact = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Technical details";
    const pre = document.createElement("pre");
    pre.textContent = content.exact;
    exact.append(summary, pre);

    const entries = Object.entries(content.details);
    if (entries.length) {
      const list = document.createElement("dl");
      for (const [label, value] of entries) {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = String(value);
        list.append(dt, dd);
      }
      dialog.append(list);
    } else {
      exact.open = true;
    }

    const confirm = document.createElement("button");
    confirm.textContent = content.confirm;
    confirm.addEventListener("click", dialog.close.bind(dialog, "confirm"));
    const decline = document.createElement("button");
    decline.className = "assistant-decline";
    decline.textContent = content.decline;
    decline.addEventListener("click", dialog.close.bind(dialog, "decline"));
    dialog.addEventListener("close", AssistantMount.finishDialog.bind(null, dialog, resolve));
    dialog.append(exact, confirm, decline);
    document.body.append(dialog);
    dialog.showModal();
  }

  static finishDialog(dialog, resolve) {
    dialog.remove();
    resolve(dialog.returnValue === "confirm");
  }

  static keepFocusInChat() {
    if (document.activeElement === document.body || document.activeElement === null) {
      document.querySelector("#ns-input")?.focus();
    }
  }
}

// Exposed for React. Do NOT auto-boot here: React must render #agent-app first.
if (typeof window !== "undefined") {
  window.__FIXPOINT_MOUNT__ = AssistantMount;
}
