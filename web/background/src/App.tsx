import { useEffect, useRef, useState } from "react";
import { hasNexusBridge, i18n, invoke, view } from "@pc-nexus/bridge";
import {
  BACKGROUND_COLORS,
  getImageUrl,
  normalizeBackground,
  type BackgroundConfig,
  type BackgroundColor,
  type HorizontalAlign,
  type VerticalAlign,
} from "../../../plugins/background/config";
import zh from "../../../locales/zh-CN.json";
import en from "../../../locales/en-US.json";

type Locale = "zh-CN" | "en-US";
type EntryData = { config?: Partial<BackgroundConfig> };
type Orientation = "all" | "landscape" | "portrait";
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
const PAGE_SIZE = 24;
const DEFAULT_PHOTOS = [
  {
    id: "7276585",
    nameZh: "山间湖泊",
    nameEn: "Mountain lake",
    photographer: "ChiemSeherin",
    authorId: 1425977,
    path: "2022/06/21/21/56/konigssee-7276585",
    page: "https://pixabay.com/photos/k%C3%B6nigssee-mountains-7276585/",
  },
  {
    id: "5337646",
    nameZh: "高山湖",
    nameEn: "Alpine lake",
    photographer: "suju-foto",
    authorId: 165106,
    path: "2020/06/24/20/41/truebsee-5337646",
    page: "https://pixabay.com/photos/tr%C3%BCebsee-titlis-switzerland-5337646/",
  },
  {
    id: "5499649",
    nameZh: "海浪",
    nameEn: "Ocean wave",
    photographer: "Kanenori",
    authorId: 4749850,
    path: "2020/08/19/00/13/sea-5499649",
    page: "https://pixabay.com/photos/sea-wave-splash-big-wave-ocean-5499649/",
  },
  {
    id: "1258845",
    nameZh: "雾中森林",
    nameEn: "Misty forest",
    photographer: "cocoparisienne",
    authorId: 127419,
    path: "2016/03/15/18/12/forest-1258845",
    page: "https://pixabay.com/photos/forest-trees-fog-moss-forest-floor-1258845/",
  },
  {
    id: "8214498",
    nameZh: "城市日落",
    nameEn: "City sunset",
    photographer: "soultrain",
    authorId: 7283580,
    path: "2023/08/26/09/11/sunset-8214498",
    page: "https://pixabay.com/photos/sunset-skyscrapers-buildings-city-8214498/",
  },
  {
    id: "8038712",
    nameZh: "花田",
    nameEn: "Flower field",
    photographer: "KIMDAEJEUNG",
    authorId: 7703165,
    path: "2023/06/04/00/34/flowers-8038712",
    page: "https://pixabay.com/photos/flowers-geumgye-guk-field-wind-8038712/",
  },
];

