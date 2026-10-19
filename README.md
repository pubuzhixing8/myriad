# myriad

PingCode Wiki `document:block` extensions built with React Native UI:

- **Myriad - Background:** uses `layout: bodied` with one editable body (`main`). The Wiki editor owns the rich text; the extension saves the chosen Unsplash photo, background transparency, and vertical alignment.
- **Myriad - Button:** uses React Custom UI with Templates and Configuration tabs, including Xiaohongshu and Bilibili examples. Configure shape, size, width, link, colors, hover colors, shadow, and selectable Iconfont icons.

Both extensions use `web/button/public/myriad.svg` for their Wiki slash-menu icon. The Button editor uses the same logo in its header.

## Runtime dependency

`NxImage` is implemented in the Nexus runtime. This application declares its tag locally until a version of `@pc-nexus/react` containing it is published. The target PingCode host must include its Native UI mapping for the Background block. The Button block runs in Custom UI and needs no runtime changes.

## Local checks

Use Node.js 24 or newer, then run `npm install`, `npm install --prefix web/button`, `npm run build-web`, and `nexus lint`. Background uses the Native UI entry `plugins/background/native-ui/main.tsx`; Button uses the Custom UI output `web/button/dist`.

## Extension layout

Each block owns its configuration and assets under `plugins/<name>/`. Custom UI build entries live under `web/<name>/`; Native UI entries live beside their plugin logic. Share pure TypeScript helpers across runtimes, but keep React components specific to Custom UI or Native UI. Register each extension and its resource in `manifest.yaml`.

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
