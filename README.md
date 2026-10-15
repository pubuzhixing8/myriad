# myriad

PingCode Wiki `document:block` extensions built with React Native UI:

- **Background:** uses `layout: bodied` with one editable body (`main`). The Wiki editor owns the rich text; the extension saves the chosen Unsplash photo, background transparency, and vertical alignment.
- **Button:** uses React Custom UI with Templates and Configuration tabs, including Xiaohongshu and Bilibili examples. Configure shape, size, width, link, colors, hover colors, shadow, and an icon URL from Iconfont's HTTPS CDN.

## Runtime dependency

`NxImage` is implemented in the Nexus runtime. This application declares its tag locally until a version of `@pc-nexus/react` containing it is published. The target PingCode host must include its Native UI mapping for the Background block. The Button block runs in Custom UI and needs no runtime changes.

## Local checks

Use Node.js 24 or newer, then run `npm install`, `npm install --prefix web/main`, `npm run build-web`, and `nexus lint`. Background uses the Native UI entry `web/native/main.tsx`; Button uses the Custom UI output `web/main/dist`.

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
