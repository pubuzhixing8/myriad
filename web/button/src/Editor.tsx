import { useState, type ReactNode } from "react";
import { view } from "@pc-nexus/bridge";
import {
  darkenColor,
  ICONFONT_ICONS,
  TEMPLATES,
  iconfontSvg,
  normalizeButton,
  safeButtonHref,
  safeColor,
  type ButtonConfig,
} from "../../../plugins/button/config";
import { ButtonSurface } from "./ButtonSurface";

const ICON_GROUPS = [
  {
    name: "常用",
    ids: [
      "none",
      "arrowright",
      "check",
      "link",
      "home",
      "star",
      "heart",
      "play",
      "download",
      "upload",
      "setting",
    ],
  },
  {
    name: "办公",
    ids: ["file", "pdf", "word", "excel", "ppt", "calendar", "email"],
  },
  {
    name: "软件开发",
    ids: ["code", "terminal", "database", "github", "gitlab", "figma"],
  },
  {
    name: "社交媒体",
    ids: ["wechat", "sina", "linkedin", "youtube", "bilibili"],
  },
];
const PALETTE = [
  "#2b6cf0",
  "#6a5df6",
  "#12a06a",
  "#ec8b17",
  "#d93843",
  "#222b3b",
  "#ffffff",
];

function templateConfig(config: Partial<ButtonConfig>): ButtonConfig {
  return normalizeButton({
    ...config,
    ...(config.backgroundColor
      ? { hoverBackgroundColor: darkenColor(config.backgroundColor) }
      : {}),
  });
}

