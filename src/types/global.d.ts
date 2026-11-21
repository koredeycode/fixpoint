// The agent-facing layer is plain JS in public/. React talks to it through a
// small global bridge instead of importing it (which would create a second
// module instance and therefore a second copy of the site state).

export interface KitItem {
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface SiteState {
  appliances: Array<{
    id: string;
    name: string;
    manual: string;
    symptoms: Array<{ id: string; name: string }>;
  }>;
  parts: Array<{ id: string; name: string; price: number; fits: string[] }>;
  slots: Array<{ id: string; label: string; price: number }>;
  kit: { items: KitItem[]; version: number };
  booking: {
    confirmation: string;
    slot: string;
    items: number;
    total: number;
  } | null;
  selected: { applianceId: string | null; symptomId: string | null };
}

export interface FixpointBridge {
  getState(): SiteState;
  subscribe(listener: () => void): () => void;
  page: Record<string, (...args: unknown[]) => unknown>;
}

export interface FixpointMount {
  start(): Promise<unknown>;
}

export interface ObsEvent {
  seq?: number;
  phase?: string;
  kind?: string;
  status?: string;
  durationMs?: number;
  origin?: string;
  tool?: string;
  note?: string;
  error?: string;
  at?: number;
}

export interface ObsSummary {
  turns: number;
  toolCalls: number;
  peerCalls: number;
  consentDecisions: number;
  errors: number;
  avgToolMs: number;
  avgSpanMs: number;
  lastAt: number | null;
  uptimeMs: number;
}

export interface ObsBridge {
  events(): ObsEvent[];
  summary(): ObsSummary;
  note(kind: string, fields?: Record<string, unknown>): void;
  clear(): void;
  export(): unknown;
  rawTrace(): unknown;
}

declare global {
  interface Window {
    __FIXPOINT__?: FixpointBridge;
    __FIXPOINT_MOUNT__?: FixpointMount;
    __FIXPOINT_OBS__?: ObsBridge;
  }
}

export {};
