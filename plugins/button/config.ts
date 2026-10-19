export type ButtonShape = "rectangle" | "rounded" | "pill" | "circle" | "slanted";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonShadow = "none" | "soft" | "grounded";

export const ICONFONT_ICONS = [
  ["play", "播放"], ["download", "下载"], ["link", "链接"], ["home", "首页"],
  ["star", "收藏"], ["heart", "喜欢"], ["email", "邮件"], ["file", "文件"],
  ["calendar", "日历"], ["wechat", "微信"], ["sina", "微博"], ["github", "GitHub"],
  ["arrowright", "向右"], ["check", "完成"], ["upload", "上传"], ["setting", "设置"],
] as const;
export type IconfontIcon = (typeof ICONFONT_ICONS)[number][0];
const ICON_URLS = import.meta.glob('./assets/iconfont/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
export function iconfontUrl(id: string): string | undefined {
  if (!ICONFONT_ICONS.some(([key]) => key === id)) return undefined;
  return ICON_URLS[`./assets/iconfont/${id}.svg`];
}

export interface ButtonConfig {
  label: string;
  href: string;
  openNewTab: boolean;
  shape: ButtonShape;
  size: ButtonSize;
  appearance: "fill" | "outline";
  minWidth: number;
  backgroundColor: string;
  textColor: string;
  outlineColor: string;
  hoverBackgroundColor: string;
  hoverTextColor: string;
  shadow: ButtonShadow;
  iconText: string;
  iconUrl: string;
  iconId: string;
  iconColor: string;
}

export const TEMPLATES: { id: string; name: string; group: string; config: ButtonConfig }[] = [
  {
    id: "xiaohongshu", name: "小红书", group: "媒体", config: {
      label: "小红书", href: "https://www.xiaohongshu.com/", openNewTab: true,
      shape: "circle", size: "medium", appearance: "fill", minWidth: 48,
      backgroundColor: "#ff2442", textColor: "#ffffff", outlineColor: "#ff2442",
      hoverBackgroundColor: "#d91535", hoverTextColor: "#ffffff", shadow: "soft", iconText: "小", iconUrl: "", iconId: "", iconColor: "#ffffff",
    },
  },
  {
    id: "bilibili", name: "哔哩哔哩", group: "媒体", config: {
      label: "哔哩哔哩", href: "https://www.bilibili.com/", openNewTab: true,
      shape: "pill", size: "medium", appearance: "fill", minWidth: 144,
      backgroundColor: "#00aeec", textColor: "#ffffff", outlineColor: "#00aeec",
      hoverBackgroundColor: "#0089c4", hoverTextColor: "#ffffff", shadow: "soft", iconText: "", iconUrl: "", iconId: "play", iconColor: "#ffffff",
    },
  },
  {
    id: "primary", name: "蓝色胶囊", group: "通用", config: {
      label: "了解更多", href: "", openNewTab: false,
      shape: "pill", size: "medium", appearance: "fill", minWidth: 150,
      backgroundColor: "#2d7ff9", textColor: "#ffffff", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#1568df", hoverTextColor: "#ffffff", shadow: "none", iconText: "", iconUrl: "", iconId: "", iconColor: "#ffffff",
    },
  },
  {
    id: "outline", name: "蓝色描边", group: "通用", config: {
      label: "了解更多", href: "", openNewTab: false,
      shape: "pill", size: "medium", appearance: "outline", minWidth: 150,
      backgroundColor: "#ffffff", textColor: "#2d7ff9", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#2d7ff9", hoverTextColor: "#ffffff", shadow: "soft", iconText: "", iconUrl: "", iconId: "", iconColor: "#2d7ff9",
    },
  },
  {
    id: "step", name: "斜切步骤", group: "通用", config: {
      label: "Step 1", href: "", openNewTab: false,
      shape: "slanted", size: "medium", appearance: "fill", minWidth: 120,
      backgroundColor: "#2d7ff9", textColor: "#ffffff", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#1568df", hoverTextColor: "#ffffff", shadow: "none", iconText: "", iconUrl: "", iconId: "", iconColor: "#ffffff",
    },
  },
];

export const DEFAULT_BUTTON = TEMPLATES[0].config;

export function safeHref(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

export function safeIconUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch { return undefined; }
}
