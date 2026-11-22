// Boots the browser runtime into the React-rendered #agent-app island.
// Loaded as a plain module from public/ (see index.html). React calls
// window.__FIXPOINT_MOUNT__.start() after the island has rendered.

import { App } from "./store.js";
import { installObservability } from "./observability.js";

/**
 * Populate a searchable model picker from the chosen router as soon as a key is
 * pasted. The runtime itself only fetches /models during Save-and-start
 * validation, so this closes that gap. The key goes only to that router.
 */
function wireModelPicker() {
  const keyEl = document.querySelector("#ns-key");
  const modelEl = document.querySelector("#ns-model");
  const routerEl = document.querySelector("#ns-router");
  if (!keyEl || !modelEl || !routerEl) return;
  const label = modelEl.closest("label");
  if (!label || label.querySelector(".ns-model-picker")) return;

  const wrap = document.createElement("div");
  wrap.className = "ns-model-picker";
  // One field only: the runtime's real Model input. Our menu hangs off it.
  modelEl.removeAttribute("list"); // avoid the native datalist dropdown as well
  const status = document.createElement("p");
  status.className = "ns-model-status";
  status.textContent = "Enter a model ID, or click the field to choose.";
  const menu = document.createElement("div");
  menu.className = "ns-model-picker-menu";
  menu.hidden = true;
  const search = document.createElement("input");
  search.type = "search";
  search.className = "ns-model-picker-search";
  search.placeholder = "Search models";
  const list = document.createElement("div");
  list.className = "ns-model-picker-list";
  menu.append(search, list);
  wrap.append(status, menu);
  label.append(wrap);

  let models = [];
  let timer = null;
  let controller = null;

  const draw = (query = "") => {
    list.replaceChildren();
    const term = query.trim().toLowerCase();
    const shown = models.filter((id) => !term || id.toLowerCase().includes(term)).slice(0, 80);
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "ns-model-picker-empty";
      empty.textContent = models.length ? "No matches" : "No models loaded yet";
      list.append(empty);
      return;
    }
    for (const id of shown) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ns-model-picker-item";
      item.textContent = id;
      item.addEventListener("click", () => {
        modelEl.value = id;
        modelEl.dispatchEvent(new Event("input", { bubbles: true }));
        modelEl.dispatchEvent(new Event("change", { bubbles: true }));
        status.textContent = `Selected ${id}`;
        menu.hidden = true;
      });
      list.append(item);
    }
  };

  const load = async () => {
    const key = keyEl.value.trim();
    const router = routerEl.value.trim();
    if (!key || !router || /mock/i.test(router)) {
      models = [];
      status.textContent = "Enter a model ID, or click the field to choose.";
      return;
    }
    if (controller) controller.abort();
    controller = new AbortController();
    status.textContent = "Loading models…";
    try {
      const response = await fetch(`${router.replace(/\/$/, "")}/models`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const entries = Array.isArray(body?.data) ? body.data : [];
      models = entries
        .filter((item) => !item.type || item.type === "chat")
        .filter((item) => !item.supported_parameters || item.supported_parameters.includes("tools"))
        .map((item) => item.id)
        .filter(Boolean);
      // Keep the runtime's native datalist in sync so its validation agrees.
      const datalist = document.querySelector("#ns-model-options");
      if (datalist) {
        datalist.replaceChildren();
        for (const id of models) {
          const option = document.createElement("option");
          option.value = id;
          datalist.append(option);
        }
      }
      status.textContent = models.length
        ? `${models.length} tool-capable models — click the Model field to choose`
        : "No tool-capable models — type an ID";
      draw();
    } catch {
      models = [];
      status.textContent = "Could not load models — type an ID";
    }
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, 400);
  };
  keyEl.addEventListener("input", schedule);
  routerEl.addEventListener("input", schedule);
  const openMenu = () => {
    if (menu.hidden) {
      menu.hidden = false;
      search.value = "";
      draw();
      search.focus();
    }
  };
  modelEl.addEventListener("click", openMenu);
  modelEl.addEventListener("focus", openMenu);
  search.addEventListener("input", () => draw(search.value));
}

