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

## Deployment (already live)

Vercel project `localpros-fixpoint`, root directory `peers/localpros`, deployed from this branch with `vercel --prod --yes`. No build command; `vercel.json` only supplies the global CORS headers.

**Peer URL:** `https://localpros-fixpoint.vercel.app/localpros`

The bridge page must stay frameable — do not add `X-Frame-Options: DENY` or a restrictive `frame-ancestors` CSP. To redeploy after editing this folder, run `cd peers/localpros && vercel --prod --yes`. Verify with:

```
node tooling/scripts/check_partner.mjs https://localpros-fixpoint.vercel.app/localpros --origin https://askfixpoint.vercel.app
```

Slot ids, labels and prices in `catalogue.js` are mirrored in `public/data/manuals.js`, so `website_book_repair` accepts every slot this peer returns.

These Vercel projects were deployed from this folder with the CLI and are **not** connected to Git auto-deploy. After editing this folder, redeploy explicitly with `vercel --prod --yes --name localpros-fixpoint` — the `--name` matters; without it Vercel deploys the repo root instead.

## Editing the catalogue

Change `catalogue.js` to update slot ids, labels, prices or dates. Keep the shape of each entry
as `{ id, label, price, date }`: `date` is used by `filterSlots(date)` for prefix filtering, and
only `id`, `label` and `price` are returned to agents. Both `site-actions.js` and
`bridge/bridge-actions.js` import this file, so the local and shared views stay identical.
