export type EmbedSource = "bilibili" | "figma" | "canva" | "codepen";

export interface EmbedConfig {
  source: EmbedSource;
  url: string;
  height: number;
  showBorder: boolean;
  caption: string;
  title: string;
}

export const SOURCES: {
  id: EmbedSource;
  group: string;
  name: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    id: "bilibili",
    group: "视频",
    name: "Bilibili",
    placeholder: "https://www.bilibili.com/video/BV...",
    hint: "粘贴 B 站视频链接，自动转换为外链播放器。",
  },
  {
    id: "figma",
    group: "设计",
    name: "Figma",
    placeholder: "https://www.figma.com/design/...",
    hint: "粘贴设计稿、原型或 FigJam 分享链接；查看者仍需相应权限。",
  },
  {
    id: "canva",
    group: "设计",
    name: "Canva",
    placeholder: "https://www.canva.com/design/.../view",
    hint: "请在 Canva 中发布嵌入内容，粘贴其嵌入链接。普通编辑链接可能无法显示。",
  },
  {
    id: "codepen",
    group: "研发",
    name: "CodePen",
    placeholder: "https://codepen.io/user/pen/abc123",
    hint: "粘贴公开 Pen 链接，自动转换为可交互的嵌入视图。",
  },
];

export const DEFAULT_CONFIG: EmbedConfig = {
  source: "bilibili",
  url: "",
  height: 480,
  showBorder: true,
  caption: "",
  title: "嵌入内容",
};

export function normalizeConfig(value: unknown): EmbedConfig {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = SOURCES.find((item) => item.id === data.source)?.id ?? DEFAULT_CONFIG.source;
  return {
    source,
    url: typeof data.url === "string" ? data.url : DEFAULT_CONFIG.url,
    height: typeof data.height === "number" && Number.isFinite(data.height)
      ? Math.max(200, Math.min(1000, data.height))
      : DEFAULT_CONFIG.height,
    showBorder: data.showBorder !== false,
    caption: typeof data.caption === "string" ? data.caption : "",
    title: typeof data.title === "string" ? data.title : DEFAULT_CONFIG.title,
  };
}

function parsedUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function embedUrl(source: EmbedSource, value: string): string | null {
  const url = parsedUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();

  if (source === "bilibili") {
    if (!hostIs(host, "bilibili.com")) return null;
    const bvid = url.pathname.match(/\/video\/(BV[\w]+)/i)?.[1]
      ?? (host === "player.bilibili.com" ? url.searchParams.get("bvid") : null);
    if (!bvid) return null;
    const player = new URL("https://player.bilibili.com/player.html");
    player.searchParams.set("bvid", bvid);
    return player.href;
  }

  if (source === "figma") {
    if (!hostIs(host, "figma.com")) return null;
    if (url.pathname === "/embed") return url.href;
    if (!/^\/(design|file|proto|board|slides)\//.test(url.pathname)) return null;
    const player = new URL("https://www.figma.com/embed");
    player.searchParams.set("embed_host", "share");
    player.searchParams.set("url", url.href);
    return player.href;
  }

  if (source === "canva") {
    if (!hostIs(host, "canva.com")) return null;
    if (!/^\/design\/[^/]+\/(?:[^/]+\/)?view\/?$/.test(url.pathname)) return null;
    url.searchParams.set("embed", "");
    return url.href;
  }

  if (!hostIs(host, "codepen.io")) return null;
  const match = url.pathname.match(/^\/([^/]+)\/(?:pen|embed)\/([\w-]+)/);
  return match ? `https://codepen.io/${match[1]}/embed/${match[2]}` : null;
}
