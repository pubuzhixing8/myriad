import { useEffect, useMemo, useState } from "react";
import { view } from "@pc-nexus/bridge";
import { NxBlockContent, NxBox, NxButton, NxInput, NxText, useAppContext, useConfig } from "@pc-nexus/react";
import { BACKGROUNDS, CATEGORIES, getBackground, type BackgroundConfig, type VerticalAlign } from "../config";
import { NxImage } from "./image";

interface BlockContext {
  config?: BackgroundConfig;
  entry?: { mode?: "view" | "edit" };
}

const BODY_ID = "main";

export function App() {
  const context = useAppContext<BlockContext>();
  const liveConfig = useConfig<BackgroundConfig>();
  const config = liveConfig ?? context?.extension.data.config;
  const mode = context?.extension.data.entry?.mode ?? "view";

  if (!context) return null;
  if (mode === "edit") return <BackgroundEditor initialConfig={config} />;

  const photo = getBackground(config);
  return (
    <NxImage src={photo.url} alt="" background height={360} fit="cover" opacity={config?.opacity ?? 1} verticalAlign={config?.verticalAlign ?? "center"}>
      <NxBlockContent contentId={BODY_ID} />
    </NxImage>
  );
}

function BackgroundEditor({ initialConfig }: { initialConfig?: BackgroundConfig }) {
  const [imageId, setImageId] = useState(initialConfig?.imageId ?? BACKGROUNDS[0].id);
  const [verticalAlign, setVerticalAlign] = useState<VerticalAlign>(initialConfig?.verticalAlign ?? "center");
  const [transparencyPercent, setTransparencyPercent] = useState(Math.round((1 - (initialConfig?.opacity ?? 1)) * 100));
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("全部");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setImageId(initialConfig.imageId);
      setVerticalAlign(initialConfig.verticalAlign);
      setTransparencyPercent(Math.round((1 - (initialConfig.opacity ?? 1)) * 100));
    }
  }, [initialConfig?.imageId, initialConfig?.verticalAlign, initialConfig?.opacity]);

  const photos = useMemo(() => BACKGROUNDS.filter((photo) =>
    (category === "全部" || photo.category === category) &&
    photo.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ), [category, query]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await view.submit({
        config: { imageId, verticalAlign, opacity: 1 - Math.min(100, Math.max(0, transparencyPercent)) / 100 } satisfies BackgroundConfig,
        body: [{ id: BODY_ID }],
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <NxBox className="p-4">
      <NxText as="p" weight="semibold" className="mb-2">选择背景图</NxText>
      <NxInput placeholder="按名称筛选" value={query} onValueChange={setQuery} />
      <NxBox className="flex flex-row flex-wrap mt-3 mb-3">
        {CATEGORIES.map((item) => (
          <NxButton key={item} className="mr-2 mb-2" appearance={category === item ? "fill" : "outline"} color={category === item ? "primary" : "default"} onClick={() => setCategory(item)}>
            {item}
          </NxButton>
        ))}
      </NxBox>
      {photos.length === 0 && <NxText as="p">没有匹配的背景图</NxText>}
      {photos.map((photo) => (
        <NxBox key={photo.id} className="mb-3 p-2 border">
          <NxImage src={photo.url} alt={photo.name} background height={120} fit="cover" opacity={imageId === photo.id ? 1 - transparencyPercent / 100 : 1} />
          <NxBox className="flex flex-row justify-content-between align-items-center mt-2">
            <NxText>{photo.name} · {photo.category}</NxText>
            <NxButton color={imageId === photo.id ? "primary" : "default"} appearance={imageId === photo.id ? "fill" : "outline"} onClick={() => setImageId(photo.id)}>
              {imageId === photo.id ? "已选择" : "选择"}
            </NxButton>
          </NxBox>
        </NxBox>
      ))}
      <NxText as="p" weight="semibold" className="mt-4 mb-2">正文垂直位置</NxText>
      <NxBox className="flex flex-row mb-4">
        {([
          ["top", "居上"],
          ["center", "居中"],
          ["bottom", "距下"],
        ] as const).map(([value, label]) => (
          <NxButton key={value} className="mr-2" appearance={verticalAlign === value ? "fill" : "outline"} color={verticalAlign === value ? "primary" : "default"} onClick={() => setVerticalAlign(value)}>{label}</NxButton>
        ))}
      </NxBox>
      <NxText as="p" weight="semibold" className="mt-4 mb-2">背景图透明度（{transparencyPercent}%）</NxText>
      <NxInput type="range" min={0} max={100} step={1} value={String(transparencyPercent)} onValueChange={(value) => setTransparencyPercent(Number(value))} />
      <NxButton color="primary" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "保存"}</NxButton>
    </NxBox>
  );
}
