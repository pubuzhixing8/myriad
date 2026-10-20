export type ButtonShape =
  | "square"
  | "rounded"
  | "pill"
  | "diamond"
  | "tag"
  | "circle";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonLinkType = "url" | "page" | "attachment" | "email";

export const ICONFONT_ICONS = [
  ["play", "播放"],
  ["download", "下载"],
  ["link", "链接"],
  ["home", "首页"],
  ["star", "收藏"],
  ["heart", "喜欢"],
  ["email", "邮件"],
  ["file", "文件"],
  ["calendar", "日历"],
  ["wechat", "微信"],
  ["sina", "微博"],
  ["github", "GitHub"],
  ["arrowright", "向右"],
  ["check", "完成"],
  ["upload", "上传"],
  ["setting", "设置"],
  ["pdf", "PDF"],
  ["word", "Word"],
  ["excel", "Excel"],
  ["ppt", "PowerPoint"],
  ["figma", "Figma"],
  ["gitlab", "GitLab"],
  ["code", "代码"],
  ["terminal", "终端"],
  ["database", "数据库"],
  ["linkedin", "LinkedIn"],
  ["youtube", "YouTube"],
  ["bilibili", "哔哩哔哩"],
] as const;

export type IconfontIcon = (typeof ICONFONT_ICONS)[number][0];
const ICON_SVGS = import.meta.glob("./assets/iconfont/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
export function iconfontSvg(id: string): string | undefined {
  if (!ICONFONT_ICONS.some(([key]) => key === id)) {
    return undefined;
  }
  return ICON_SVGS[`./assets/iconfont/${id}.svg`];
}

export interface ButtonConfig {
  label: string;
  href: string;
  openNewTab: boolean;
  linkType: ButtonLinkType;
  shape: ButtonShape;
  size: ButtonSize;
  appearance: "fill" | "outline" | "ghost";
  showLabel: boolean;
  minWidth: number;
  backgroundColor: string;
  backgroundEnabled: boolean;
  textColor: string;
  textColorEnabled: boolean;
  outlineColor: string;
  outlineEnabled: boolean;
  hoverBackgroundColor: string;
  hoverBackgroundEnabled: boolean;
  hoverTextColor: string;
  hoverTextEnabled: boolean;
  iconId: string;
  iconPosition: "left" | "right";
}

export const DEFAULT_BUTTON: ButtonConfig = {
  label: "开始使用",
  href: "",
  openNewTab: true,
  linkType: "url",
  shape: "rounded",
  size: "medium",
  appearance: "fill",
  showLabel: true,
  minWidth: 110,
  backgroundColor: "#2b6cf0",
  backgroundEnabled: true,
  textColor: "#ffffff",
  textColorEnabled: true,
  outlineColor: "#2b6cf0",
  outlineEnabled: false,
  hoverBackgroundColor: "#1f56c9",
  hoverBackgroundEnabled: true,
  hoverTextColor: "#ffffff",
  hoverTextEnabled: false,
  iconId: "arrowright",
  iconPosition: "left",
};

export const TEMPLATES: {
  id: string;
  name: string;
  group: string;
  config: Partial<ButtonConfig>;
}[] = [
  {
    id: "pdf",
    name: "PDF",
    group: "文档",
    config: { label: "PDF", iconId: "pdf", backgroundColor: "#d93843" },
  },
  {
    id: "word",
    name: "Word",
    group: "文档",
    config: { label: "Word", iconId: "word", backgroundColor: "#185abd" },
  },
  {
    id: "excel",
    name: "Excel",
    group: "文档",
    config: { label: "Excel", iconId: "excel", backgroundColor: "#1d6f42" },
  },
  {
    id: "ppt",
    name: "PowerPoint",
    group: "文档",
    config: { label: "PowerPoint", iconId: "ppt", backgroundColor: "#d24726" },
  },
  {
    id: "figma",
    name: "Figma",
    group: "文档",
    config: { label: "Figma", iconId: "figma", backgroundColor: "#24292f" },
  },
  {
    id: "primary",
    name: "主要按钮",
    group: "常用",
    config: { label: "开始使用", iconId: "arrowright" },
  },
  {
    id: "outline",
    name: "次要按钮",
    group: "常用",
    config: {
      label: "了解更多",
      iconId: "link",
      appearance: "outline",
      backgroundEnabled: false,
      textColorEnabled: false,
    },
  },
  {
    id: "success",
    name: "成功",
    group: "常用",
    config: { label: "已完成", iconId: "check", backgroundColor: "#12a06a" },
  },
  {
    id: "ghost",
    name: "文字按钮",
    group: "常用",
    config: {
      label: "查看详情",
      iconId: "arrowright",
      appearance: "ghost",
      backgroundEnabled: false,
      textColorEnabled: false,
    },
  },
  {
    id: "step",
    name: "步骤",
    group: "常用",
    config: { label: "步骤 1", iconId: "none", shape: "tag" },
  },
];

export function normalizeButton(value?: Partial<ButtonConfig>): ButtonConfig {
  const config = { ...DEFAULT_BUTTON, ...value };
  if (!ICONFONT_ICONS.some(([id]) => id === config.iconId)) {
    config.iconId = "none";
  }
  return config;
}

export function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function darkenColor(value: string): string {
  const color = safeColor(value, "#2b6cf0").slice(1);
  return `#${[0, 2, 4]
    .map((index) => {
      const channel = Number.parseInt(color.slice(index, index + 2), 16);
      return Math.round(channel * 0.84)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

export function safeHref(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function safeButtonHref(config: ButtonConfig): string | undefined {
  if (config.linkType === "email") {
    const address = config.href.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
      ? `mailto:${address}`
      : undefined;
  }
  return safeHref(config.href);
}
