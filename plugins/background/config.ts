export type VerticalAlign = "top" | "center" | "bottom";
export type HorizontalAlign = "left" | "center" | "right";
export type ImageSize = "cover" | "contain";
export type BackgroundType = "color" | "image";
export type BackgroundColor =
  | "white"
  | "default"
  | "blue"
  | "green"
  | "cyan"
  | "yellow"
  | "red";

export const BACKGROUND_COLORS: Record<
  BackgroundColor,
  { className: string; preview: string }
> = {
  white: { className: "bg-white", preview: "#ffffff" },
  default: { className: "bg-default", preview: "#f2f4f7" },
  blue: { className: "bg-primary-subtle", preview: "#eaf1ff" },
  green: { className: "bg-success-subtle", preview: "#e7f7ef" },
  cyan: { className: "bg-info-subtle", preview: "#e9f6fa" },
  yellow: { className: "bg-warning-subtle", preview: "#fff5df" },
  red: { className: "bg-danger-subtle", preview: "#fff0f1" },
};

export interface BackgroundConfig {
  backgroundType?: BackgroundType;
  backgroundColor?: BackgroundColor;
  imageId?: string;
  imageUrl?: string;
  imageName?: string;
  imagePage?: string;
  imagePhotographer?: string;
  verticalAlign: VerticalAlign;
  horizontalAlign?: HorizontalAlign;
  opacity?: number;
  minHeight?: number;
  imageSize?: ImageSize;
  imagePosition?: string;
}

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  backgroundType: "color",
  backgroundColor: "white",
  imageId: "none",
  verticalAlign: "center",
  horizontalAlign: "center",
  opacity: 1,
  minHeight: 320,
  imageSize: "cover",
  imagePosition: "center center",
};

export function normalizeBackground(
  value?: Partial<BackgroundConfig>,
): BackgroundConfig {
  const imageId = value?.imageId?.startsWith("pixabay:")
    ? value.imageId
    : "none";
  const backgroundType = value?.backgroundType === "image" ? "image" : "color";
  const backgroundColor =
    value?.backgroundColor && value.backgroundColor in BACKGROUND_COLORS
      ? value.backgroundColor
      : DEFAULT_BACKGROUND.backgroundColor;

  return {
    ...DEFAULT_BACKGROUND,
    ...value,
    imageId,
    backgroundType,
    backgroundColor,
  };
}

export function getImageUrl(config?: Partial<BackgroundConfig>): string {
  if (!config?.imageId?.startsWith("pixabay:")) return "";
  return config.imageUrl || "";
}
