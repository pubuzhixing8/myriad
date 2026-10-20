import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  events,
  hasNexusBridge,
  i18n,
  invoke,
  view,
  type Subscription,
} from "@pc-nexus/bridge";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  FileText,
  Link,
  LockKeyhole,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  Zap,
} from "lucide-react";
import {
  createCard,
  normalizeConfig,
  type CardIcon,
  type CardImage,
  type CardItem,
  type CardsConfig,
} from "../../../plugins/custom-cards/config";
import "./style.css";

type Locale = "zh-CN" | "en-US";
type Mode = "view" | "edit";
type Photo = {
  id: string;
  name: string;
  photographer: string;
  authorUrl: string;
  avatarUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  pageUrl: string;
};
type SearchResult = {
  photos: Photo[];
  total: number;
  page: number;
  hasMore: boolean;
};
type EntryData = { config?: unknown; entry?: { mode?: Mode } };
const DEFAULT_PHOTOS = [
  {
    id: "7276585",
    path: "2022/06/21/21/56/konigssee-7276585",
    name: "Mountain lake",
    author: "ChiemSeherin",
    user: 1425977,
  },
  {
    id: "5337646",
    path: "2020/06/24/20/41/truebsee-5337646",
    name: "Alpine lake",
    author: "suju-foto",
    user: 165106,
  },
  {
    id: "5499649",
    path: "2020/08/19/00/13/sea-5499649",
    name: "Ocean wave",
    author: "Kanenori",
    user: 4749850,
  },
  {
    id: "1258845",
    path: "2016/03/15/18/12/forest-1258845",
    name: "Misty forest",
    author: "cocoparisienne",
    user: 127419,
  },
  {
    id: "8214498",
    path: "2023/08/26/09/11/sunset-8214498",
    name: "City sunset",
    author: "soultrain",
    user: 7283580,
  },
  {
    id: "8038712",
    path: "2023/06/04/00/34/flowers-8038712",
    name: "Flower field",
    author: "KIMDAEJEUNG",
    user: 7703165,
  },
];
const COLORS = [
  "all",
  "red",
  "orange",
  "yellow",
  "green",
  "turquoise",
  "blue",
  "violet",
  "pink",
  "brown",
  "black",
  "gray",
  "white",
];
const ICONS: Record<CardIcon, typeof FileText | null> = {
  none: null,
  file: FileText,
  link: Link,
  star: Star,
  bolt: Zap,
  user: UserRound,
  lock: LockKeyhole,
  chart: BarChart3,
  check: Check,
};
const LABELS = {
  "zh-CN": {
    general: "常规",
    content: "内容",
    align: "对齐方式",
    type: "卡片类型",
    text: "纯文本",
    icon: "图标 + 文本",
    image: "图片 + 文本",
    columns: "列数",
    effect: "悬浮效果",
    classic: "无",
    hover: "悬浮抬升",
    flip: "翻转",
    accent: "主色",
    imageSettings: "图片",
    imageHeight: "图片高度",
    fit: "适应方式",
    cover: "覆盖",
    contain: "完整显示",
    appearance: "尺寸与外观",
    gap: "卡片间距",
    padding: "内边距",
    radius: "圆角",
    border: "描边",
    shadow: "阴影",
    cards: "卡片",
    addCard: "添加卡片",
    title: "标题",
    description: "正文",
    chooseIcon: "图标",
    chooseImage: "选择图片",
    changeImage: "更换图片",
    removeImage: "移除图片",
    linkType: "链接类型",
    noLink: "无",
    external: "外部链接",
    wiki: "Wiki 页面",
    attachment: "附件",
    link: "链接地址",
    linkText: "链接文案",
    preview: "预览",
    cancel: "取消",
    save: "保存",
    saving: "保存中…",
    search: "搜索 Pixabay 图片",
    color: "颜色",
    allColors: "全部颜色",
    orientation: "类型",
    allTypes: "全部类型",
    landscape: "横向",
    portrait: "纵向",
    defaults: "默认图片",
    results: "搜索结果",
    loading: "加载中…",
    noResults: "没有找到图片",
    retry: "重试",
    previous: "上一页",
    next: "下一页",
    source: "图片来自 Pixabay",
    keyMissing: "Pixabay API Key 未配置",
    searchFailed: "搜索失败，请稍后重试",
    imageRequired: "选择图片后将在卡片顶部显示",
  },
  "en-US": {
    general: "General",
    content: "Content",
    align: "Alignment",
    type: "Card type",
    text: "Text",
    icon: "Icon + text",
    image: "Image + text",
    columns: "Columns",
    effect: "Hover effect",
    classic: "None",
    hover: "Elevate",
    flip: "Flip",
    accent: "Accent color",
    imageSettings: "Image",
    imageHeight: "Image height",
    fit: "Fit",
    cover: "Cover",
    contain: "Contain",
    appearance: "Size and appearance",
    gap: "Gap",
    padding: "Padding",
    radius: "Radius",
    border: "Border",
    shadow: "Shadow",
    cards: "Cards",
    addCard: "Add card",
    title: "Title",
    description: "Description",
    chooseIcon: "Icon",
    chooseImage: "Choose image",
    changeImage: "Change image",
    removeImage: "Remove image",
    linkType: "Link type",
    noLink: "None",
    external: "External URL",
    wiki: "Wiki page",
    attachment: "Attachment",
    link: "Link URL",
    linkText: "Link text",
    preview: "Preview",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    search: "Search Pixabay images",
    color: "Color",
    allColors: "All colors",
    orientation: "Type",
    allTypes: "All types",
    landscape: "Landscape",
    portrait: "Portrait",
    defaults: "Default images",
    results: "Search results",
    loading: "Loading…",
    noResults: "No images found",
    retry: "Retry",
    previous: "Previous",
    next: "Next",
    source: "Images from Pixabay",
    keyMissing: "Pixabay API key is not configured",
    searchFailed: "Search failed. Please retry.",
    imageRequired: "Choose an image to show it on this card",
  },
};

