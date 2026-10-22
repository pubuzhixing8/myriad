import { useEffect, useState } from "react";
import { events, hasNexusBridge, i18n, router, view, type Subscription } from "@pc-nexus/bridge";
import { ExternalLink, Link2 } from "lucide-react";
import {
  DEFAULT_CONFIG,
  SOURCES,
  embedUrl,
  normalizeConfig,
  type EmbedConfig,
  type EmbedSource,
} from "../../../plugins/embed/config";
import "./style.css";

type Mode = "view" | "edit";
type EntryData = { config?: unknown; entry?: { mode?: Mode } };

function EmbedFrame({ config, preview, load }: { config: EmbedConfig; preview: boolean; load: boolean }) {
  const source = SOURCES.find((item) => item.id === config.source) ?? SOURCES[0];
  const src = embedUrl(config.source, config.url);
  const frameTitle = config.title.trim() || `${source.name} 嵌入`;
  return (
    <figure className="embed-figure">
      <div className={`embed-frame ${config.showBorder ? "with-border" : ""}`} style={{ height: config.height }}>
        <div className="embed-topbar">
          <strong>{source.name}</strong>
          <span>iframe</span>
          {src && (
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (!hasNexusBridge()) return;
                event.preventDefault();
                void router.open(config.url);
              }}
            >
              打开原链接 <ExternalLink size={13} />
            </a>
          )}
        </div>
        {src && (!preview || load) ? (
          <iframe
            title={frameTitle}
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="embed-placeholder">
            <Link2 size={28} />
            <strong>{src ? `准备加载 ${source.name}` : "填写有效的来源链接"}</strong>
            <p>{src ? "点击下方按钮加载真实内容，保存后将在 Wiki 中自动显示。" : source.hint}</p>
            {src && <code>{src}</code>}
          </div>
        )}
      </div>
      {config.caption && <figcaption>{config.caption}</figcaption>}
    </figure>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("edit");
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_CONFIG);
  const [loadPreview, setLoadPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasNexusBridge()) {
      setMode(new URLSearchParams(location.search).get("mode") === "view" ? "view" : "edit");
      return;
    }
    let active = true;
    let subscription: Subscription | undefined;
    void view.getContext<EntryData>().then(async (context) => {
      if (!active) return;
      const nextMode = context.extension?.data?.entry?.mode ?? "view";
      setMode(nextMode);
      setConfig(normalizeConfig(context.extension?.data?.config));
      if (nextMode === "view") {
        subscription = await events.on<{ config?: unknown }>(
          "NEXUS_EXTENSION_DATA_CONFIG_CHANGED",
          (payload) => setConfig(normalizeConfig(payload?.config)),
        );
        requestAnimationFrame(() => void view.emitReadyEvent().catch(() => undefined));
      }
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    });
    void i18n.getTranslations().catch(() => undefined);
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  function update<K extends keyof EmbedConfig>(key: K, value: EmbedConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!embedUrl(config.source, config.url)) {
      setError("请输入所选来源的有效链接或嵌入地址");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (hasNexusBridge()) await view.submit({ config });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  if (mode === "view") return <EmbedFrame config={config} preview={false} load />;

  const currentSource = SOURCES.find((item) => item.id === config.source) ?? SOURCES[0];
  return (
    <div className="embed-editor">
      <aside className="embed-settings">
        <header><h1>Myriad - Embed</h1><p>将外部内容嵌入 Wiki 页面</p></header>
        <div className="embed-scroll">
          <h2>来源</h2>
          {Array.from(new Set(SOURCES.map((item) => item.group))).map((group) => (
            <section key={group}>
              <h3>{group}</h3>
              {SOURCES.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  className={`source-item ${config.source === item.id ? "active" : ""}`}
                  onClick={() => {
                    update("source", item.id as EmbedSource);
                    setLoadPreview(false);
                    setError("");
                  }}
                >
                  <span>{item.name}</span><span>›</span>
                </button>
              ))}
            </section>
          ))}
          <h2>配置</h2>
          <label htmlFor="embed-url">{currentSource.name} 链接</label>
          <input
            id="embed-url"
            type="url"
            value={config.url}
            placeholder={currentSource.placeholder}
            onChange={(event) => {
              update("url", event.target.value);
              setLoadPreview(false);
            }}
          />
          <p className="field-hint">{currentSource.hint}</p>
          <label htmlFor="embed-height">显示高度（像素）</label>
          <input
            id="embed-height"
            type="number"
            min={200}
            max={1000}
            value={config.height}
            onChange={(event) => update("height", Math.max(200, Math.min(1000, Number(event.target.value) || 200)))}
          />
          <label htmlFor="embed-title">无障碍标题</label>
          <input id="embed-title" value={config.title} onChange={(event) => update("title", event.target.value)} />
          <label htmlFor="embed-caption">下方说明</label>
          <input id="embed-caption" value={config.caption} onChange={(event) => update("caption", event.target.value)} />
          <label className="check-row">
            <input type="checkbox" checked={config.showBorder} onChange={(event) => update("showBorder", event.target.checked)} />
            显示边框
          </label>
        </div>
      </aside>
      <main className="embed-preview">
        <div className="preview-heading">实时预览</div>
        <EmbedFrame config={config} preview load={loadPreview} />
        {embedUrl(config.source, config.url) && !loadPreview && (
          <button className="load-button" onClick={() => setLoadPreview(true)}>尝试真实加载</button>
        )}
        <p className="preview-hint">预览可能受来源的分享权限、登录状态或嵌入限制影响。</p>
      </main>
      <footer className="embed-footer">
        {error && <span role="alert">{error}</span>}
        <button onClick={() => {
          if (hasNexusBridge()) void view.close();
        }}>取消</button>
        <button className="primary" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "保存"}</button>
      </footer>
    </div>
  );
}
