# SpareParts Co — static Fixpoint peer

A minimal, **static** agent site that Fixpoint can call as a genuine peer network by URL. There is no React app and no backend: just a manifest, a network definition, two read-only action modules, and a copy of Fixpoint's runtime that serves the action bridge. When Fixpoint loads this peer, it runs the `parts_desk` front agent in the visitor's browser and the agent calls `website_check_stock` against the local catalogue.

## Deployment (already live)

Vercel project `spareparts-fixpoint`, root directory `peers/spareparts`, deployed from this branch with `vercel --prod --yes`. No build command; `vercel.json` only supplies the global CORS headers.

**Peer URL:** `https://spareparts-fixpoint.vercel.app/spareparts`

The **network name is the final path segment** (`spareparts`) and matches `agent-manifest.json` and `bridge/agent-manifest.json`. To redeploy after editing this folder, run `cd peers/spareparts && vercel --prod --yes`. Verify with:

```
node tooling/scripts/check_partner.mjs https://spareparts-fixpoint.vercel.app/spareparts --origin https://askfixpoint.vercel.app
```

Prices in `catalogue.js` match `public/data/manuals.js`, which is authoritative for Fixpoint's receipt totals.

These Vercel projects were deployed from this folder with the CLI and are **not** connected to Git auto-deploy. After editing this folder, redeploy explicitly with `vercel --prod --yes --name spareparts-fixpoint` — the `--name` matters; without it Vercel deploys the repo root instead.

## Layout

| File                         | Purpose                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `agent-manifest.json`        | Site manifest: network `spareparts`, front agent `parts_desk`, HOCON file, `check_stock` action. |
| `spareparts.network.json`    | One front agent, `parts_desk`, whose only tool is `website_check_stock`.                         |
| `catalogue.js`               | Local catalogue for `belt_42`, `pump_17`, `filter_09`, `fan_11`, `thermostat_22`.                |
| `site-actions.js`            | Registers `check_stock` with the local runtime.                                                  |
| `bridge/action-bridge.html`  | Loaded in a hidden frame by peers; must remain frameable.                                        |
| `bridge/agent-manifest.json` | Tells the bridge which actions to expose.                                                        |
| `bridge/bridge-actions.js`   | Registers the same `check_stock` action for callers.                                             |
| `runtime/`                   | Copy of Fixpoint's runtime (includes `action-bridge.js`).                                        |
| `vercel.json`                | Global CORS headers required for cross-origin peer calls.                                        |

## The `check_stock` action

- Effect: `read`
- Input: `{ partId: string }` (required, no extra properties)
- Known id → `{ ok: true, partId, inStock, price, eta }`
- Unknown id → `{ ok: false, reason }`

The front agent is instructed to call `website_check_stock` with the part id from the request and return its exact result as short plain text, never inventing stock, prices or ETAs.
