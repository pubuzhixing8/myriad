export type ButtonShape = "rectangle" | "rounded" | "pill" | "circle" | "slanted";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonShadow = "none" | "soft" | "grounded";

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
}

export const TEMPLATES: { id: string; name: string; group: string; config: ButtonConfig }[] = [
  {
    id: "xiaohongshu", name: "小红书", group: "媒体", config: {
      label: "小红书", href: "https://www.xiaohongshu.com/", openNewTab: true,
      shape: "circle", size: "medium", appearance: "fill", minWidth: 48,
      backgroundColor: "#ff2442", textColor: "#ffffff", outlineColor: "#ff2442",
      hoverBackgroundColor: "#d91535", hoverTextColor: "#ffffff", shadow: "soft", iconText: "小", iconUrl: "",
    },
  },
  {
    id: "bilibili", name: "哔哩哔哩", group: "媒体", config: {
      label: "哔哩哔哩", href: "https://www.bilibili.com/", openNewTab: true,
      shape: "pill", size: "medium", appearance: "fill", minWidth: 144,
      backgroundColor: "#00aeec", textColor: "#ffffff", outlineColor: "#00aeec",
      hoverBackgroundColor: "#0089c4", hoverTextColor: "#ffffff", shadow: "soft", iconText: "哔", iconUrl: "",
    },
  },
  {
    id: "primary", name: "蓝色胶囊", group: "通用", config: {
      label: "了解更多", href: "", openNewTab: false,
      shape: "pill", size: "medium", appearance: "fill", minWidth: 150,
      backgroundColor: "#2d7ff9", textColor: "#ffffff", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#1568df", hoverTextColor: "#ffffff", shadow: "none", iconText: "", iconUrl: "",
    },
  },
  {
    id: "outline", name: "蓝色描边", group: "通用", config: {
      label: "了解更多", href: "", openNewTab: false,
      shape: "pill", size: "medium", appearance: "outline", minWidth: 150,
      backgroundColor: "#ffffff", textColor: "#2d7ff9", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#2d7ff9", hoverTextColor: "#ffffff", shadow: "soft", iconText: "", iconUrl: "",
    },
  },
  {
    id: "step", name: "斜切步骤", group: "通用", config: {
      label: "Step 1", href: "", openNewTab: false,
      shape: "slanted", size: "medium", appearance: "fill", minWidth: 120,
      backgroundColor: "#2d7ff9", textColor: "#ffffff", outlineColor: "#2d7ff9",
      hoverBackgroundColor: "#1568df", hoverTextColor: "#ffffff", shadow: "none", iconText: "", iconUrl: "",
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