const POSITIONS = [
  "left top",
  "center top",
  "right top",
  "left center",
  "center center",
  "right center",
  "left bottom",
  "center bottom",
  "right bottom",
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
const BACKGROUND_COLOR_OPTIONS = Object.keys(
  BACKGROUND_COLORS,
) as BackgroundColor[];
const COLOR_LABELS: Record<string, string> = {
  red: "红色",
  orange: "橙色",
  yellow: "黄色",
  green: "绿色",
  turquoise: "青色",
  blue: "蓝色",
  violet: "紫色",
  pink: "粉色",
  brown: "棕色",
  black: "黑色",
  gray: "灰色",
  white: "白色",
};

function fallbackLocale(): Locale {
  const previewLocale = new URLSearchParams(window.location.search).get(
    "locale",
  );
  if (
    !hasNexusBridge() &&
    (previewLocale === "zh-CN" || previewLocale === "en-US")
  ) {
    return previewLocale;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(fallbackLocale);
  const [config, setConfig] = useState<BackgroundConfig>(normalizeBackground());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const [orientation, setOrientation] = useState<Orientation>("all");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const requestId = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const words = locale === "zh-CN" ? zh.background : en.background;
  const t = (key: keyof typeof zh.background) => words[key];
  const source = "https://pixabay.com/";
  const imageMode = config.backgroundType === "image";
  const hasImage = imageMode && Boolean(getImageUrl(config));
  const searchUrl = `${source}images/search/${encodeURIComponent(query.trim())}/`;
  const showDefaultPhotos =
    !query.trim() && color === "all" && orientation === "all";
  const visiblePhotos: Photo[] = showDefaultPhotos
    ? DEFAULT_PHOTOS.map((photo) => ({
        id: `pixabay:${photo.id}`,
        name: locale === "zh-CN" ? photo.nameZh : photo.nameEn,
        photographer: photo.photographer,
        authorUrl: `https://pixabay.com/users/${encodeURIComponent(photo.photographer.toLowerCase())}-${photo.authorId}/`,
        avatarUrl: "",
        imageUrl: `https://cdn.pixabay.com/photo/${photo.path}_1280.jpg`,
        thumbnailUrl: `https://cdn.pixabay.com/photo/${photo.path}_640.jpg`,
        pageUrl: photo.page,
      }))
    : photos;

  useEffect(() => {
    const id = ++requestId.current;
    const term = query.trim();
    setPhotos([]);
    setTotal(0);
    setHasMore(false);
    setSearchError("");
    if (!pickerOpen || (!term && color === "all" && orientation === "all")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(
      () => {
        void invoke<
          {
            query: string;
            color: string;
            orientation?: Exclude<Orientation, "all">;
            locale: Locale;
            page: number;
          },
          SearchResult
        >("searchPixabayPhotos", {
          query: term,
          color,
          ...(orientation === "all" ? {} : { orientation }),
          locale,
          page,
        })
          .then((result) => {
            if (id !== requestId.current) return;
            setPhotos(result.photos);
            setTotal(result.total);
            setPage(result.page);
            setHasMore(result.hasMore);
          })
          .catch((reason) => {
            if (id !== requestId.current) return;
            setSearchError(
              String(reason instanceof Error ? reason.message : reason),
            );
          })
          .finally(() => {
            if (id === requestId.current) setLoading(false);
          });
      },
      page === 1 ? 350 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [pickerOpen, query, color, orientation, locale, page, retryNonce]);

  function changePage(nextPage: number) {
    setPage(nextPage);
    resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!hasNexusBridge()) return;
    let active = true;

    void view
      .getContext<EntryData>()
      .then((context) => {
        if (!active) return;
        setConfig(normalizeBackground(context.extension?.data?.config));
        setLocale(
          context.user?.locale ?? context.team?.locale ?? fallbackLocale(),
        );
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
      .catch(() => {
        // The editor remains usable when translation resources are unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof BackgroundConfig>(
    key: K,
    value: BackgroundConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (hasNexusBridge())
        await view.submit({ config, body: [{ id: "main" }] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (hasNexusBridge()) await view.close();
  }

  return (
    <div className="editor-root">
      <aside className="settings-panel">
        <div className="settings-scroll">
          <section className="setting-section">
            <h2>{t("general")}</h2>
            <FieldLabel>{t("alignment")}</FieldLabel>
            <div className="segmented triple">
              {(["left", "center", "right"] as HorizontalAlign[]).map(
                (value) => (
                  <button
                    key={value}
                    className={config.horizontalAlign === value ? "active" : ""}
                    onClick={() => update("horizontalAlign", value)}
                    aria-label={t(value)}
                  >
                    <span className={`align-symbol ${value}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                  </button>
                ),
              )}
            </div>
            <FieldLabel>{t("verticalAlignment")}</FieldLabel>
            <div className="segmented triple">
              {(["top", "center", "bottom"] as VerticalAlign[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={config.verticalAlign === value ? "active" : ""}
                  onClick={() => update("verticalAlign", value)}
                  aria-label={t(value === "center" ? "middle" : value)}
                  aria-pressed={config.verticalAlign === value}
                  title={t(value === "center" ? "middle" : value)}
                >
                  <svg
                    className="vertical-align-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2.5"
                      y="2.5"
                      width="19"
                      height="19"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="5.5"
                      y={
                        value === "top" ? 5.5 : value === "bottom" ? 13.5 : 9.5
                      }
                      width="13"
                      height="5"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <RangeField
              label={t("height")}
              value={config.minHeight ?? 320}
              min={80}
              max={720}
              step={10}
              unit="px"
              onChange={(value) => update("minHeight", value)}
            />
          </section>
          <section className="setting-section image-section">
            <h2>{t("background")}</h2>
            <FieldLabel>{t("backgroundType")}</FieldLabel>
            <div className="select-frame">
              <select
                className="field-select"
                value={config.backgroundType}
                onChange={(event) => {
                  const type = event.target
                    .value as BackgroundConfig["backgroundType"];
                  if (type === "image" && !getImageUrl(config)) {
                    setPickerOpen(true);
                  } else {
                    update("backgroundType", type);
                  }
                }}
              >
                <option value="color">{t("backgroundColor")}</option>
                <option value="image">{t("image")}</option>
              </select>
            </div>
            {!imageMode && (
              <div
                className="background-colors"
                aria-label={t("backgroundColor")}
              >
                {BACKGROUND_COLOR_OPTIONS.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    className={
                      config.backgroundColor === colorOption
                        ? "background-color active"
                        : "background-color"
                    }
                    onClick={() => update("backgroundColor", colorOption)}
                    aria-label={t(colorOption)}
                    aria-pressed={config.backgroundColor === colorOption}
                    title={t(colorOption)}
                  >
                    <span
                      style={{
                        backgroundColor: BACKGROUND_COLORS[colorOption].preview,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {imageMode && (
              <>
                <button
                  className="selected-image"
                  onClick={() => setPickerOpen(true)}
                >
                  {hasImage && <img src={getImageUrl(config)} alt="" />}
                  <span>
                    <strong>{config.imageName || t("chooseImage")}</strong>
                    <small>{t("changeImage")}</small>
                  </span>
                  <span className="chevron">›</span>
                </button>
                {hasImage && (
                  <>
                    <FieldLabel>{t("fit")}</FieldLabel>
                    <div className="select-frame">
                      <select
                        className="field-select"
                        value={config.imageSize}
                        onChange={(event) =>
                          update(
                            "imageSize",
                            event.target.value as BackgroundConfig["imageSize"],
                          )
                        }
                      >
                        <option value="cover">
                          {locale === "zh-CN"
                            ? `${t("cover")} · Cover`
                            : t("cover")}
                        </option>
                        <option value="contain">
                          {locale === "zh-CN"
                            ? `${t("contain")} · Contain`
                            : t("contain")}
                        </option>
                      </select>
                    </div>
                    <RangeField
                      label={t("imageOpacity")}
                      value={Math.round((config.opacity ?? 1) * 100)}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={(value) =>
                        update(
                          "opacity",
                          Math.min(100, Math.max(0, value)) / 100,
                        )
                      }
                    />
                    <FieldLabel>{t("position")}</FieldLabel>
                    <div className="position-grid">
                      {POSITIONS.map((position) => (
                        <button
                          key={position}
                          className={
                            config.imagePosition === position ? "active" : ""
                          }
                          onClick={() => update("imagePosition", position)}
                          aria-label={position}
                        >
                          <span />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </aside>
      <main className="preview-area">
        <div className="preview-meta">
          <span>{t("preview")}</span>
          <span>{config.minHeight ?? 320} px</span>
        </div>
        <div
          className={
            hasImage ? "preview-content" : "preview-content color-mode"
          }
          style={{
            minHeight: config.minHeight,
            textAlign: config.horizontalAlign,
            justifyContent:
              config.verticalAlign === "top"
                ? "flex-start"
                : config.verticalAlign === "bottom"
                  ? "flex-end"
                  : "center",
            backgroundColor: !hasImage
              ? BACKGROUND_COLORS[config.backgroundColor ?? "white"].preview
              : undefined,
          }}
        >
          {hasImage && (
            <div
              className="preview-image"
              style={{
                backgroundImage: `url("${getImageUrl(config)}")`,
                backgroundSize: config.imageSize,
                backgroundPosition: config.imagePosition,
                opacity: config.opacity ?? 1,
              }}
            />
          )}
          <div className="preview-copy">
            <strong>{t("preview")}</strong>
            <p>{t("previewHint")}</p>
          </div>
        </div>
      </main>
      <footer className="actions">
        {error && <span className="error">{error}</span>}
        <button onClick={() => void cancel()}>{t("cancel")}</button>
        <button
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </footer>
      {pickerOpen && (
        <div className="picker-layer">
          <div className="picker-top">
            <button
              className="back-button"
              onClick={() => setPickerOpen(false)}
              aria-label={t("close")}
            >
              ←
            </button>
            <h2>{t("chooseImage")}</h2>
            <a href={source} target="_blank" rel="noreferrer">
              Pixabay ↗
            </a>
          </div>
          <div className="picker-filters">
            <label className="search-box">
              <span aria-hidden="true" className="search-icon" />
              <input
                autoFocus
                placeholder={t("searchHint")}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="filter-select">
              <span>{t("color")}</span>
              <div className="select-frame">
                <select
                  value={color}
                  onChange={(event) => {
                    setColor(event.target.value);
                    setPage(1);
                  }}
                >
                  {COLORS.map((item) => (
                    <option key={item} value={item}>
                      {item === "all"
                        ? t("allColors")
                        : locale === "zh-CN"
                          ? COLOR_LABELS[item]
                          : item}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="filter-select">
              <span>{t("type")}</span>
              <div className="select-frame">
                <select
                  value={orientation}
                  onChange={(event) => {
                    setOrientation(event.target.value as Orientation);
                    setPage(1);
                  }}
                >
                  <option value="all">{t("allTypes")}</option>
                  <option value="landscape">{t("landscape")}</option>
                  <option value="portrait">{t("portrait")}</option>
                </select>
              </div>
            </label>
          </div>
          <div className="picker-results" ref={resultsRef}>
            <div className="results-heading">
              <strong>
                {query.trim() ? t("results") : t("defaultImages")}
              </strong>
              {query.trim() && total > 0 && (
                <span>
                  {total.toLocaleString(locale)} {t("photosCount")}
                </span>
              )}
              {loading && <span>{t("loading")}</span>}
            </div>
            {visiblePhotos.length > 0 && (
              <div className="photo-grid">
                {visiblePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={
                      config.imageId === photo.id
                        ? "photo-card selected"
                        : "photo-card"
                    }
                  >
                    <button
                      type="button"
                      className="photo-select"
                      aria-label={photo.name}
                      onClick={() => {
                        setConfig((current) => ({
                          ...current,
                          backgroundType: "image",
                          imageId: photo.id,
                          imageUrl: photo.imageUrl,
                          imageName: photo.name,
                          imagePage: photo.pageUrl,
                          imagePhotographer: photo.photographer,
                        }));
                        setPickerOpen(false);
                      }}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt=""
                        loading="lazy"
                      />
                    </button>
                    {photo.photographer && (
                      <a
                        className="photo-author"
                        href={photo.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="photo-avatar">
                          {photo.avatarUrl ? (
                            <img src={photo.avatarUrl} alt="" loading="lazy" />
                          ) : (
                            photo.photographer.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="photo-author-name">
                          {photo.photographer}
                        </span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {visiblePhotos.length === 0 && (
              <div className="empty-state">
                <div className="empty-symbol">⌕</div>
                <strong>
                  {loading
                    ? t("loading")
                    : searchError.includes("PIXABAY_API_KEY_NOT_CONFIGURED")
                      ? t("apiKeyMissing")
                      : searchError
                        ? t("searchFailed")
                        : t("empty")}
                </strong>
                {searchError && (
                  <button
                    className="retry-button"
                    onClick={() => setRetryNonce((value) => value + 1)}
                  >
                    {t("retry")}
                  </button>
                )}
                {query.trim() &&
                  searchError &&
                  !searchError.includes("PIXABAY_API_KEY_NOT_CONFIGURED") && (
                    <a href={searchUrl} target="_blank" rel="noreferrer">
                      {t("pixabaySearch")} ↗
                    </a>
                  )}
              </div>
            )}
            {!showDefaultPhotos && (total > PAGE_SIZE || page > 1) && (
              <div className="pagination">
                <button
                  disabled={loading || page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  {t("previous")}
                </button>
                <span>
                  {t("page")} {page} /{" "}
                  {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </span>
                <button
                  disabled={loading || !hasMore}
                  onClick={() => changePage(page + 1)}
                >
                  {t("next")}
                </button>
              </div>
            )}
          </div>
          <div className="picker-footer">
            <a href={source} target="_blank" rel="noreferrer">
              {t("source")} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className="field-label">{children}</label>;
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <FieldLabel>{label}</FieldLabel>
      <div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="number-field">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <span>{unit}</span>
        </div>
      </div>
    </div>
  );
}
