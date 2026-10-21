export type EmbedMode = "code" | "url";
export type Scrolling = "auto" | "yes" | "no";

export interface EmbedHtmlConfig {
  mode: EmbedMode;
  code: string;
  url: string;
  width: number;
  height: number;
  sanitize: boolean;
  showBorder: boolean;
  scrolling: Scrolling;
  docTitle: string;
}

export const PRESETS: { nameZh: string; nameEn: string; code: string }[] = [
  {
    nameZh: "进度卡片",
    nameEn: "Progress card",
    code: [
      '<div style="font-family:-apple-system,system-ui,sans-serif;padding:22px;background:linear-gradient(135deg,#eef4ff,#f8faff);border-radius:12px">',
      '  <div style="font-size:12px;color:#5a6270">本周迭代完成度</div>',
      '  <div style="font-size:30px;font-weight:700;color:#1f2329;margin:4px 0 12px">78%</div>',
      '  <div style="height:8px;background:#dde5f5;border-radius:4px;overflow:hidden">',
      '    <div style="width:78%;height:100%;background:#2b6cf0;border-radius:4px"></div>',
      "  </div>",
      "</div>",
    ].join("\n"),
  },
  {
    nameZh: "交互计数器",
    nameEn: "Interactive counter",
    code: [
      '<div style="font-family:-apple-system,system-ui,sans-serif;padding:18px;text-align:center">',
      '  <div id="n" style="font-size:34px;font-weight:700;color:#1f2329">0</div>',
      "  <button onclick=\"var e=document.getElementById('n');e.textContent=(+e.textContent)+1\"",
      '    style="margin-top:10px;padding:8px 18px;border:0;border-radius:8px;background:#2b6cf0;color:#fff;font-size:13px;cursor:pointer">',
      "    点击 +1</button>",
      "</div>",
    ].join("\n"),
  },
  {
    nameZh: "数据表格",
    nameEn: "Data table",
    code: [
      '<div style="font-family:-apple-system,system-ui,sans-serif;padding:10px">',
      '  <table style="width:100%;border-collapse:collapse;font-size:13px">',
      '    <tr style="background:#f7f8f9;color:#5a6270">',
      '      <th style="text-align:left;padding:8px;font-weight:500">扩展点</th>',
      '      <th style="text-align:left;padding:8px;font-weight:500">状态</th></tr>',
      '    <tr><td style="padding:8px;border-top:1px solid #eef0f3">背景内容</td>',
      '      <td style="padding:8px;border-top:1px solid #eef0f3;color:#12a06a">已接入</td></tr>',
      '    <tr><td style="padding:8px;border-top:1px solid #eef0f3">卡片</td>',
      '      <td style="padding:8px;border-top:1px solid #eef0f3;color:#12a06a">已接入</td></tr>',
      "  </table>",
      "</div>",
    ].join("\n"),
  },
];

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
  width: 100,
  height: 280,
  sanitize: true,
  showBorder: true,
  scrolling: "auto",
  docTitle: "自定义内容",
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, number))
    : fallback;
}

export function normalizeConfig(value: unknown): EmbedHtmlConfig {
  const source = object(value);
  return {
    mode: source.mode === "url" ? "url" : "code",
    code: typeof source.code === "string" ? source.code : DEFAULT_CONFIG.code,
    url: typeof source.url === "string" ? source.url : DEFAULT_CONFIG.url,
    width: numberInRange(source.width, DEFAULT_CONFIG.width, 20, 100),
    height: numberInRange(source.height, DEFAULT_CONFIG.height, 80, 1600),
    sanitize: source.sanitize !== false,
    showBorder: source.showBorder !== false,
    scrolling:
      source.scrolling === "yes" || source.scrolling === "no"
        ? source.scrolling
        : "auto",
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
