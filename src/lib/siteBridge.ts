import { useEffect, useState } from "react";
import type { SiteState } from "../types/global";

export const EMPTY_STATE: SiteState = {
  appliances: [],
  parts: [],
  slots: [],
  kit: { items: [], version: 0 },
  booking: null,
  selected: { applianceId: null, symptomId: null },
};

/** Subscribe to the one shared store in public/store.js. */
export function useSiteState(): SiteState {
  const [state, setState] = useState<SiteState>(
    () => window.__FIXPOINT__?.getState() ?? EMPTY_STATE,
  );

  useEffect(() => {
    const bridge = window.__FIXPOINT__;
    if (!bridge) return;
    const update = () => setState(bridge.getState());
    update();
    return bridge.subscribe(update);
  }, []);

  return state;
}

/** Call a site function. The same functions back both the pages and the agent's website_* tools. */
export function callPage<T = unknown>(name: string, ...args: unknown[]): T | undefined {
  const fn = window.__FIXPOINT__?.page?.[name];
  return typeof fn === "function" ? (fn(...args) as T) : undefined;
}
