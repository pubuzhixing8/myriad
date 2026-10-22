import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  events,
  hasNexusBridge,
  i18n,
  view,
  type Subscription,
} from "@pc-nexus/bridge";
import {
  AlertCircle,
  ArrowUpRight,
  Code2,
  ExternalLink,
  FileCode2,
  Link2,
} from "lucide-react";
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  validEmbedUrl,
  type EmbedHtmlConfig,
} from "../../../plugins/embed-html/config";
import "./style.css";

type Mode = "view" | "edit";
type Locale = "zh-CN" | "en-US";
type EntryData = { config?: unknown; entry?: { mode?: Mode } };

const LABELS = {
  "zh-CN": {
    embedMethod: "嵌入方式",
    method: "方式",
    htmlCode: "HTML 代码",
    urlMode: "网址 URL",
    code: "代码",
    codeLabel: "HTML / CSS / JS",
    url: "网址",
    urlLabel: "URL",
    urlNote:
      "若目标站点设置了 X-Frame-Options 或 frame-ancestors，浏览器会拒绝嵌入。",
    invalidUrl: "请输入有效的 http 或 https 网址",
    loadUrl: "尝试真实加载",
    urlPlaceholder: "预览暂不主动请求外部网站",
    urlBlocked: "若站点禁止被嵌入，加载后可能显示空白。",
    options: "选项",
    sanitize: "净化 HTML",
    sanitizeHelp: "移除脚本与内联事件，禁止自定义 JS 执行",
    border: "显示边框",
    borderHelp: "显示 1px 描边与轻阴影",
    scrolling: "滚动条",
    auto: "自动",
    always: "始终",
    hidden: "隐藏",
    height: "显示高度（像素）",
    title: "iframe 标题",
    titlePlaceholder: "无障碍标题",
    preview: "实时预览",
    sanitized: "已净化",
    removed: "已移除 {scripts} 段脚本、{events} 个内联事件",
    unsanitized: "未净化 · 允许脚本",
    urlBadge: "URL 模式",
    cancel: "取消",
    save: "保存",
    saving: "保存中…",
  },
  "en-US": {
    embedMethod: "Embed method",
    method: "Method",
    htmlCode: "HTML code",
    urlMode: "Website URL",
    code: "Code",
    codeLabel: "HTML / CSS / JS",
    url: "Website",
    urlLabel: "URL",
    urlNote:
      "Sites with X-Frame-Options or frame-ancestors can refuse embedding.",
    invalidUrl: "Enter a valid http or https URL",
    loadUrl: "Try loading site",
    urlPlaceholder: "Preview does not request external sites automatically",
    urlBlocked: "A site that disallows embedding may appear blank.",
    options: "Options",
    sanitize: "Sanitize HTML",
    sanitizeHelp: "Remove scripts and inline events to disable custom JS",
    border: "Show border",
    borderHelp: "Show a 1px border and soft shadow",
    scrolling: "Scrolling",
    auto: "Auto",
    always: "Always",
    hidden: "Hidden",
    height: "Display height (px)",
    title: "iframe title",
    titlePlaceholder: "Accessible title",
    preview: "Live preview",
    sanitized: "Sanitized",
    removed: "Removed {scripts} scripts and {events} inline events",
    unsanitized: "Unsanitized · scripts enabled",
    urlBadge: "URL mode",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
  },
};

