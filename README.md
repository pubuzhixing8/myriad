# myriad

PingCode Wiki `document:block` extensions built with Nexus:

- **Myriad - Background:** Native UI block with an editable Wiki body and a Custom UI editor in a max-size modal. Choose a theme background color or a Pixabay image, with Chinese and English labels and a live preview.
- **Myriad - Button:** Custom UI block with templates, configurable shape, size, link, colors, hover styles, shadows, and Iconfont icons.
- **Myriad - Pages:** Custom UI block that loads Wiki pages dynamically and presents selected pages as configurable page cards.
- **Myriad - Cards:** Independent block for up to six manually configured cards, with text, icons or Pixabay images.
- **Myriad - Embed HTML:** Sandboxed block for custom HTML/CSS/JS or an external website URL.
- **Myriad - Dynamic Content:** Custom UI block that lists Wiki spaces or pages matching configurable filters, with pagination.
- **Myriad - Tabs:** Native UI tabs with a separate editable Wiki body for each tab. The Custom UI editor manages tab names, adding and deleting tabs, and previews the selection.

Background and Button use `web/button/public/myriad.svg` for their Wiki slash-menu icon. The Button editor uses the same logo in its header.

## Myriad - Pages

In edit mode, Pages:

- loads available Wiki spaces through `listWikiSpaces`, then filters pages by the selected `space_id` through `listWikiPages`;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, column count, and hover style changes immediately;
- saves selected page metadata and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the Pages editor, or add `?mode=view` for its saved-block view. Standalone Pages mode uses sample data; Nexus-hosted mode uses the Wiki API. Run the Pages dev server from `web/pages`. The Button dev server uses port 3101.

## Myriad - Cards

Cards is a separate `layout: block` extension; Pages keeps its existing configuration and behavior. The max-size Cards editor supports up to six cards, layout and appearance settings, per-card text, icons, links, and Pixabay images. Image search uses the same Nexus resolver and encrypted API key as Background. Run `npm run dev --prefix web/cards` and open `http://127.0.0.1:3104/` to preview the editor locally; add `?mode=view` for the saved-block view. Pixabay search requires a Nexus-hosted session, while default images work in the standalone preview.

## Myriad - Embed HTML

The max-size editor follows the prototype's code and URL modes, three example templates, sanitization, border, scrolling, and accessible iframe title. Code runs in a nested sandboxed iframe. URL previews load only when requested in the editor; saved blocks load the URL immediately. Sites can refuse embedding through their own response headers. Run `npm run dev --prefix web/html` and open `http://127.0.0.1:3105/` for the editor or add `?mode=view` for the block.

## Myriad - Dynamic Content

Inserting the block first asks for a source type, then opens a settings page with filters on the left and a live, paginated result preview on the right. The saved settings are the query: the block renders the filtered result list and pages through it inside the Wiki page.

- **Space:** filter spaces by name keyword, visibility scope (`scope_type`), and archived state. The block lists the matching spaces from `listWikiSpaces` (`GET /v2/wiki/spaces`).
- **Page:** filter pages by space and, optionally, by a reference page (direct children via `parent_id` or all descendants via `ancestor_id`). The block lists the matching pages from `listWikiPages` (`GET /v2/wiki/pages`).

Display settings mirror the Cards block: card/list layout, alignment, card type (text / icon + text / image + text), 1–6 columns, hover effect (none / elevate / flip), image height and fit, an image series picked from `web/dynamic-content/public/background` (random per item, also used as list icons), accent color, gap / padding / radius / border / shadow, excerpts, metadata, sorting, and items per page (also used as page size). The left pane holds filters and display settings; the right pane previews exactly what the saved block will render, appending more results through a "load more" button. Both the editor and saved blocks fetch data through the Nexus REST gateway (`api.invoke` → `/api/nexus/gateway/rest-api/invoke`) using the saved settings — only the settings are persisted, never the result items. Open `http://127.0.0.1:3102/` during local development, or add `?mode=view` for its saved-block view.

## Background 本地调试

