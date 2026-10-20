# myriad

PingCode Wiki `document:block` extensions built with Nexus:

- **Myriad - Background:** Native UI block with an editable Wiki body, Unsplash backgrounds, transparency, and vertical alignment controls.
- **Myriad - Button:** Custom UI block with templates, configurable shape, size, link, colors, hover styles, shadows, and Iconfont icons.
- **Myriad - Pages:** Custom UI block that loads Wiki pages dynamically and presents selected pages as configurable page cards.
- **Myriad - Dynamic Content:** Custom UI block that auto-populates Wiki content from a selected space or from child pages under a selected page.

Background and Button use `web/button/public/myriad.svg` for their Wiki slash-menu icon. The Button editor uses the same logo in its header.

## Myriad - Pages

In edit mode, Pages:

- loads available Wiki spaces through `listWikiSpaces`, then filters pages by the selected `space_id` through `listWikiPages`;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, column count, and hover style changes immediately;
- saves selected page metadata and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the Pages editor, or add `?mode=view` for its saved-block view. Standalone Pages mode uses sample data; Nexus-hosted mode uses the Wiki API. Run the Pages dev server from `web/pages`. The Button dev server uses port 3101.

## Myriad - Dynamic Content

Inserting the block first asks for a source type, then opens a settings page with filters on the left and a live, paginated result preview on the right. The saved settings are the query: the block renders the filtered result list and pages through it inside the Wiki page.

- **Space:** filter spaces by name keyword, visibility scope (`scope_type`), and archived state. The block lists the matching spaces from `listWikiSpaces` (`GET /v2/wiki/spaces`).
- **Page:** filter pages by space and, optionally, by a reference page (direct children via `parent_id` or all descendants via `ancestor_id`). The block lists the matching pages from `listWikiPages` (`GET /v2/wiki/pages`).

Display settings choose card/list layout, columns, items per page (also used as page size), sorting, excerpts, and metadata. The left pane holds filters and display settings; the right pane previews exactly what the saved block will render, including pagination. Saved blocks re-run the query in view mode and support previous/next paging; the last saved snapshot stays as a fallback. Open `http://127.0.0.1:3102/` during local development, or add `?mode=view` for its saved-block view.

## Runtime dependency

`NxImage` is implemented in the Nexus runtime. This application declares its tag locally until a version of `@pc-nexus/react` containing it is published. The target PingCode host must include its Native UI mapping for the Background block. Button and Pages run in Custom UI and need no runtime changes.

## Extension layout

Each block owns its configuration and assets under `plugins/<name>/`. Each Custom UI block has an independent entry and build under `web/<name>/`; Native UI entries live beside their plugin logic. Share pure TypeScript helpers across runtimes, but keep React components specific to Custom UI or Native UI. Register each extension and its resource in `manifest.yaml`.

## Local checks

Use Node.js 24 or newer:

```bash
npm install
npm install --prefix web/button
npm install --prefix web/pages
npm install --prefix web/dynamic-content
npm run build
nexus lint
```

Background uses the Native UI entry `plugins/background/native-ui/main.tsx`. Button and Pages use `web/button/dist` and `web/pages/dist` respectively.

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