function fallbackLocale(): Locale {
  const preview = new URLSearchParams(window.location.search).get("locale");
  if (!hasNexusBridge() && (preview === "zh-CN" || preview === "en-US")) {
    return preview;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function countMatches(value: string, expression: RegExp): number {
  return value.match(expression)?.length ?? 0;
}

function htmlDocument(
  code: string,
  scrolling: EmbedHtmlConfig["scrolling"],
): string {
  const overflow = scrolling === "no" ? "hidden" : "auto";
  return [
    "<!doctype html>",
    '<meta charset="utf-8">',
    `<style>html,body{margin:0;overflow:${overflow}}</style>`,
    code,
  ].join("\n");
}

function sanitizeHtml(code: string): string {
  const styles: string[] = [];
  const markup = code.replace(
    /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi,
    (_match, css: string) => {
      styles.push(`<style>${css}</style>`);
      return "";
    },
  );
  return `${styles.join("\n")}\n${DOMPurify.sanitize(markup)}`;
}

function EmbeddedContent({
  config,
  locale,
  preview,
  loadUrl,
  onLoadUrl,
}: {
  config: EmbedHtmlConfig;
  locale: Locale;
  preview: boolean;
  loadUrl: boolean;
  onLoadUrl?: () => void;
}) {
  const words = LABELS[locale];
  const sourceUrl = validEmbedUrl(config.url);
  const removedScripts = countMatches(
    config.code,
    /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
  );
  const removedEvents = countMatches(config.code, /\son[a-z]+\s*=/gi);
  const sanitizedCode = useMemo(
    () => (config.sanitize ? sanitizeHtml(config.code) : config.code),
    [config.code, config.sanitize],
  );
  const doc = htmlDocument(sanitizedCode, config.scrolling);
  const title = config.docTitle.trim() || "Embedded HTML";
  const shouldLoadUrl =
    config.mode === "url" && (!preview || loadUrl) && Boolean(sourceUrl);

  return (
    <div className={`html-block ${config.showBorder ? "with-border" : ""}`}>
      <div
        className={`html-shell ${config.mode}-mode`}
        style={{ height: config.height }}
      >
        <span
          className={`mode-badge ${!config.sanitize && config.mode === "code" ? "warning" : ""}`}
        >
          {config.mode === "url"
            ? words.urlBadge
            : config.sanitize
              ? words.sanitized
              : words.unsanitized}
          {config.mode === "code" &&
            config.sanitize &&
            (removedScripts > 0 || removedEvents > 0) && (
              <small>
                {words.removed
                  .replace("{scripts}", String(removedScripts))
                  .replace("{events}", String(removedEvents))}
              </small>
            )}
        </span>
        {config.mode === "code" && (
          <iframe
            key={config.sanitize ? "sanitized" : "unsanitized"}
            title={title}
            srcDoc={doc}
            sandbox={config.sanitize ? "" : "allow-scripts allow-forms"}
            scrolling={config.scrolling}
            referrerPolicy="no-referrer"
          />
        )}
        {config.mode === "url" && shouldLoadUrl && (
          <iframe
            title={title}
            src={sourceUrl ?? undefined}
            sandbox="allow-scripts allow-forms"
            scrolling={config.scrolling}
            referrerPolicy="no-referrer"
          />
        )}
        {config.mode === "url" && !shouldLoadUrl && (
          <div className="url-placeholder">
            <div className="url-placeholder-inner">
              <ExternalLink size={22} />
              <code>{config.url || words.invalidUrl}</code>
              <p>{sourceUrl ? words.urlPlaceholder : words.invalidUrl}</p>
              {sourceUrl && onLoadUrl && (
                <button onClick={onLoadUrl}>{words.loadUrl}</button>
              )}
              <small>{words.urlBlocked}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("edit");
  const [locale, setLocale] = useState<Locale>(fallbackLocale);
  const [config, setConfig] = useState<EmbedHtmlConfig>(() =>
    normalizeConfig(DEFAULT_CONFIG),
  );
  const [loadUrlPreview, setLoadUrlPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const words = LABELS[locale];

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
            (payload) => setConfig(normalizeConfig(payload?.config)),
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

  function update<K extends keyof EmbedHtmlConfig>(
    key: K,
    value: EmbedHtmlConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (saving) return;
    if (config.mode === "url" && !validEmbedUrl(config.url)) {
      setError(words.invalidUrl);
      return;
    }
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

  if (mode === "view") {
    return (
      <EmbeddedContent
        config={config}
        locale={locale}
        preview={false}
        loadUrl
      />
    );
  }

  return (
    <div className="editor-shell">
      <aside className="settings-panel">
        <div className="settings-scroll">
          <section className="settings-section">
            <h2>{words.embedMethod}</h2>
            <label className="field-label">{words.method}</label>
            <div className="segments">
              <button
                className={config.mode === "code" ? "active" : ""}
                onClick={() => update("mode", "code")}
              >
                <Code2 size={17} />
                {words.htmlCode}
              </button>
              <button
                className={config.mode === "url" ? "active" : ""}
                onClick={() => {
                  update("mode", "url");
                  setLoadUrlPreview(false);
                }}
              >
                <Link2 size={17} />
                {words.urlMode}
              </button>
            </div>
          </section>
          {config.mode === "code" ? (
            <section className="settings-section">
              <h2>{words.code}</h2>
              <label className="field-label" htmlFor="html-source">
                {words.codeLabel}
              </label>
              <textarea
                id="html-source"
                className="code-editor"
                spellCheck={false}
                rows={14}
                value={config.code}
                onChange={(event) => update("code", event.target.value)}
              />
            </section>
          ) : (
            <section className="settings-section">
              <h2>{words.url}</h2>
              <label className="field-label" htmlFor="embed-url">
                {words.urlLabel}
              </label>
              <input
                id="embed-url"
                type="url"
                value={config.url}
                placeholder="https://…"
                onChange={(event) => {
                  update("url", event.target.value);
                  setLoadUrlPreview(false);
                }}
              />
              <p className="hint">
                <AlertCircle size={14} />
                {words.urlNote}
              </p>
            </section>
          )}
          <section className="settings-section">
            <h2>{words.options}</h2>
            <label className="check-field">
              <input
                type="checkbox"
                checked={config.sanitize}
                onChange={(event) => update("sanitize", event.target.checked)}
              />
              <span>
                <strong>{words.sanitize}</strong>
                <small>{words.sanitizeHelp}</small>
              </span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={config.showBorder}
                onChange={(event) => update("showBorder", event.target.checked)}
              />
              <span>
                <strong>{words.border}</strong>
                <small>{words.borderHelp}</small>
              </span>
            </label>
            <label className="field-label" htmlFor="scrolling">
              {words.scrolling}
            </label>
            <div className="select-frame">
              <select
                id="scrolling"
                value={config.scrolling}
                onChange={(event) =>
                  update(
                    "scrolling",
                    event.target.value as EmbedHtmlConfig["scrolling"],
                  )
                }
              >
                <option value="auto">{words.auto}</option>
                <option value="yes">{words.always}</option>
                <option value="no">{words.hidden}</option>
              </select>
            </div>
            <label className="field-label" htmlFor="embed-height">
              {words.height}
            </label>
            <input
              id="embed-height"
              type="number"
              min={200}
              max={1000}
              value={config.height}
              onChange={(event) =>
                update(
                  "height",
                  Math.max(200, Math.min(1000, Number(event.target.value) || 200)),
                )
              }
            />
            <label className="field-label" htmlFor="doc-title">
              {words.title}
            </label>
            <input
              id="doc-title"
              value={config.docTitle}
              placeholder={words.titlePlaceholder}
              onChange={(event) => update("docTitle", event.target.value)}
            />
          </section>
        </div>
      </aside>
      <main className="preview-panel">
        <div className="preview-heading">
          <FileCode2 size={16} />
          {words.preview}
        </div>
        <div className="preview-stage">
          <EmbeddedContent
            config={config}
            locale={locale}
            preview
            loadUrl={loadUrlPreview}
            onLoadUrl={() => setLoadUrlPreview(true)}
          />
        </div>
      </main>
      <footer className="editor-footer">
        {error && <span className="editor-error">{error}</span>}
        <button onClick={() => void cancel()}>{words.cancel}</button>
        <button
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? words.saving : words.save}
          <ArrowUpRight size={15} />
        </button>
      </footer>
    </div>
  );
}
