# myriad

PingCode Wiki `document:block` extensions built with Nexus.

## Myriad - Cards

`myriad-cards` is a Custom UI block for selecting Wiki pages and presenting them as visual cards. In edit mode it:

- loads the current Wiki space's pages through the `listWikiPages` resolver;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, card type, column count, and hover style changes immediately;
- saves the selected page metadata in block config and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the edit preview, or add `?mode=view` for the saved block view. Standalone mode uses local sample data; Nexus-hosted mode uses the Wiki API.

## Background block

The existing `myriad-background` block remains available as a Native UI extension. Its `NxImage` component depends on the corresponding Nexus runtime mapping.

## Local checks

Use Node.js 24 or newer:

```bash
npm install
npm install --prefix web/main
npm run build
nexus lint
```

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
