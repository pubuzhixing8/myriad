export type EmbedMode = "code" | "url";
export type Scrolling = "auto" | "yes" | "no";

export const MIN_EMBED_HEIGHT = 200;
export const MAX_EMBED_HEIGHT = 20_000;

export interface EmbedHtmlConfig {
  mode: EmbedMode;
  code: string;
  url: string;
  sanitize: boolean;
  showBorder: boolean;
  scrolling: Scrolling;
  height: number;
  docTitle: string;
}

export const DEFAULT_CONFIG: EmbedHtmlConfig = {
  mode: "code",
  code: [
    '<div style="font-family:-apple-system,system-ui,sans-serif;padding:20px;background:#f7f9ff;border-radius:12px">',
    '  <div style="font-size:13px;color:#5a6270">Embed HTML (iframe)</div>',
    '  <div style="font-size:17px;font-weight:600;color:#1f2329;margin-top:6px">',
    "    在 iframe 沙箱中运行自定义内容</div>",
    "</div>",
  ].join("\n"),
  url: "https://pingcode.com",
  sanitize: true,
  showBorder: true,
  scrolling: "auto",
  height: 640,
  docTitle: "自定义内容",
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeConfig(value: unknown): EmbedHtmlConfig {
  const source = object(value);
  return {
    mode: source.mode === "url" ? "url" : "code",
    code: typeof source.code === "string" ? source.code : DEFAULT_CONFIG.code,
    url: typeof source.url === "string" ? source.url : DEFAULT_CONFIG.url,
    sanitize: source.sanitize !== false,
    showBorder: source.showBorder !== false,
    scrolling:
      source.scrolling === "yes" || source.scrolling === "no"
        ? source.scrolling
        : "auto",
    height:
      typeof source.height === "number" && Number.isFinite(source.height)
        ? Math.max(
            MIN_EMBED_HEIGHT,
            Math.min(MAX_EMBED_HEIGHT, Math.round(source.height)),
          )
        : DEFAULT_CONFIG.height,
    docTitle:
      typeof source.docTitle === "string"
        ? source.docTitle
        : DEFAULT_CONFIG.docTitle,
  };
}

export function validEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
