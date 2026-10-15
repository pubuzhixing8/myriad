# myriad

PingCode Wiki `document:block` background image extension. It uses React Native UI and `layout: bodied` with one editable body (`main`). The Wiki editor owns the rich text; the extension saves the chosen Unsplash photo, background transparency, and vertical alignment.

## Runtime dependency

The `NxImage` Native UI component is implemented in the Nexus runtime. The application declares the `nx-image` tag locally until a version of `@pc-nexus/react` containing the component is published. The target PingCode host must include the corresponding Native UI mapping and opacity input before this block can render correctly. Deploying this app alone does not update the host runtime.

## Local checks

Use Node.js 24 or newer, then run `npm install`, `npm run build-web`, and `nexus lint`. The Native UI resource entry is `web/native/main.tsx`. The generated `web/main` Custom UI scaffold is unused.

`nexus.json` and `nexus-bindings.json` are local platform configuration and are intentionally excluded from Git.
