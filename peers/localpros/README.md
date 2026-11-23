# Local Repair Pros — static Fixpoint peer

A minimal, static-only agent site that Fixpoint can call as a genuine peer network by URL.
There is no React app and no backend: just a manifest, one network description, one read-only
action, a self-contained copy of the agent runtime, and an action bridge.

- Vercel project name: `localpros-fixpoint`
- Peer URL: `https://localpros-fixpoint.vercel.app/localpros`
- Network: `localpros`, front agent: `pro_desk`
- Shared action: `available_slots` (exposed to calling agents as `website_available_slots`)

## Files

| Path                         | Purpose                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `agent-manifest.json`        | Site manifest: `localpros` / `pro_desk`, points at `localpros.network.json`, `site-actions.js` and the bridge. |
| `localpros.network.json`     | One front agent, `pro_desk`. It calls `website_available_slots` and returns the exact result.                  |
| `site-actions.js`            | Registers the `available_slots` read action for a locally running network.                                     |
| `catalogue.js`               | The four static slots and the `filterSlots(date)` helper.                                                      |
| `bridge/action-bridge.html`  | Hidden-frame bridge other sites load before running this network. Do not block framing.                        |
| `bridge/agent-manifest.json` | Bridge manifest: shares `available_slots` for network `localpros`.                                             |
| `bridge/bridge-actions.js`   | Registers the same `available_slots` read action for callers.                                                  |
| `runtime/`                   | Full copy of `public/runtime/` from the Fixpoint site, so this peer is self-contained.                         |
| `vercel.json`                | Copied from the primary site; provides permissive CORS headers for peer calls.                                 |

## Deploy

1. Create a Vercel project named `localpros-fixpoint` whose Root Directory is this folder
   (`peers/localpros` in the repository).
2. Deploy it as a **static** site. The checked-in `vercel.json` is copied from the primary site
   and still names Vite's `npm ci` / `npm run build` / `dist` pipeline; because this folder has
   no `package.json` or build step, override those settings in the Vercel project (empty Build
   Command and Output Directory set to the project root), or replace `vercel.json` with a static
   config that keeps the same CORS headers.
3. Keep the CORS headers (`Access-Control-Allow-Origin: *`, `GET, OPTIONS`) so Fixpoint can load
   the manifest, network and bridge cross-origin. Do not add `X-Frame-Options: DENY` or a
   `frame-ancestors` CSP: the bridge page must be frameable.
4. Confirm these URLs respond:
   - `https://localpros-fixpoint.vercel.app/localpros/agent-manifest.json`
   - `https://localpros-fixpoint.vercel.app/localpros/localpros.network.json`
   - `https://localpros-fixpoint.vercel.app/localpros/bridge/action-bridge.html`
5. In the calling Fixpoint site, import this peer by the peer URL above (add it to
   `allowed_peers` / the link imports and enable the peer). Fixpoint then loads this network in
   the visitor's browser and receives only `website_available_slots`.

## Editing the catalogue

Change `catalogue.js` to update slot ids, labels, prices or dates. Keep the shape of each entry
as `{ id, label, price, date }`: `date` is used by `filterSlots(date)` for prefix filtering, and
only `id`, `label` and `price` are returned to agents. Both `site-actions.js` and
`bridge/bridge-actions.js` import this file, so the local and shared views stay identical.