使用 Node.js 24 或更新版本。只查看编辑页面时，在项目根目录运行：

```bash
npm run dev:background
```

然后打开 `http://127.0.0.1:3102/`。页面会使用示例配置；可用 `?locale=zh-CN` 或 `?locale=en-US` 预览语言效果。正式环境通过 Nexus i18n 读取 PingCode 用户的语言设置，不显示语言切换控件。保存需要在 PingCode 中调试。

图片选择页通过 Pixabay API 展示默认图片并搜索全图库，支持颜色、图片方向和分页。搜索由 Nexus Resolver 在服务端执行，不会把 API Key 暴露给浏览器。先在 [Pixabay API 页面](https://pixabay.com/api/docs/)获取密钥，再在项目目录的终端运行：

```bash
nexus variables set --encrypt -e development PIXABAY_API_KEY
```

命令会提示输入密钥；不要将密钥写入代码、提交到 Git 或贴到聊天中。配置后重新部署 development，并在 PingCode 中打开编辑弹框测试搜索。直接访问本地 Vite 页面只能预览 UI，不能调用 Nexus Resolver。当前版本直接保存 Pixabay 返回的图片地址，属于临时方案；Pixabay API 不允许长期引用其图片地址，后续需要将选中的图片存入自有存储。

本地 Nexus 调试会读取 development 环境中已设置的加密变量。项目的 `npm run debug:nexus` 使用修正了变量覆盖问题的 Nexus CLI 版本；无需在本地文件或命令行中再次写入 Key。

要在已部署并安装到测试站点的 development 应用里调试，先在本地 `nexus.json` 的 `serve.resources` 中配置 `background-editor` 的端口为 `3102`，然后运行：

```bash
npm run debug
```

这个命令会同时启动 Background 前端和 Nexus 调试隧道；按 Ctrl+C 会一起停止。首次启动 Nexus 调试可能需要在终端完成测试账号绑定。

`nexus.json` 是个人本地配置，不提交到 Git。改动 `manifest.yaml` 后仍需重新部署；新增 Pixabay 后端请求权限后，还需重新分发并由企业管理员确认权限。首次调试还需完成分发、企业管理员安装和测试账号绑定。

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
npm install --prefix web/cards
npm install --prefix web/html
npm install --prefix web/background
npm install --prefix web/dynamic-content
npm run build
nexus lint
```

Background uses the Native UI entry `plugins/background/native-ui/main.tsx` for its saved block and `web/background/dist` for configuration. Button, Pages, Cards, and Embed HTML use their own `web/*/dist` Custom UI resources.

## Alpha and RC deployment

The application has separate Nexus registrations for Alpha and RC. The tracked `nexus-bindings.json` stores their app IDs. The local `nexus.json` selects the active platform and remains excluded from Git. The commands below use the shared `nxp` tool from `../../../playground/nexus-platform/bin/nxp`; set `NXP_BIN` to its absolute path if it lives elsewhere. `nxp use` switches the platform and app ID together before deployment. The deploy commands build the web resources and pass `--no-verify` to Nexus because the Button extension uses `layout: inline`, which the CLI linter currently rejects. Run `npm install` first; the npm commands use the project's pinned Nexus CLI and React builder (`1.0.0-next.0`) on Node.js 24 or newer.

| Target | Deploy development | Distribute development |
| --- | --- | --- |
| Alpha | `npm run deploy:alpha` | `npm run distribute:alpha` |
| RC | `npm run deploy:rc` | `npm run distribute:rc` |

Run deployment before distribution. Alpha uses `wiki.alpha.pingcode.live`; RC uses `fancy-block-hackathon.pingcode.com`. To inspect the active platform and bindings, run `../../../playground/nexus-platform/bin/nxp status` (or `$NXP_BIN status`). Distribution still requires an enterprise administrator to install or approve the application in PingCode.

Set the encrypted `PIXABAY_API_KEY` separately on each Nexus platform before deploying there. `nexus.json` is personal local configuration and is intentionally excluded from Git.
