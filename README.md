# Fixpoint

**Diagnose the fault. Stage the right part. Book the pro.**

Fixpoint is an agentified appliance-repair website built for the
[Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/). It takes a real
website pattern — a manual library, symptom guide, repair kit and booking page — and adds
an assistant that runs **in the visitor's browser on the visitor's own AI key**.

The assistant answers only from the grounded troubleshooting data in
`public/data/manuals.js`, asks one question at a time through a generated CRUSE chooser,
stages the matching part in the visible kit, and can call two peer agent networks (a parts
supplier and a repair pro) after showing a consent card.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173, expand **⚙ AI model settings** in the assistant, and paste an
Otari key (`otk_…`). The default router is `https://api.otari.ai/api/v1` and the default
model is `alibaba/qwen3.8-flash`. EU keys (`otk_v1_eu_…`) are detected automatically.

```bash
npm run check:network   # validate HOCON/manifest against the MVP spec
npm test                # store + React unit tests
npm run build           # typecheck, lint-free build, static bundle in dist/
npm run preview         # serve dist/ with CORS headers on public artifacts
```

## Architecture

```
fixpoint.hocon ──build──▶ public/fixpoint.network.json ◀── public/runtime/index.js boot()
public/agent-manifest.json ──────────────────────────────────┘
public/site-actions.js ──▶ website_* tools ──▶ public/store.js ──▶ React pages
```

- `public/runtime/` is an unmodified copy of the challenge's browser runtime. Never edit it.
- `public/store.js` is the single source of truth for both React and the agent's website
  tools. React reads it through `window.__FIXPOINT__`.
- `#agent-app` is a React leaf; the runtime owns its children after boot.
- The UI is React + TypeScript + Tailwind CSS 4, layered as `components/{ui,layout,features,assistant}`.
- Generated files (`*.network.json`, `agent-mcp.json`, `.well-known/*`, `bridge/*`) come
  from `fixpoint.hocon` + `agent-manifest.json`. Edit those sources and rebuild.

## Hosting

Deploy `dist/`. Vercel is the primary target — `vercel.json` sets the Vite preset and applies
`Access-Control-Allow-Origin: *` to all public artifacts so other origins' browsers can fetch
them. `public/_headers` provides the equivalent rules for Cloudflare Pages / Netlify.
Disable Vercel Deployment Protection on the production domain.
See `tooling/references/bundle_and_hosting.md`.

## Spec & credits

- [Open Agentic Web MVP spec](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md)
- [Using Otari](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/providers/otari.md)
- [CRUSE presentation protocol](https://github.com/cognizant-ai-lab/nsdeploy/blob/main/docs/cruse.md)
- Browser runtime: [nsdeploy](https://github.com/cognizant-ai-lab/nsdeploy) (Apache 2.0)
