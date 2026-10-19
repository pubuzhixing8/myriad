# myriad

PingCode Wiki `document:block` extensions built with Nexus:

- **Myriad - Background:** Native UI block with an editable Wiki body, Unsplash backgrounds, transparency, and vertical alignment controls.
- **Myriad - Button:** Custom UI block with templates, configurable shape, size, link, colors, hover styles, shadows, and Iconfont icons.
- **Myriad - Cards:** Custom UI block that loads Wiki pages dynamically and presents selected pages as configurable cards.

The Background and Button extensions use `web/main/public/myriad.svg` for their Wiki slash-menu icon. Button and Cards share the `web/main/dist` Custom UI bundle; the entry component dispatches by extension key.

## Myriad - Cards

In edit mode, Cards:

- loads pages from the current Wiki space through the `listWikiPages` resolver;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, card type, column count, and hover style changes immediately;
- saves selected page metadata and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the Cards editor, add `?mode=view` for its saved-block view, or use `?extension=myriad-button` for the Button editor. Standalone Cards mode uses sample data; Nexus-hosted mode uses the Wiki API.

## Runtime dependency

`NxImage` is implemented in the Nexus runtime. This application declares its tag locally until a version of `@pc-nexus/react` containing it is published. The target PingCode host must include its Native UI mapping for the Background block. Button and Cards run in Custom UI and need no runtime changes.

## Local checks

Use Node.js 24 or newer:

```bash
npm install
npm install --prefix web/main
npm run build
nexus lint
```

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