export function Editor({ initialConfig }: { initialConfig: ButtonConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [tab, setTab] = useState<"templates" | "configuration">("templates");
  const [designTab, setDesignTab] = useState<"default" | "hover">("default");
  const [linkOpen, setLinkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function change<K extends keyof ButtonConfig>(
    key: K,
    value: ButtonConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (config.href.trim() && !safeButtonHref(config)) {
      setError(
        config.linkType === "email"
          ? "请输入有效的邮箱地址"
          : "请输入 http:// 或 https:// 链接",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await view.submit({ config });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="editor">
      <aside className="settings">
        <nav className="top-tabs" role="tablist" aria-label="按钮设置">
          <Tab active={tab === "templates"} onClick={() => setTab("templates")}>
            模板
          </Tab>
          <Tab
            active={tab === "configuration"}
            onClick={() => setTab("configuration")}
          >
            配置
          </Tab>
        </nav>
        <div className="settings-scroll">
          {tab === "templates" ? (
            <div className="template-list">
              {Array.from(
                new Set(TEMPLATES.map((template) => template.group)),
              ).map((group) => (
                <section key={group}>
                  <h2>{group}</h2>
                  <div className="template-grid">
                    {TEMPLATES.filter(
                      (template) => template.group === group,
                    ).map((template) => (
                      <button
                        type="button"
                        className="template-card"
                        key={template.id}
                        onClick={() => {
                          setConfig(templateConfig(template.config));
                          setTab("configuration");
                        }}
                      >
                        <ButtonSurface
                          config={templateConfig(template.config)}
                        />
                        <span className="template-name">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="config-panel">
              <h2>常规</h2>
              <Field label="形状">
                <Choices
                  className="shape-choices"
                  value={config.shape}
                  options={[
                    ["square", "方形"],
                    ["rounded", "圆角"],
                    ["pill", "胶囊"],
                    ["diamond", "菱形"],
                    ["tag", "标签"],
                    ["circle", "圆形"],
                  ]}
                  onChange={(value) => {
                    change("shape", value as ButtonConfig["shape"]);
                    if (value === "circle" && config.iconId === "none") {
                      change("iconId", "arrowright");
                    }
                  }}
                />
              </Field>
              <Field label="类型">
                <Choices
                  value={config.appearance}
                  options={[
                    ["fill", "实心"],
                    ["outline", "描边"],
                    ["ghost", "文字"],
                  ]}
                  onChange={(value) => {
                    const appearance = value as ButtonConfig["appearance"];
                    setConfig((current) => ({
                      ...current,
                      appearance,
                      backgroundEnabled: appearance === "fill",
                      textColorEnabled: appearance === "fill",
                    }));
                  }}
                />
              </Field>
              <label className="toggle-row">
                <span>显示文字</span>
                <input
                  type="checkbox"
                  checked={config.showLabel}
                  onChange={(event) => {
                    change("showLabel", event.target.checked);
                    if (!event.target.checked && config.iconId === "none")
                      change("iconId", "arrowright");
                  }}
                />
              </label>
              <Field label="尺寸">
                <Choices
                  value={config.size}
                  options={[
                    ["small", "小"],
                    ["medium", "中"],
                    ["large", "大"],
                  ]}
                  onChange={(value) =>
                    change("size", value as ButtonConfig["size"])
                  }
                />
              </Field>
              {config.shape === "circle" ? (
                <p className="shape-hint">圆形按钮使用与高度相同的宽度</p>
              ) : (
                <Field label="最小宽度">
                  <div className="range-row">
                    <input
                      type="range"
                      min="0"
                      max="320"
                      value={config.minWidth}
                      onChange={(event) =>
                        change("minWidth", Number(event.target.value))
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      max="320"
                      value={config.minWidth}
                      onChange={(event) =>
                        change(
                          "minWidth",
                          Math.min(
                            320,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        )
                      }
                    />
                    <span>px</span>
                  </div>
                </Field>
              )}
              <h2>设计</h2>
              <div className="sub-tabs" role="tablist" aria-label="按钮状态">
                <Tab
                  active={designTab === "default"}
                  onClick={() => setDesignTab("default")}
                >
                  默认
                </Tab>
                <Tab
                  active={designTab === "hover"}
                  onClick={() => setDesignTab("hover")}
                >
                  悬停
                </Tab>
              </div>
              {designTab === "default" ? (
                <>
                  <ColorRow
                    label="背景颜色"
                    enabled={config.backgroundEnabled}
                    value={config.backgroundColor}
                    onEnabled={(value) => change("backgroundEnabled", value)}
                    onChange={(value) => change("backgroundColor", value)}
                  />
                  <ColorRow
                    label="文字颜色"
                    enabled={config.textColorEnabled}
                    value={config.textColor}
                    onEnabled={(value) => change("textColorEnabled", value)}
                    onChange={(value) => change("textColor", value)}
                  />
                  {config.appearance === "outline" && (
                    <ColorRow
                      label="描边颜色"
                      enabled={config.outlineEnabled}
                      value={config.outlineColor}
                      onEnabled={(value) => change("outlineEnabled", value)}
                      onChange={(value) => change("outlineColor", value)}
                    />
                  )}
                </>
              ) : (
                <>
                  <ColorRow
                    label="背景颜色"
                    enabled={config.hoverBackgroundEnabled}
                    value={config.hoverBackgroundColor}
                    onEnabled={(value) =>
                      change("hoverBackgroundEnabled", value)
                    }
                    onChange={(value) => change("hoverBackgroundColor", value)}
                  />
                  <ColorRow
                    label="文字颜色"
                    enabled={config.hoverTextEnabled}
                    value={config.hoverTextColor}
                    onEnabled={(value) => change("hoverTextEnabled", value)}
                    onChange={(value) => change("hoverTextColor", value)}
                  />
                </>
              )}
              <h2>按钮内容</h2>
              <Field label="文字">
                <input
                  value={config.label}
                  onChange={(event) => change("label", event.target.value)}
                  placeholder="按钮文字"
                />
              </Field>
              <Field label="图标">
                <div className="icon-picker">
                  {ICON_GROUPS.map((group) => (
                    <div className="icon-group" key={group.name}>
                      <span className="icon-group-name">{group.name}</span>
                      <div className="icon-grid">
                        {group.ids.map((id) => {
                          const name =
                            id === "none"
                              ? "无"
                              : ICONFONT_ICONS.find(
                                  ([key]) => key === id,
                                )?.[1] || id;
                          const iconSvg = iconfontSvg(id);
                          return (
                            <button
                              type="button"
                              key={id}
                              className={config.iconId === id ? "selected" : ""}
                              title={name}
                              aria-label={name}
                              aria-pressed={config.iconId === id}
                              disabled={
                                config.shape === "circle" && id === "none"
                              }
                              onClick={() => {
                                change("iconId", id);
                                if (id === "none" && !config.showLabel)
                                  change("showLabel", true);
                              }}
                            >
                              {iconSvg ? (
                                <span
                                  className="picker-icon"
                                  aria-hidden="true"
                                  dangerouslySetInnerHTML={{ __html: iconSvg }}
                                />
                              ) : (
                                <span className="picker-none">—</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
              {config.iconId !== "none" && (
                <Field label="图标位置">
                  <Choices
                    value={config.iconPosition}
                    options={[
                      ["left", "左侧"],
                      ["right", "右侧"],
                    ]}
                    onChange={(value) =>
                      change(
                        "iconPosition",
                        value as ButtonConfig["iconPosition"],
                      )
                    }
                  />
                </Field>
              )}
              <button
                type="button"
                className="accordion-trigger"
                aria-expanded={linkOpen}
                onClick={() => setLinkOpen(!linkOpen)}
              >
                <span>链接与操作</span>
                <span>{linkOpen ? "⌃" : "⌄"}</span>
              </button>
              {linkOpen && (
                <div className="link-fields">
                  <Field label="链接类型">
                    <div className="select-frame">
                      <select
                        value={config.linkType}
                        onChange={(event) =>
                          change(
                            "linkType",
                            event.target.value as ButtonConfig["linkType"],
                          )
                        }
                      >
                        <option value="url">外部网址</option>
                        <option value="page">Wiki 页面</option>
                        <option value="email">电子邮件</option>
                      </select>
                    </div>
                  </Field>
                  <Field
                    label={
                      config.linkType === "email" ? "邮箱地址" : "链接地址"
                    }
                  >
                    <input
                      type={config.linkType === "email" ? "email" : "url"}
                      value={config.href}
                      onChange={(event) => change("href", event.target.value)}
                      placeholder={
                        config.linkType === "email"
                          ? "name@example.com"
                          : "https://example.com"
                      }
                    />
                  </Field>
                  <label className="toggle-row">
                    <span>新窗口打开</span>
                    <input
                      type="checkbox"
                      checked={config.openNewTab}
                      onChange={(event) =>
                        change("openNewTab", event.target.checked)
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
      <section className="preview" aria-label="按钮预览">
        <div className="preview-stage">
          <div className="preview-canvas">
            <ButtonSurface config={config} />
          </div>
        </div>
      </section>
      <footer className="editor-footer">
        <span className="error" role="alert">
          {error}
        </span>
        <button
          type="button"
          className="secondary"
          onClick={() => void view.close()}
        >
          取消
        </button>
        <button
          type="button"
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </footer>
    </main>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? "active" : ""}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}

function Choices({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`choices ${className}`}>
      {options.map(([key, label]) => (
        <button
          type="button"
          key={key}
          className={value === key ? "selected" : ""}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ColorRow({
  label,
  enabled,
  value,
  onEnabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  value: string;
  onEnabled: (value: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="color-row">
      <label className="toggle-row">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabled(event.target.checked)}
        />
      </label>
      {enabled && (
        <>
          <div className="palette">
            {PALETTE.map((color) => (
              <button
                type="button"
                key={color}
                className={value.toLowerCase() === color ? "selected" : ""}
                style={{ backgroundColor: color }}
                aria-label={color}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
          <div className="custom-color">
            <input
              type="color"
              value={safeColor(value, "#ffffff")}
              onChange={(event) => onChange(event.target.value)}
            />
            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              aria-label={`${label}色值`}
            />
          </div>
        </>
      )}
    </div>
  );
}
