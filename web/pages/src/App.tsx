import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  events,
  hasNexusBridge,
  invoke,
  view,
  type Subscription,
} from "@pc-nexus/bridge";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Columns3,
  ExternalLink,
  FileText,
  List,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Square,
  X,
} from "lucide-react";
import {
  DEFAULT_CONFIG,
  MOCK_PAGES,
  MOCK_SPACES,
  mergeRefreshedPages,
  normalizeConfig,
  normalizePage,
  normalizeSpace,
  type Alignment,
  type CardsConfig,
  type Columns,
  type DisplayMode,
  type HoverEffect,
  type WikiPage,
  type WikiSpace,
} from "../../../plugins/cards/config";
import "./style.css";

const CONFIG_CHANGED_EVENT = "NEXUS_EXTENSION_DATA_CONFIG_CHANGED";
const PAGE_SIZE = 10;
const SPACE_PAGE_SIZE = 20;
const MAX_PAGES = 12;

interface WikiPagesResponse {
  page_index?: number;
  total?: number;
  values?: unknown[];
}

interface WikiSpacesResponse {
  page_index?: number;
  total?: number;
  values?: unknown[];
}

interface ExtensionData {
  config?: unknown;
  entry?: { mode?: "view" | "edit" };
}

export default function CardsApp() {
  const initialized = useRef(false);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [activeTab, setActiveTab] = useState<"general" | "content">("general");
  const [config, setConfig] = useState<CardsConfig>(DEFAULT_CONFIG);
  const [space, setSpace] = useState<WikiSpace | null>(null);
  const [availableSpaces, setAvailableSpaces] = useState<WikiSpace[]>([]);
  const [spaceIndex, setSpaceIndex] = useState(0);
  const [spaceTotal, setSpaceTotal] = useState(0);
  const [availablePages, setAvailablePages] = useState<WikiPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageTotal, setPageTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let subscription: Subscription | undefined;

    async function initialize() {
      if (!hasNexusBridge()) {
        const standaloneMode = new URLSearchParams(window.location.search).get(
          "mode",
        );
        const demoSpace = MOCK_SPACES[0] ?? null;
        setMode(standaloneMode === "view" ? "view" : "edit");
        setSpace(demoSpace);
        setAvailableSpaces(MOCK_SPACES);
        setSpaceTotal(MOCK_SPACES.length);
        setAvailablePages(MOCK_PAGES);
        setPageTotal(MOCK_PAGES.length);
        setConfig({
          ...DEFAULT_CONFIG,
          space: demoSpace,
          pages: MOCK_PAGES.slice(0, 3),
        });
        setLoading(false);
        return;
      }

      try {
        const context = await view.getContext<ExtensionData>();
        const data = context.extension.data;
        const nextMode = data.entry?.mode ?? "view";
        const nextConfig = normalizeConfig(data.config);
        setMode(nextMode);
        setConfig(nextConfig);
        setSpace(nextConfig.space);

        if (nextMode === "edit") {
          await loadSpaceData(0);
          if (nextConfig.space) await loadPageData(0, nextConfig.space.id);
        } else {
          if (nextConfig.pages.length) {
            try {
              const refreshed = await invoke<{ pageIds: string[] }, unknown[]>(
                "getWikiPages",
                {
                  pageIds: nextConfig.pages.map((page) => page.id),
                },
              );
              setConfig({
                ...nextConfig,
                pages: mergeRefreshedPages(nextConfig.pages, refreshed),
              });
            } catch {
              // Saved data remains usable when a page was removed or temporarily unavailable.
            }
          }
          subscription = await events.on<{ config?: unknown }>(
            CONFIG_CHANGED_EVENT,
            (payload) => {
              setConfig(normalizeConfig(payload?.config));
            },
          );
          requestAnimationFrame(
            () => void view.emitReadyEvent().catch(() => undefined),
          );
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "无法加载卡片配置");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
    return () => subscription?.unsubscribe();
  }, []);

  async function loadSpaceData(targetIndex: number) {
    if (!hasNexusBridge()) {
      setAvailableSpaces(MOCK_SPACES);
      setSpaceIndex(0);
      setSpaceTotal(MOCK_SPACES.length);
      return;
    }
    setSpaceLoading(true);
    setMessage("");
    try {
      const result = await invoke<
        { pageIndex: number; pageSize: number },
        WikiSpacesResponse
      >("listWikiSpaces", {
        pageIndex: Math.max(0, targetIndex),
        pageSize: SPACE_PAGE_SIZE,
      });
      setAvailableSpaces(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizeSpace)
          .filter((item): item is WikiSpace => item !== null),
      );
      setSpaceIndex(
        Number.isFinite(result.page_index)
          ? Number(result.page_index)
          : targetIndex,
      );
      setSpaceTotal(Number(result.total ?? 0));
    } catch (error) {
      setAvailableSpaces([]);
      setMessage(
        error instanceof Error ? error.message : "Wiki 空间列表加载失败",
      );
    } finally {
      setSpaceLoading(false);
    }
  }

  async function selectSpace(spaceId: string) {
    const selected =
      availableSpaces.find((item) => item.id === spaceId) ?? null;
    setSpace(selected);
    setConfig((current) => ({ ...current, space: selected }));
    setAvailablePages([]);
    setPageIndex(0);
    setPageTotal(0);
    setQuery("");
    setMessage("");
    if (selected) await loadPageData(0, selected.id);
  }

  async function loadPageData(
    targetIndex: number,
    selectedSpaceId = space?.id ?? "",
  ) {
    if (!selectedSpaceId) {
      setAvailablePages([]);
      setPageIndex(0);
      setPageTotal(0);
      return;
    }
    if (!hasNexusBridge()) {
      setAvailablePages(MOCK_PAGES);
      setPageIndex(0);
      setPageTotal(MOCK_PAGES.length);
      return;
    }
    setPageLoading(true);
    setMessage("");
    try {
      const result = await invoke<
        { spaceId: string; pageIndex: number; pageSize: number },
        WikiPagesResponse
      >("listWikiPages", {
        spaceId: selectedSpaceId,
        pageIndex: Math.max(0, targetIndex),
        pageSize: PAGE_SIZE,
      });
      setAvailablePages(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizePage)
          .filter((page): page is WikiPage => page !== null),
      );
      setPageIndex(
        Number.isFinite(result.page_index)
          ? Number(result.page_index)
          : targetIndex,
      );
      setPageTotal(Number(result.total ?? 0));
      setQuery("");
    } catch (error) {
      setAvailablePages([]);
      setMessage(
        error instanceof Error ? error.message : "Wiki 页面列表加载失败",
      );
    } finally {
      setPageLoading(false);
    }
  }

  function patchConfig(patch: Partial<CardsConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function togglePage(page: WikiPage) {
    setMessage("");
    setConfig((current) => {
      const selected = current.pages.some((item) => item.id === page.id);
      if (selected)
        return {
          ...current,
          pages: current.pages.filter((item) => item.id !== page.id),
        };
      if (current.pages.length >= MAX_PAGES) {
        setMessage(`最多选择 ${MAX_PAGES} 个页面`);
        return current;
      }
      return { ...current, pages: [...current.pages, page] };
    });
  }

  async function save() {
    if (saving) return;
    if (!config.space) {
      setMessage("请先选择 Wiki 空间");
      setActiveTab("content");
      return;
    }
    if (!config.pages.length) {
      setMessage("请至少选择一个 Wiki 页面");
      setActiveTab("content");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (hasNexusBridge())
        await view.submit({ config, body: [{ id: "content" }] });
      else setMessage("预览配置已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  const filteredPages = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return availablePages;
    return availablePages.filter((page) =>
      page.name.toLocaleLowerCase().includes(keyword),
    );
  }, [availablePages, query]);
  const spacePageCount = Math.max(1, Math.ceil(spaceTotal / SPACE_PAGE_SIZE));
  const pageCount = Math.max(1, Math.ceil(pageTotal / PAGE_SIZE));

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        <LoaderCircle size={20} />
        <span>正在加载页面列表</span>
      </div>
    );
  }

  if (mode === "view") return <CardsGrid config={config} />;

  return (
    <main className="editor-shell">
      <aside className="settings-panel">
        <div className="brand-row">
          <BrandMark />
          <h1>Myriad - Pages</h1>
        </div>

        <div className="tabs" role="tablist" aria-label="卡片设置">
          <button
            className={activeTab === "general" ? "active" : ""}
            onClick={() => setActiveTab("general")}
            role="tab"
            aria-selected={activeTab === "general"}
          >
            General
          </button>
          <button
            className={activeTab === "content" ? "active" : ""}
            onClick={() => setActiveTab("content")}
            role="tab"
            aria-selected={activeTab === "content"}
          >
            Content
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="settings-body">
            <ControlGroup label="Display">
              <SegmentedControl
                wide
                value={config.display}
                options={[
                  { value: "card", label: "卡片", icon: <Square /> },
                  { value: "list", label: "列表", icon: <List /> },
                ]}
                onChange={(display) =>
                  patchConfig({ display: display as DisplayMode })
                }
              />
            </ControlGroup>
            <ControlGroup label="Alignment">
              <SegmentedControl
                value={config.alignment}
                options={[
                  { value: "left", label: "左对齐", icon: <AlignLeft /> },
                  { value: "center", label: "居中", icon: <AlignCenter /> },
                  { value: "right", label: "右对齐", icon: <AlignRight /> },
                ]}
                onChange={(alignment) =>
                  patchConfig({ alignment: alignment as Alignment })
                }
              />
            </ControlGroup>
            <ControlGroup label="Columns">
              <SegmentedControl
                wide
                value={String(config.columns)}
                options={[
                  { value: "1", label: "单列", icon: <Square /> },
                  { value: "2", label: "双列", icon: <Columns2 /> },
                  { value: "3", label: "三列", icon: <Columns3 /> },
                ]}
                onChange={(columns) =>
                  patchConfig({ columns: Number(columns) as Columns })
                }
              />
            </ControlGroup>
            <label className="select-field">
              <span>Hover Effect</span>
              <select
                value={config.hoverEffect}
                onChange={(event) =>
                  patchConfig({
                    hoverEffect: event.target.value as HoverEffect,
                  })
                }
              >
                <option value="elevate">Elevate</option>
                <option value="outline">Outline</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="settings-body content-settings">
            <div className="space-picker">
              <label className="select-field">
                <span>Wiki Space</span>
                <select
                  value={space?.id ?? ""}
                  disabled={spaceLoading}
                  onChange={(event) => void selectSpace(event.target.value)}
                >
                  <option value="">请选择 Wiki 空间</option>
                  {space &&
                    !availableSpaces.some((item) => item.id === space.id) && (
                      <option value={space.id}>
                        {space.name || space.identifier || space.id}
                      </option>
                    )}
                  {availableSpaces.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name || item.identifier || item.id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-pagination" aria-label="空间列表分页">
                <button
                  className="icon-button"
                  type="button"
                  title="上一页空间"
                  aria-label="上一页空间"
                  disabled={spaceLoading || spaceIndex <= 0}
                  onClick={() => void loadSpaceData(spaceIndex - 1)}
                >
                  <ChevronLeft />
                </button>
                <span>
                  {spaceIndex + 1} / {spacePageCount} · {spaceTotal} 个空间
                </span>
                <button
                  className="icon-button"
                  type="button"
                  title="下一页空间"
                  aria-label="下一页空间"
                  disabled={spaceLoading || spaceIndex + 1 >= spacePageCount}
                  onClick={() => void loadSpaceData(spaceIndex + 1)}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="content-heading">
              <div>
                <span>Wiki Pages</span>
                <small>
                  {space
                    ? `${space.name || space.identifier || space.id} · 已选 ${config.pages.length}/${MAX_PAGES}`
                    : "选择空间后加载页面"}
                </small>
              </div>
              <button
                className="icon-button"
                type="button"
                title="刷新页面列表"
                aria-label="刷新页面列表"
                disabled={pageLoading || !space}
                onClick={() => void loadPageData(pageIndex)}
              >
                <RefreshCw className={pageLoading ? "spin" : ""} />
              </button>
            </div>
            <label className="search-field">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                disabled={!space}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索当前页"
              />
            </label>
            <div className="page-list" aria-busy={pageLoading}>
              {!space ? (
                <div className="list-state">请先选择 Wiki 空间</div>
              ) : pageLoading ? (
                <div className="list-state">
                  <LoaderCircle className="spin" />
                  <span>正在加载页面</span>
                </div>
              ) : filteredPages.length ? (
                filteredPages.map((page) => {
                  const selected = config.pages.some(
                    (item) => item.id === page.id,
                  );
                  return (
                    <label
                      className={`page-option ${selected ? "selected" : ""}`}
                      key={page.id}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePage(page)}
                      />
                      <span className="page-icon">
                        <FileText />
                      </span>
                      <span className="page-copy">
                        <strong>{page.name}</strong>
                        <small>{formatDate(page.updatedAt)}</small>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="list-state">没有匹配的页面</div>
              )}
            </div>
            <div className="pagination">
              <button
                className="icon-button"
                title="上一页"
                aria-label="上一页"
                disabled={!space || pageLoading || pageIndex <= 0}
                onClick={() => void loadPageData(pageIndex - 1)}
              >
                <ChevronLeft />
              </button>
              <span>
                {pageIndex + 1} / {pageCount} · {pageTotal} 项
              </span>
              <button
                className="icon-button"
                title="下一页"
                aria-label="下一页"
                disabled={!space || pageLoading || pageIndex + 1 >= pageCount}
                onClick={() => void loadPageData(pageIndex + 1)}
              >
                <ChevronRight />
              </button>
            </div>
            {config.pages.length > 0 && (
              <div className="selected-pages">
                {config.pages.map((page) => (
                  <span key={page.id}>
                    {page.name}
                    <button
                      type="button"
                      aria-label={`移除 ${page.name}`}
                      title={`移除 ${page.name}`}
                      onClick={() => togglePage(page)}
                    >
                      <X />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      <section className="preview-panel" aria-label="页面预览">
        <div className="preview-scroll">
          <CardsGrid
            config={config}
            editable
            onAdd={() => setActiveTab("content")}
          />
        </div>
        <footer className="editor-footer">
          {message && (
            <span
              className={
                message.includes("失败") ||
                message.includes("请") ||
                message.includes("最多")
                  ? "error-message"
                  : "status-message"
              }
              role="status"
            >
              {message}
            </span>
          )}
          <button
            className="cancel-button"
            type="button"
            onClick={() =>
              hasNexusBridge() ? void view.close() : setMessage("")
            }
          >
            取消
          </button>
          <button
            className="save-button"
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "保存中" : "保存"}
          </button>
        </footer>
      </section>
    </main>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="control-group">
      <h2>{label}</h2>
      {children}
    </section>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
  wide = false,
}: {
  value: string;
  options: Array<{ value: string; label: string; icon: ReactNode }>;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={`segmented-control ${wide ? "wide" : ""}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "selected" : ""}
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

function BrandMark() {
  return (
    <span className="cards-brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function CardsGrid({
  config,
  editable = false,
  onAdd,
}: {
  config: CardsConfig;
  editable?: boolean;
  onAdd?: () => void;
}) {
  return (
    <div
      className={`cards-grid display-${config.display} columns-${config.columns} align-${config.alignment} hover-${config.hoverEffect}`}
    >
      {config.pages.map((page) => {
        const content = (
          <>
            <span className="page-card-icon">
              <FileText />
            </span>
            <span className="card-content">
              <span className="page-card-type">文档</span>
              <strong>{page.name}</strong>
              {page.description && (
                <span className="page-card-description">
                  {page.description}
                </span>
              )}
              <small>
                {page.spaceName || config.space?.name || "未知空间"} ·{" "}
                {formatDate(page.updatedAt)}
              </small>
            </span>
            {page.htmlUrl && page.htmlUrl !== "#" && (
              <span className="page-card-link" aria-hidden="true">
                <ExternalLink />
              </span>
            )}
          </>
        );
        return page.htmlUrl && page.htmlUrl !== "#" ? (
          <a
            className="page-card"
            href={page.htmlUrl}
            target="_blank"
            rel="noreferrer"
            key={page.id}
          >
            {content}
          </a>
        ) : (
          <article className="page-card" key={page.id}>
            {content}
          </article>
        );
      })}
      {editable && (
        <button
          className="add-card"
          type="button"
          title="选择 Wiki 页面"
          aria-label="选择 Wiki 页面"
          onClick={onAdd}
        >
          <Plus />
          {!config.pages.length && <span>选择 Wiki 页面</span>}
        </button>
      )}
    </div>
  );
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "更新时间未知";
  const date = new Date(
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp,
  );
  if (Number.isNaN(date.getTime())) return "更新时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
