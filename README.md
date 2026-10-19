# myriad

PingCode Wiki `document:block` extensions built with Nexus:

- **Myriad - Background:** Native UI block with an editable Wiki body, Unsplash backgrounds, transparency, and vertical alignment controls.
- **Myriad - Button:** Custom UI block with templates, configurable shape, size, link, colors, hover styles, shadows, and Iconfont icons.
- **Myriad - Cards:** Custom UI block that loads Wiki pages dynamically and presents selected pages as configurable cards.

Background and Button use `web/button/public/myriad.svg` for their Wiki slash-menu icon. The Button editor uses the same logo in its header.

## Myriad - Cards

In edit mode, Cards:

- loads available Wiki spaces through `listWikiSpaces`, then filters pages by the selected `space_id` through `listWikiPages`;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, card type, column count, and hover style changes immediately;
- saves selected page metadata and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the Cards editor, or add `?mode=view` for its saved-block view. Standalone Cards mode uses sample data; Nexus-hosted mode uses the Wiki API. Run the Cards dev server from `web/cards`. The Button dev server uses port 3101.

## Runtime dependency

`NxImage` is implemented in the Nexus runtime. This application declares its tag locally until a version of `@pc-nexus/react` containing it is published. The target PingCode host must include its Native UI mapping for the Background block. Button and Cards run in Custom UI and need no runtime changes.

## Extension layout

Each block owns its configuration and assets under `plugins/<name>/`. Each Custom UI block has an independent entry and build under `web/<name>/`; Native UI entries live beside their plugin logic. Share pure TypeScript helpers across runtimes, but keep React components specific to Custom UI or Native UI. Register each extension and its resource in `manifest.yaml`.

## Local checks

Use Node.js 24 or newer:

```bash
npm install
npm install --prefix web/button
npm install --prefix web/cards
npm run build
nexus lint
```

Background uses the Native UI entry `plugins/background/native-ui/main.tsx`. Button and Cards use `web/button/dist` and `web/cards/dist` respectively.

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