/** The runtime rebuilds the agent list on every trace event; tag peers by label. */
function decorateAgentCards() {
  const list = document.querySelector("#ns-anodes");
  if (!list) return;
  const apply = () => {
    for (const node of list.querySelectorAll(".ns-anode")) {
      const label = node.querySelector(".ns-aname")?.textContent || "";
      let kind = "peer";
      if (/SpareParts/i.test(label)) kind = "parts";
      else if (/Repair Pros/i.test(label)) kind = "pro";
      else if (/Open Agentic Web/i.test(label)) kind = "guide";
      else if (/your concierge/i.test(node.textContent || "")) kind = "local";
      node.dataset.peerKind = kind;
      const address = node.querySelector(".ns-aaddr");
      if (address) {
        const text = address.textContent || "";
        address.title = text;
        // The runtime injects <wbr> into addresses; those defeat ellipsis.
        if (address.querySelector("wbr")) address.textContent = text;
      }
    }
  };
  apply();
  new MutationObserver(apply).observe(list, { childList: true, subtree: true });
}

const PROVIDER_KEY_URLS = {
  Otari: "https://otari.ai/dashboard#/keys",
  "Google AI Studio": "https://aistudio.google.com/apikey",
  Groq: "https://console.groq.com/keys",
  OpenRouter: "https://openrouter.ai/settings/keys",
  OpenAI: "https://platform.openai.com/api-keys",
  Anthropic: "https://console.anthropic.com/settings/keys",
};

/**
 * Turn the BYOK panel into a guided flow:
 * selectable provider cards (incl. Custom) → "get a key" link for the chosen
 * provider → Provider URL → API key → model → actions. Secondary setup fields
 * are grouped at the bottom. Provider cards select, they do not navigate.
 */
function reorderSettings() {
  const body = document.querySelector("#agent-app .ns-settings-body");
  if (!body) return;
  const labelFor = (id) =>
    [...body.querySelectorAll("label")].find((label) => label.querySelector(`#${id}`));
  const help = body.querySelector(".ns-key-help");
  const providers = help?.querySelector(".ns-key-providers");
  const routerLabel = labelFor("ns-router");
  const keyLabel = labelFor("ns-key");
  const modelLabel = labelFor("ns-model");
  const actions = body.querySelector(".ns-start-actions");

  const routerEl = body.querySelector("#ns-router");
  const modelEl = body.querySelector("#ns-model");
  const keyEl = body.querySelector("#ns-key");
  const nameEl = body.querySelector("#ns-profile-name");

  const keyLine = document.createElement("p");
  keyLine.className = "ns-get-key";
  const keyText = document.createElement("span");
  const keyLink = document.createElement("a");
  keyLink.target = "_blank";
  keyLink.rel = "noopener noreferrer";
  keyLine.append(keyText, keyLink);

  const selectProvider = (name, router, model) => {
    if (routerEl) {
      routerEl.value = router || "";
      routerEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (modelEl) modelEl.value = model || "";
    if (nameEl) nameEl.value = name || "Custom";
    keyText.textContent =
      name && name !== "Custom"
        ? `Don't have an API key? Get one from ${name}. `
        : "Don't have an API key? ";
    keyLink.textContent = name === "Custom" ? "choose an endpoint" : "Get a key ↗";
    keyLink.href = PROVIDER_KEY_URLS[name] || "#";
    keyLink.hidden = name === "Custom";
    for (const card of providers?.querySelectorAll("[data-ns-provider]") || []) {
      card.setAttribute("aria-pressed", String(card.dataset.nsProvider === name));
    }
    providers
      ?.querySelector(".ns-provider-custom")
      ?.setAttribute("aria-pressed", String(name === "Custom"));
  };

  if (providers) {
    const providerLabel = document.createElement("div");
    providerLabel.className = "ns-select-provider-label";
    providerLabel.textContent = "Select provider";
    providers.before(providerLabel);

    for (const card of providers.querySelectorAll("a[data-ns-provider]")) {
      const name = card.dataset.nsProvider;
      // Capture phase stops the runtime's own handler from opening a new tab.
      card.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          selectProvider(name, card.dataset.router, card.dataset.model);
        },
        true,
      );
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectProvider(name, card.dataset.router, card.dataset.model);
        }
      });
      card.removeAttribute("href");
      card.removeAttribute("target");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
    }

    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "ns-provider-custom";
    custom.innerHTML =
      '<span aria-hidden="true">+</span><span>Custom provider<small>Enter your own endpoint</small></span>';
    custom.addEventListener("click", () => selectProvider("Custom", "", ""));
    providers.appendChild(custom);
    providers.after(keyLine);
  }

  // Both runtime hints are redundant next to our compact copy.
  for (const hint of body.querySelectorAll(".ns-hint")) hint.hidden = true;
  body.querySelector(".ns-in-use")?.removeAttribute("title");

  const more = document.createElement("details");
  more.className = "ns-more-setup";
  const moreSummary = document.createElement("summary");
  moreSummary.textContent = "More setup options";
  more.append(moreSummary);
  for (const element of [
    labelFor("ns-profile-name"),
    body.querySelector("#ns-router-hint"),
    body.querySelector(".ns-profile-actions"),
    body.querySelector("#ns-profile-hint"),
    body.querySelector(".ns-openrouter-key"),
  ]) {
    if (element) more.appendChild(element);
  }

  const extras = document.createElement("div");
  extras.className = "ns-setup-extras";
  for (const element of [body.querySelector(".ns-in-use"), labelFor("ns-profile"), more]) {
    if (element) extras.appendChild(element);
  }

  // Native <option> elements cannot be styled reliably, so give Saved setup a
  // custom listbox while keeping the real <select> for the runtime.
  const select = extras.querySelector("#ns-profile") || document.querySelector("#ns-profile");
  if (select && !select.dataset.customDropdown) {
    select.dataset.customDropdown = "true";
    select.style.display = "none";
    const wrap = document.createElement("div");
    wrap.className = "ns-profile-wrap";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ns-profile-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const value = document.createElement("span");
    const arrow = document.createElement("span");
    arrow.className = "ns-profile-arrow";
    trigger.append(value, arrow);
    const menu = document.createElement("div");
    menu.className = "ns-profile-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    wrap.append(trigger, menu);
    select.after(wrap);

    const sync = () => {
      value.textContent = select.selectedOptions[0]?.textContent || "Custom / unsaved";
    };
    const build = () => {
      menu.replaceChildren();
      for (const option of select.options) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "ns-profile-option";
        item.setAttribute("role", "option");
        item.textContent = option.textContent;
        item.setAttribute("aria-selected", String(option.value === select.value));
        item.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          menu.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
          sync();
        });
        menu.appendChild(item);
      }
    };
    trigger.addEventListener("click", () => {
      build();
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    });
    select.addEventListener("change", sync);
    new MutationObserver(build).observe(select, { childList: true });
    build();
    sync();
  }

  for (const element of [help, routerLabel, keyLabel, modelLabel, actions, extras]) {
    if (element) body.appendChild(element);
  }
}