function fallbackLocale(): Locale {
  const preview = new URLSearchParams(window.location.search).get("locale");
  if (!hasNexusBridge() && (preview === "zh-CN" || preview === "en-US"))
    return preview;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function validLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function Card({
  card,
  config,
  interactive,
}: {
  card: CardItem;
  config: CardsConfig;
  interactive: boolean;
}) {
  const Icon = ICONS[card.icon];
  const href = card.linkType !== "none" ? validLink(card.link) : null;
  const style = {
    borderRadius: config.radius,
    border: config.border ? "1px solid #e6e9f0" : "1px solid transparent",
    boxShadow: config.shadow ? "0 1px 3px rgba(25, 34, 51, .07)" : "none",
    textAlign: config.align,
    "--accent": config.accent,
  } as CSSProperties;
  const content = (
    <>
      {config.cardType === "image" && card.image && (
        <div
          className="card-image"
          style={{
            height: config.imageHeight,
            backgroundImage: `url("${card.image.url}")`,
            backgroundSize: config.imageFit,
          }}
        />
      )}
      <div
        className="card-body"
        style={{
          padding: config.padding,
          alignItems:
            config.align === "left"
              ? "flex-start"
              : config.align === "right"
                ? "flex-end"
                : "center",
        }}
      >
        {config.cardType === "icon" && Icon && (
          <span className="card-icon">
            <Icon size={20} />
          </span>
        )}
        <strong>{card.title || " "}</strong>
        {card.text && <p>{card.text}</p>}
        {card.linkType !== "none" && card.linkText && (
          <span className="card-link">
            {card.linkText}
            {card.linkType === "url" && <ArrowUpRight size={13} />}
          </span>
        )}
      </div>
    </>
  );
  return (
    <div className={`card-card effect-${config.style}`} style={style}>
      {config.style === "flip" ? (
        <div className="card-flip-inner">
          <div className="card-face card-front">{content}</div>
          <div className="card-face card-back">
            <strong>{card.title}</strong>
            <p>{card.text}</p>
            {card.linkText && href && (
              <span className="card-link">{card.linkText}</span>
            )}
          </div>
        </div>
      ) : (
        content
      )}
      {interactive && href && (
        <a
          className="card-hit-area"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={card.title || card.linkText}
        />
      )}
    </div>
  );
}

function CardGrid({
  config,
  interactive,
}: {
  config: CardsConfig;
  interactive: boolean;
}) {
  return (
    <div
      className="cards-grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(config.columns, config.cards.length)}, minmax(0, 1fr))`,
        gap: config.gap,
      }}
    >
      {config.cards.map((card) => (
        <Card
          key={card.id}
          card={card}
          config={config}
          interactive={interactive}
        />
      ))}
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(Math.max(min, Math.min(max, Number(event.target.value))))
          }
        />
        <small>px</small>
      </div>
    </label>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("edit");
  const [locale, setLocale] = useState<Locale>(fallbackLocale);
  const [config, setConfig] = useState<CardsConfig>(() =>
    normalizeConfig(null),
  );
  const [tab, setTab] = useState<"general" | "content">("general");
  const [activeCard, setActiveCard] = useState(0);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const [orientation, setOrientation] = useState("all");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const words = LABELS[locale];
  const t = (key: keyof (typeof LABELS)["zh-CN"]) => words[key];
  const selectedCard = config.cards[activeCard] ?? config.cards[0];
  const showDefaults =
    !query.trim() && color === "all" && orientation === "all";
  const visiblePhotos: Photo[] = showDefaults
    ? DEFAULT_PHOTOS.map((photo) => ({
        id: `pixabay:${photo.id}`,
        name: photo.name,
        photographer: photo.author,
        authorUrl: `https://pixabay.com/users/${photo.author.toLowerCase()}-${photo.user}/`,
        avatarUrl: "",
        imageUrl: `https://cdn.pixabay.com/photo/${photo.path}_1280.jpg`,
        thumbnailUrl: `https://cdn.pixabay.com/photo/${photo.path}_640.jpg`,
        pageUrl: `https://pixabay.com/photos/${photo.id}/`,
      }))
    : photos;

  useEffect(() => {
    if (!hasNexusBridge()) {
      setMode(
        new URLSearchParams(window.location.search).get("mode") === "view"
          ? "view"
          : "edit",
      );
      return;
    }
    let active = true;
    let subscription: Subscription | undefined;
    void view
      .getContext<EntryData>()
      .then(async (context) => {
        if (!active) return;
        const nextMode = context.extension?.data?.entry?.mode ?? "view";
        setMode(nextMode);
        setConfig(normalizeConfig(context.extension?.data?.config));
        setLocale(
          context.user?.locale ?? context.team?.locale ?? fallbackLocale(),
        );
        if (nextMode === "view") {
          subscription = await events.on<{ config?: unknown }>(
            "NEXUS_EXTENSION_DATA_CONFIG_CHANGED",
            (payload) => {
              setConfig(normalizeConfig(payload?.config));
            },
          );
          requestAnimationFrame(
            () => void view.emitReadyEvent().catch(() => undefined),
          );
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    void i18n
      .getTranslations()
      .then((translation) => {
        if (active) setLocale(translation.locale);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    setPhotos([]);
    setTotal(0);
    setHasMore(false);
    setPhotoError("");
    if (!picker || showDefaults) {
      setLoadingPhotos(false);
      return;
    }
    setLoadingPhotos(true);
    const timer = window.setTimeout(
      () => {
        void invoke<
          {
            query: string;
            color: string;
            orientation?: string;
            locale: Locale;
            page: number;
          },
          SearchResult
        >("searchPixabayPhotos", {
          query: query.trim(),
          color,
          ...(orientation === "all" ? {} : { orientation }),
          locale,
          page,
        })
          .then((result) => {
            if (id !== requestId.current) return;
            setPhotos(result.photos);
            setTotal(result.total);
            setHasMore(result.hasMore);
          })
          .catch((reason) => {
            if (id === requestId.current)
              setPhotoError(
                String(reason instanceof Error ? reason.message : reason),
              );
          })
          .finally(() => {
            if (id === requestId.current) setLoadingPhotos(false);
          });
      },
      page === 1 ? 350 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [picker, query, color, orientation, locale, page, retry, showDefaults]);

  function update<K extends keyof CardsConfig>(key: K, value: CardsConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function updateCard<K extends keyof CardItem>(key: K, value: CardItem[K]) {
    setConfig((current) => ({
      ...current,
      cards: current.cards.map((card, index) =>
        index === activeCard ? { ...card, [key]: value } : card,
      ),
    }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (hasNexusBridge()) await view.submit({ config });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (hasNexusBridge()) await view.close();
  }

  if (mode === "view")
    return (
      <main className="cards-view">
        <CardGrid config={config} interactive />
      </main>
    );

  if (picker)
    return (
      <div className="picker-shell">
        <header className="picker-heading">
          <button
            className="icon-button"
            onClick={() => setPicker(false)}
            aria-label={t("cancel")}
          >
            <ArrowLeft size={18} />
          </button>
          <strong>{t("chooseImage")}</strong>
          <a
            href="https://pixabay.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pixabay <ArrowUpRight size={14} />
          </a>
        </header>
        <div className="picker-filters">
          <label className="picker-search">
            <Search size={17} />
            <input
              autoFocus
              placeholder={t("search")}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span>{t("color")}</span>
            <select
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setPage(1);
              }}
            >
              {COLORS.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? t("allColors") : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("orientation")}</span>
            <select
              value={orientation}
              onChange={(event) => {
                setOrientation(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="landscape">{t("landscape")}</option>
              <option value="portrait">{t("portrait")}</option>
            </select>
          </label>
        </div>
        <div className="picker-scroll">
          <div className="picker-meta">
            <strong>{showDefaults ? t("defaults") : t("results")}</strong>
            {!showDefaults && total > 0 && (
              <span>{total.toLocaleString(locale)}</span>
            )}
            {loadingPhotos && <span>{t("loading")}</span>}
          </div>
          {visiblePhotos.length > 0 && (
            <div className="picker-grid">
              {visiblePhotos.map((photo) => (
                <div className="picker-photo" key={photo.id}>
                  <button
                    onClick={() => {
                      const image: CardImage = {
                        id: photo.id,
                        url: photo.imageUrl,
                        thumbnailUrl: photo.thumbnailUrl,
                        name: photo.name,
                        photographer: photo.photographer,
                        pageUrl: photo.pageUrl,
                      };
                      updateCard("image", image);
                      setPicker(false);
                    }}
                    aria-label={photo.name}
                  >
                    <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                  </button>
                  {photo.photographer && (
                    <a
                      className="picker-author"
                      href={photo.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>
                        {photo.avatarUrl ? (
                          <img src={photo.avatarUrl} alt="" />
                        ) : (
                          photo.photographer.charAt(0).toUpperCase()
                        )}
                      </span>
                      {photo.photographer}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          {visiblePhotos.length === 0 && !loadingPhotos && (
            <div className="picker-empty">
              <strong>
                {photoError.includes("PIXABAY_API_KEY_NOT_CONFIGURED")
                  ? t("keyMissing")
                  : photoError
                    ? t("searchFailed")
                    : t("noResults")}
              </strong>
              {photoError && (
                <button onClick={() => setRetry((value) => value + 1)}>
                  {t("retry")}
                </button>
              )}
            </div>
          )}
          {!showDefaults && (total > 24 || page > 1) && (
            <div className="picker-pages">
              <button
                disabled={page <= 1 || loadingPhotos}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(total / 24))}
              </span>
              <button
                disabled={!hasMore || loadingPhotos}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>
        <footer className="picker-source">
          <a
            href="https://pixabay.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("source")} ↗
          </a>
        </footer>
      </div>
    );

  return (
    <div className="editor-shell">
      <aside className="settings-panel">
        <div className="tabs">
          <button
            className={tab === "general" ? "active" : ""}
            onClick={() => setTab("general")}
          >
            {t("general")}
          </button>
          <button
            className={tab === "content" ? "active" : ""}
            onClick={() => setTab("content")}
          >
            {t("content")}
          </button>
        </div>
        <div className="settings-scroll">
          {tab === "general" ? (
            <>
              <section className="settings-section">
                <h2>{t("general")}</h2>
                <label className="field-label">{t("align")}</label>
                <div className="segments">
                  {(["left", "center", "right"] as const).map((value) => {
                    const Icon =
                      value === "left"
                        ? AlignLeft
                        : value === "center"
                          ? AlignCenter
                          : AlignRight;
                    return (
                      <button
                        key={value}
                        className={config.align === value ? "active" : ""}
                        onClick={() => update("align", value)}
                        aria-label={value}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
                <label className="field-label">{t("type")}</label>
                <div className="segments">
                  {(["text", "icon", "image"] as const).map((value) => (
                    <button
                      key={value}
                      className={config.cardType === value ? "active" : ""}
                      onClick={() => update("cardType", value)}
                    >
                      {t(value)}
                    </button>
                  ))}
                </div>
                <label className="field-label">{t("columns")}</label>
                <div className="segments five">
                  {([1, 2, 3, 4, 6] as const).map((value) => (
                    <button
                      key={value}
                      className={config.columns === value ? "active" : ""}
                      onClick={() => update("columns", value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <label className="field-label">{t("effect")}</label>
                <select
                  value={config.style}
                  onChange={(event) =>
                    update("style", event.target.value as CardsConfig["style"])
                  }
                >
                  <option value="classic">{t("classic")}</option>
                  <option value="hover">{t("hover")}</option>
                  <option value="flip">{t("flip")}</option>
                </select>
                <label className="field-label">{t("accent")}</label>
                <div className="color-field">
                  <input
                    type="color"
                    value={config.accent}
                    onChange={(event) => update("accent", event.target.value)}
                  />
                  <input
                    value={config.accent}
                    onChange={(event) =>
                      update(
                        "accent",
                        event.target.value as CardsConfig["accent"],
                      )
                    }
                  />
                </div>
              </section>
              {config.cardType === "image" && (
                <section className="settings-section">
                  <h2>{t("imageSettings")}</h2>
                  <Range
                    label={t("imageHeight")}
                    value={config.imageHeight}
                    min={60}
                    max={260}
                    onChange={(value) => update("imageHeight", value)}
                  />
                  <label className="field-label">{t("fit")}</label>
                  <div className="segments">
                    <button
                      className={config.imageFit === "cover" ? "active" : ""}
                      onClick={() => update("imageFit", "cover")}
                    >
                      {t("cover")}
                    </button>
                    <button
                      className={config.imageFit === "contain" ? "active" : ""}
                      onClick={() => update("imageFit", "contain")}
                    >
                      {t("contain")}
                    </button>
                  </div>
                </section>
              )}
              <section className="settings-section">
                <h2>{t("appearance")}</h2>
                <Range
                  label={t("gap")}
                  value={config.gap}
                  min={0}
                  max={40}
                  onChange={(value) => update("gap", value)}
                />
                <Range
                  label={t("padding")}
                  value={config.padding}
                  min={8}
                  max={48}
                  onChange={(value) => update("padding", value)}
                />
                <Range
                  label={t("radius")}
                  value={config.radius}
                  min={0}
                  max={24}
                  onChange={(value) => update("radius", value)}
                />
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.border}
                    onChange={(event) => update("border", event.target.checked)}
                  />
                  {t("border")}
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.shadow}
                    onChange={(event) => update("shadow", event.target.checked)}
                  />
                  {t("shadow")}
                </label>
              </section>
            </>
          ) : (
            <>
              <section className="settings-section">
                <div className="section-head">
                  <h2>
                    {t("cards")} · {config.cards.length}/6
                  </h2>
                  <button
                    disabled={config.cards.length >= 6}
                    onClick={() => {
                      setConfig((current) => ({
                        ...current,
                        cards: [
                          ...current.cards,
                          createCard(current.cards.length + 1),
                        ],
                      }));
                      setActiveCard(config.cards.length);
                    }}
                  >
                    <Plus size={15} />
                    {t("addCard")}
                  </button>
                </div>
                <div className="card-tabs">
                  {config.cards.map((card, index) => (
                    <button
                      key={card.id}
                      className={index === activeCard ? "active" : ""}
                      onClick={() => setActiveCard(index)}
                    >
                      {index + 1}. {card.title || t("cards")}
                    </button>
                  ))}
                </div>
              </section>
              {selectedCard && (
                <section className="settings-section card-fields">
                  <div className="section-head">
                    <h2>
                      {t("cards")} {activeCard + 1}
                    </h2>
                    <button
                      className="danger"
                      disabled={config.cards.length <= 1}
                      onClick={() => {
                        setConfig((current) => ({
                          ...current,
                          cards: current.cards.filter(
                            (_, index) => index !== activeCard,
                          ),
                        }));
                        setActiveCard(Math.max(0, activeCard - 1));
                      }}
                      aria-label="Remove card"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="field-label">{t("title")}</label>
                  <input
                    value={selectedCard.title}
                    onChange={(event) =>
                      updateCard("title", event.target.value)
                    }
                  />
                  <label className="field-label">{t("description")}</label>
                  <textarea
                    rows={4}
                    value={selectedCard.text}
                    onChange={(event) => updateCard("text", event.target.value)}
                  />
                  {config.cardType === "icon" && (
                    <>
                      <label className="field-label">{t("chooseIcon")}</label>
                      <div className="icon-grid">
                        {(Object.keys(ICONS) as CardIcon[]).map((key) => {
                          const Icon = ICONS[key];
                          return (
                            <button
                              key={key}
                              className={
                                selectedCard.icon === key ? "active" : ""
                              }
                              onClick={() => updateCard("icon", key)}
                              title={key}
                            >
                              {Icon ? <Icon size={19} /> : "—"}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {config.cardType === "image" && (
                    <>
                      <label className="field-label">
                        {t("imageSettings")}
                      </label>
                      <button
                        className="image-choice"
                        onClick={() => setPicker(true)}
                      >
                        {selectedCard.image ? (
                          <img src={selectedCard.image.thumbnailUrl} alt="" />
                        ) : (
                          <span className="image-placeholder">
                            <Plus size={20} />
                          </span>
                        )}
                        <span>
                          {selectedCard.image
                            ? selectedCard.image.name || t("changeImage")
                            : t("chooseImage")}
                        </span>
                      </button>
                      {selectedCard.image && (
                        <button
                          className="text-button"
                          onClick={() => updateCard("image", null)}
                        >
                          {t("removeImage")}
                        </button>
                      )}{" "}
                      {!selectedCard.image && (
                        <small>{t("imageRequired")}</small>
                      )}
                    </>
                  )}
                  <label className="field-label">{t("linkType")}</label>
                  <select
                    value={selectedCard.linkType}
                    onChange={(event) =>
                      updateCard(
                        "linkType",
                        event.target.value as CardItem["linkType"],
                      )
                    }
                  >
                    <option value="none">{t("noLink")}</option>
                    <option value="url">{t("external")}</option>
                    <option value="page">{t("wiki")}</option>
                    <option value="attachment">{t("attachment")}</option>
                  </select>
                  {selectedCard.linkType !== "none" && (
                    <>
                      <label className="field-label">{t("link")}</label>
                      <input
                        type="url"
                        value={selectedCard.link}
                        placeholder="https://…"
                        onChange={(event) =>
                          updateCard("link", event.target.value)
                        }
                      />
                      <label className="field-label">{t("linkText")}</label>
                      <input
                        value={selectedCard.linkText}
                        onChange={(event) =>
                          updateCard("linkText", event.target.value)
                        }
                      />
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </aside>
      <main className="preview-panel">
        <div className="preview-heading">{t("preview")}</div>
        <div className="preview-canvas">
          <CardGrid config={config} interactive={false} />
        </div>
      </main>
      <footer className="editor-footer">
        {error && <span className="editor-error">{error}</span>}
        <button onClick={() => void cancel()}>{t("cancel")}</button>
        <button
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </footer>
    </div>
  );
}
