import {
  NxBlockContent,
  NxBox,
  useAppContext,
  useConfig,
} from "@pc-nexus/react";
import {
  BACKGROUND_COLORS,
  getImageUrl,
  normalizeBackground,
  type BackgroundConfig,
} from "../config";
import { NxImage } from "./image";

interface BlockContext {
  config?: BackgroundConfig;
  entry?: { mode?: "view" | "edit" };
}

const BODY_ID = "main";
const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function App() {
  const context = useAppContext<BlockContext>();
  const liveConfig = useConfig<BackgroundConfig>();
  const config = normalizeBackground(
    liveConfig ?? context?.extension.data.config,
  );
  if (!context) return null;

  const imageUrl = config.backgroundType === "image" ? getImageUrl(config) : "";
  const colorClass =
    BACKGROUND_COLORS[config.backgroundColor ?? "white"].className;
  const alignClass = ALIGN_CLASS[config.horizontalAlign ?? "center"];

  return (
    <NxImage
      src={imageUrl}
      alt=""
      background
      className={imageUrl ? undefined : colorClass}
      height={config.minHeight}
      fit={config.imageSize === "contain" ? "contain" : "cover"}
      opacity={config.opacity}
      verticalAlign={config.verticalAlign}
    >
      <NxBox className="p-4">
        <NxBlockContent contentId={BODY_ID} className={alignClass} />
      </NxBox>
    </NxImage>
  );
}
