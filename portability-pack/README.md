# Portability Pack — a reusable diagnostic agent network

A shareable starter for anyone who wants a grounded, four-agent diagnostic assistant on
their own site. It is the de-identified core of [Fixpoint](../README.md): a front desk,
a diagnostic specialist, a parts runner and a booking clerk, driven by a published
troubleshooting dataset. Fork it, fill the TODO slots, and build.

## 3-step quickstart

1. **Copy the HOCON.** Copy `diagnostic-network.hocon` to your site root and rename it
   to your network name (e.g. `my_network.hocon`). Replace every `<TODO: ...>` marker:
   your **site name** (`commondefs.replacement_strings.site_name`), the **dataset source**
   (`metadata.source`), your **parts** catalogue and your **peers** (`link_labels` plus the
   front agent's `tools` list). Rename the `website_*` tools in the instructions to match
   the actions your site actually exposes. Keep the `cruse` block, the `commondefs`
   rules and the `allow` blocks (`sly_data: []` denies all private context) intact.

2. **Adapt the dataset.** Copy `manuals.example.js` to your site's data path (e.g.
   `public/data/manuals.js`) and replace the example with your own grounded, licensed
   data, keeping the same shape. Every diagnosis needs a real source section, every
   `resolution.partId` must match a `parts[].id`, and `slots` must reflect reality.
   Point `metadata.source.dataset_file` at it.

3. **Build with the tooling.** Using the `agentify-website` tooling in `tooling/`, build
   and validate, then serve the site:

   ```bash
   node tooling/scripts/build_network.mjs my_network.hocon \
     --manifest ./agent-manifest.json --runtime ./runtime \
     --out ./my_network.network.json --check
   node tooling/scripts/serve_site.mjs . --port 8080
   ```

   The build fails while any TODO / `<...>` marker remains — that is your signal that
   the template is not yet adapted. See `tooling/SKILL.md` for the full workflow.

`badge.html` is a one-line embeddable badge you can paste on any page to point at your
published network (update `data-ns-network` and `href` to your network URL).

## Published instructions are public by spec

The `.network.json`, its agent instructions, the manifest and the discovery files are
served to every browser and fetched by other agent sites. The
[MVP spec](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md)
treats these published definitions and instructions as **public**: never put API keys,
tokens, credentials, personal data or private business context in them. Control any
context you genuinely need to share across sites through `sly_data` (the deny rules
here share none) and keep secrets on the server or in the visitor's own settings.

## License / sharing

Share and adapt freely. Keep this attribution if you find it useful. Built for the
[Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/).