export class AssistantMount {
  static GREETING =
    "I can diagnose faults from the Fixpoint manuals, stage the right part, and book a pro — using your own AI key.";
  static NEEDS_KEY_GREETING =
    "Add your AI key in AI model settings below, then describe a symptom.";

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
    if (AssistantMount.bootPromise) return AssistantMount.bootPromise;
    AssistantMount.bootPromise = (async () => {
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
        // Active BYOK setup for the post-turn suggestion call. The key is only
        // ever read here and sent to this same router — never stored or logged.
        window.__FIXPOINT_ACTIVE_CONFIG__ = () => ({
          router:
            booted.engine.top?.llm?.baseUrl || document.querySelector("#ns-router")?.value || "",
          key: booted.engine.byokKey || document.querySelector("#ns-key")?.value || "",
          model: booted.engine.modelOverride || document.querySelector("#ns-model")?.value || "",
        });
        window.__FIXPOINT_OBS__?.note("assistant_boot", {
          origin: siteBase,
          needsKey: !booted.engine.byokKey || booted.engine.byokKey === "demo",
        });

        const needsKey =
          !booted.engine.mockLLM && (!booted.engine.byokKey || booted.engine.byokKey === "demo");
        if (status) {
          status.textContent = needsKey
            ? "Add your AI key in settings below to start."
            : "Assistant connected to this page.";
        }
        reorderSettings();
        wireModelPicker();
        decorateAgentCards();
        AssistantMount.greet(needsKey);
        return booted.engine;
      } catch (error) {
        if (status)
          status.textContent = "The assistant could not load. You can still use the site directly.";
        console.error("Assistant startup failed", error);
        return null;
      }
    })();
    return AssistantMount.bootPromise;
  }

  static greet(needsKey = false) {
    const first = document.querySelector("#ns-msgs .ns-msg.bot");
    if (first) {
      first.textContent = needsKey ? AssistantMount.NEEDS_KEY_GREETING : AssistantMount.GREETING;
    }
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
// Vite injects the React bundle into <head>, so React's effect can run before this
// body script executes. Announce readiness explicitly so the island can boot.
if (typeof window !== "undefined") {
  window.__FIXPOINT_MOUNT__ = AssistantMount;
  window.dispatchEvent(new CustomEvent("fixpoint:mount-ready"));
}
