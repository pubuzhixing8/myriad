import {
  NxBlockContent,
  NxBox,
  NxImage,
  useAppContext,
  useConfig,
} from "@pc-nexus/react";
import {
  BACKGROUND_COLORS,
  getImageUrl,
  normalizeBackground,
  type BackgroundConfig,
} from "../config";

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
const VERTICAL_ALIGN_CLASS = {
  top: "justify-content-start",
  center: "justify-content-center",
  bottom: "justify-content-end",
} as const;
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

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
  const backgroundClass = `relative overflow-hidden ${imageUrl ? "" : colorClass}`;
  const contentClass =
    `absolute w-100 h-100 p-4 flex flex-column ${VERTICAL_ALIGN_CLASS[config.verticalAlign]}`;

  return (
    <NxBox role="presentation" className={backgroundClass}>
      <NxBox className={contentClass}>
        <NxBlockContent contentId={BODY_ID} className={alignClass} />
      </NxBox>
      <NxImage
        src={imageUrl || EMPTY_IMAGE}
        alt=""
        width="100%"
        height={config.minHeight}
        opacity={imageUrl ? config.opacity : 0}
        className="w-100"
      />
    </NxBox>
  );
}
