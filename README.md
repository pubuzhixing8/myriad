# myriad

PingCode Wiki `document:block` extensions built with Nexus:

- **Myriad - Background:** Native UI block with an editable Wiki body and a fullscreen Custom UI editor. Choose a theme background color or a Pixabay image, with Chinese and English labels and a live preview.
- **Myriad - Button:** Custom UI block with templates, configurable shape, size, link, colors, hover styles, shadows, and Iconfont icons.
- **Myriad - Pages:** Custom UI block that loads Wiki pages dynamically and presents selected pages as configurable page cards.

Background and Button use `web/button/public/myriad.svg` for their Wiki slash-menu icon. The Button editor uses the same logo in its header.

## Myriad - Pages

In edit mode, Pages:

- loads available Wiki spaces through `listWikiSpaces`, then filters pages by the selected `space_id` through `listWikiPages`;
- supports paging, filtering the current result page, refresh, and selecting up to 12 pages;
- previews alignment, column count, and hover style changes immediately;
- saves selected page metadata and refreshes it by page ID in view mode.

Open `http://127.0.0.1:3100/` during local development for the Pages editor, or add `?mode=view` for its saved-block view. Standalone Pages mode uses sample data; Nexus-hosted mode uses the Wiki API. Run the Pages dev server from `web/pages`. The Button dev server uses port 3101.

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
npm run build
nexus lint
```

Background uses the Native UI entry `plugins/background/native-ui/main.tsx` for its saved block and `web/background/dist` for configuration. Button and Pages use `web/button/dist` and `web/pages/dist` respectively.

## Alpha and RC deployment

The application has separate Nexus registrations for Alpha and RC. The tracked `nexus-bindings.json` stores their app IDs. The local `nexus.json` selects the active platform and remains excluded from Git. The commands below use the shared `nxp` tool from `../../../playground/nexus-platform/bin/nxp`; set `NXP_BIN` to its absolute path if it lives elsewhere. `nxp` switches the platform and app ID together, then verifies the target before deploying or distributing.

| Target | Deploy development | Distribute development |
| --- | --- | --- |
| Alpha | `npm run deploy:alpha` | `npm run distribute:alpha` |
| RC | `npm run deploy:rc` | `npm run distribute:rc` |

Run deployment before distribution. Alpha uses `wiki.alpha.pingcode.live`; RC uses `fancy-block-hackathon.pingcode.com`. To inspect the active platform and bindings, run `../../../playground/nexus-platform/bin/nxp status` (or `$NXP_BIN status`). Distribution still requires an enterprise administrator to install or approve the application in PingCode.

Set the encrypted `PIXABAY_API_KEY` separately on each Nexus platform before deploying there. `nexus.json` is personal local configuration and is intentionally excluded from Git.
