# SpareParts Co — static Fixpoint peer

A minimal, **static** agent site that Fixpoint can call as a genuine peer network by URL. There is no React app and no backend: just a manifest, a network definition, two read-only action modules, and a copy of Fixpoint's runtime that serves the action bridge. When Fixpoint loads this peer, it runs the `parts_desk` front agent in the visitor's browser and the agent calls `website_check_stock` against the local catalogue.

## Deploy to Vercel

1. Create a new Vercel project and point the **root directory** at this folder:
   `peers/spareparts`.
2. Use the framework preset **Other** (the included `vercel.json` sets the Vite preset, which is harmless here — there is no build step; the global CORS headers in it are the essential part for cross-origin framing/fetching).
3. Suggested **project name**: `spareparts-fixpoint`.
4. Deploy. No environment variables or build command are required.

The peer URL is then:

```
https://spareparts-fixpoint.vercel.app/spareparts
```

The **network name is the final path segment** (`spareparts`). It must match `"name": "spareparts"` in `agent-manifest.json` and the network name in `bridge/agent-manifest.json`, because that is the name Fixpoint uses to address the peer.

In the Fixpoint site's `allowed_peers` / link imports, register the peer with the URL above (or its origin) so it can discover and call this network.

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
