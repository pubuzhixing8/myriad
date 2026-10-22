import { useEffect, useState } from "react";
import { hasNexusBridge, view } from "@pc-nexus/bridge";
import {
  createTab,
  normalizeTabs,
  validTabs,
  type TabItem,
  type TabsConfig,
} from "../../../plugins/tabs/config";
import "./style.css";

type EntryData = { config?: Partial<TabsConfig> };

export default function App() {
  const [tabs, setTabs] = useState<TabItem[]>(() => [
    { ...createTab(1), active: true },
    createTab(2),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasNexusBridge()) return;
    let active = true;
    void view.getContext<EntryData>().then((context) => {
      if (!active) return;
      const existing = normalizeTabs(context.extension.data.config).tabs;
      if (existing.length > 0) {
        setTabs(existing);
        setSelectedId(existing.find((tab) => tab.active)?.id ?? existing[0].id);
      }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "加载配置失败");
    });
    return () => {
      active = false;
    };
  }, []);

  const selected = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];

  function updateTab(id: string, title: string) {
    setTabs((current) => current.map((tab) => (
      tab.id === id ? { ...tab, title } : tab
    )));
  }

  function addTab() {
    const tab = createTab(tabs.length + 1);
    setTabs((current) => [...current, tab]);
    setSelectedId(tab.id);
  }

  function removeTab(id: string) {
    if (tabs.length <= 1) return;
    const next = tabs.filter((tab) => tab.id !== id);
    if (selectedId === id) setSelectedId(next[0].id);
    setTabs(next);
  }

  async function save() {
    if (saving) return;
    if (!validTabs(tabs)) {
      setError("请为每个标签填写名称，并至少保留一个标签。");
      return;
    }
    setSaving(true);
    setError("");
    const activeId = selected?.id ?? tabs[0].id;
    const config: TabsConfig = {
      tabs: tabs.map((tab) => ({
        id: tab.id,
        title: tab.title.trim(),
        active: tab.id === activeId,
      })),
    };
    const [first, ...rest] = config.tabs;
    try {
      if (hasNexusBridge()) {
        await view.submit({
          config,
          body: [{ id: first.id }, ...rest.map((tab) => ({ id: tab.id }))],
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor-root">
      <aside className="settings-panel">
        <div className="settings-scroll">
          <section className="setting-section">
            <h2>标签管理</h2>
            <p className="hint">在这里设置标签名称；标签内的内容请在文档中编辑。</p>
            <div className="tab-list">
              {tabs.map((tab, index) => (
                <div className="tab-row" key={tab.id}>
                  <button
                    type="button"
                    className={selected?.id === tab.id ? "tab-select active" : "tab-select"}
                    onClick={() => setSelectedId(tab.id)}
                    aria-label={`选择标签 ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                  <input
                    aria-label={`标签 ${index + 1} 名称`}
                    value={tab.title}
                    onChange={(event) => updateTab(tab.id, event.target.value)}
                    maxLength={80}
                  />
                  <button
                    type="button"
                    className="remove-button"
                    disabled={tabs.length <= 1}
                    onClick={() => removeTab(tab.id)}
                    aria-label={`删除标签 ${index + 1}`}
                    title="删除标签及其内容"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-button" onClick={addTab}>
              + 添加标签
            </button>
            <p className="warning">删除标签后保存，会同时删除该标签内的文档内容。</p>
          </section>
        </div>
      </aside>
      <main className="preview-panel">
        <div className="preview-heading">实时预览</div>
        <div className="preview-stage">
          <div className="preview-block">
            <div className="preview-tabs" role="tablist" aria-label="标签预览">
              {tabs.map((tab, index) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.id}
                  aria-selected={selected?.id === tab.id}
                  className={selected?.id === tab.id ? "active" : ""}
                  onClick={() => setSelectedId(tab.id)}
                >
                  {tab.title.trim() || `标签 ${index + 1}`}
                </button>
              ))}
            </div>
            <div className="preview-content">
              <span>{selected?.title.trim() || "标签内容"}</span>
              <p>保存后，可直接在文档中编辑该标签的内容。</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="editor-footer">
        {error && <span className="editor-error">{error}</span>}
        <button
          type="button"
          onClick={() => {
            if (hasNexusBridge()) void view.close();
          }}
        >
          取消
        </button>
        <button type="button" className="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "保存中…" : "保存"}
        </button>
      </footer>
    </div>
  );
}
