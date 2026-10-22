import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  api,
  events,
  hasNexusBridge,
  router,
  view,
  type Subscription,
} from "@pc-nexus/bridge";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronRight,
  FileText,
  Layers,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  BACKGROUND_OPTIONS,
  DEFAULT_DYNAMIC_CONTENT_CONFIG,
  MOCK_PAGES,
  MOCK_PAGE_REFS,
  MOCK_SPACES,
  normalizeDynamicContentConfig,
  normalizePageItem,
  normalizePageRef,
  normalizeSpace,
  normalizeSpaceItem,
  pickBackgroundImage,
  resolveItemUrl,
  type DynamicContentConfig,
  type DynamicContentItem,
  type PageFilters,
  type PageRelation,
  type SpaceFilters,
  type SpaceScopeType,
  type WikiPageRef,
  type WikiSpace,
} from "../../../plugins/dynamic-content/config";
import "./style.css";

const CONFIG_CHANGED_EVENT = "NEXUS_EXTENSION_DATA_CONFIG_CHANGED";
const PICK_PAGE_SIZE = 10;
const SPACE_OPTION_PAGE_SIZE = 10;

/** Team URL from the host context, used to build wiki links for spaces. */
let platformUrl = "";

interface WikiPagesResponse {
  page_index?: number;
  total?: number;
  values?: unknown[];
}

interface ExtensionData {
  config?: unknown;
  entry?: { mode?: "view" | "edit" };
}

export default function App() {
  const initialized = useRef(false);
  const keywordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spaceOptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncAttempt = useRef(0);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [step, setStep] = useState<"choose" | "configure">("configure");
  const [tab, setTab] = useState<"general" | "content">("content");
  const [config, setConfig] = useState<DynamicContentConfig>(
    DEFAULT_DYNAMIC_CONTENT_CONFIG,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [resultItems, setResultItems] = useState<DynamicContentItem[]>([]);
  const [resultIndex, setResultIndex] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");

  const [pickingReference, setPickingReference] = useState(false);
  const [referencePage, setReferencePage] = useState<WikiPageRef | null>(null);
  const [pageList, setPageList] = useState<WikiPageRef[]>([]);
  const [pickIndex, setPickIndex] = useState(0);
  const [pickTotal, setPickTotal] = useState(0);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState("");
  const [pageKeyword, setPageKeyword] = useState("");

  const [spaceOptions, setSpaceOptions] = useState<WikiSpace[]>([]);
  const [spaceOptionsLoading, setSpaceOptionsLoading] = useState(false);
  const [spaceQuery, setSpaceQuery] = useState("");
  const [spaceComboboxOpen, setSpaceComboboxOpen] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let subscription: Subscription | undefined;

    async function initialize() {
      if (!hasNexusBridge()) {
        const standaloneMode = new URLSearchParams(window.location.search).get(
          "mode",
        );
        const demoConfig: DynamicContentConfig = {
          ...DEFAULT_DYNAMIC_CONTENT_CONFIG,
          sourceType: "space",
        };
        const nextMode = standaloneMode === "view" ? "view" : "edit";
        setMode(nextMode);
        setConfig(demoConfig);
        setStep("configure");
        await loadResults(0, demoConfig, false);
        if (nextMode === "edit") await loadSpaceOptions("");
        setLoading(false);
        return;
      }

      try {
        const context = await view.getContext<ExtensionData>();
        platformUrl = String(context.team?.url ?? "");
        const nextMode = context.extension.data.entry?.mode ?? "view";
        const nextConfig = normalizeDynamicContentConfig(
          context.extension.data.config,
        );
        setMode(nextMode);
        setConfig(nextConfig);
        syncReferencePage(nextConfig);

        if (nextMode === "edit") {
          setStep(nextConfig.sourceType ? "configure" : "choose");
          if (nextConfig.sourceType) {
            void syncResultsWithRetry(nextConfig);
            if (nextConfig.sourceType === "page") {
              void loadSpaceOptions("");
            }
          }
        } else {
          void syncResultsWithRetry(nextConfig);
          subscription = await events.on<{ config?: unknown }>(
            CONFIG_CHANGED_EVENT,
            (payload) => {
              // Saving re-renders this block while the editor modal closes;
              // wait for that cycle to settle before loading again.
              if (refreshTimer.current) clearTimeout(refreshTimer.current);
              refreshTimer.current = setTimeout(() => {
                const changedConfig = normalizeDynamicContentConfig(
                  payload?.config,
                );
                setConfig(changedConfig);
                syncReferencePage(changedConfig);
                void syncResultsWithRetry(changedConfig);
              }, 600);
            },
          );
          requestAnimationFrame(
            () => void view.emitReadyEvent().catch(() => undefined),
          );
        }
      } catch (error) {
        console.error("[dynamic-content] 初始化失败", error);
        setMessage(error instanceof Error ? error.message : "动态内容加载失败");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
    return () => {
      subscription?.unsubscribe();
      if (keywordTimer.current) clearTimeout(keywordTimer.current);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (spaceOptionTimer.current) clearTimeout(spaceOptionTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSpaceMode = config.sourceType === "space";
  const displayItems = resultItems;
  const filteredPageList = useMemo(() => {
    const keyword = pageKeyword.trim().toLocaleLowerCase();
    if (!keyword) return pageList;
    return pageList.filter((page) =>
      page.name.toLocaleLowerCase().includes(keyword),
    );
  }, [pageKeyword, pageList]);
  const selectedSpaceName =
    config.pageFilters.spaceName ||
    spaceOptions.find((space) => space.id === config.pageFilters.spaceId)
      ?.name ||
    "";

  function syncReferencePage(targetConfig: DynamicContentConfig) {
    const filters = targetConfig.pageFilters;
    setReferencePage(
      filters.relationPageId
        ? {
            id: filters.relationPageId,
            name: filters.relationPageName || filters.relationPageId,
            spaceName: filters.spaceName,
            updatedAt: 0,
          }
        : null,
    );
  }

  function update<K extends keyof DynamicContentConfig>(
    key: K,
    value: DynamicContentConfig[K],
  ) {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (key === "sort" || key === "limit") {
      void loadResults(0, next, false);
    }
  }

  async function loadResults(
    pageIndex: number,
    targetConfig: DynamicContentConfig,
    reportErrors = true,
    append = false,
  ): Promise<DynamicContentItem[]> {
    const target = Math.max(0, pageIndex);
    lastRequestFailure = null;
    setResultLoading(true);
    if (reportErrors) setMessage("");

    try {
      if (!hasNexusBridge()) {
        const { items, total } = mockResults(targetConfig, target);
        setResultItems((current) => mergeById(current, items, append));
        setResultIndex(target);
        setResultTotal(total);
        setResultError("");
        return items;
      }

      const result =
        targetConfig.sourceType === "space"
          ? await restJson<WikiPagesResponse>(
              wikiSpacesPath(
                target,
                targetConfig.limit,
                targetConfig.spaceFilters,
              ),
            )
          : await restJson<WikiPagesResponse>(
              wikiPagesPath(target, targetConfig.limit, {
                spaceId: targetConfig.pageFilters.spaceId || undefined,
                parentId:
                  targetConfig.pageFilters.relation === "parent"
                    ? targetConfig.pageFilters.relationPageId || undefined
                    : undefined,
                ancestorId:
                  targetConfig.pageFilters.relation === "ancestor"
                    ? targetConfig.pageFilters.relationPageId || undefined
                    : undefined,
              }),
            );

      const items = (Array.isArray(result.values) ? result.values : [])
        .map((value) =>
          targetConfig.sourceType === "space"
            ? normalizeSpaceItem(value)
            : normalizePageItem(value),
        )
        .filter((item): item is DynamicContentItem => item !== null);
      const sorted = sortItems(items, targetConfig.sort);
      setResultItems((current) => mergeById(current, sorted, append));
      setResultIndex(Number(result.page_index ?? target));
      setResultTotal(Number(result.total ?? 0));
      setResultError("");
      return sorted;
    } catch (error) {
      console.error("[dynamic-content] 结果加载失败", error);
      lastRequestFailure = error;
      if (!append) {
        setResultItems([]);
        setResultIndex(target);
        setResultTotal(0);
      }
      setResultError(error instanceof Error ? error.message : "动态内容加载失败");
      if (reportErrors) {
        setMessage(error instanceof Error ? error.message : "动态内容加载失败");
      }
      return [];
    } finally {
      setResultLoading(false);
    }
  }

  /**
   * Re-opening the editor right after saving can inherit a closed host
   * connection. Keep retrying in the background until a request succeeds
   * instead of leaving the editor stuck.
   */
  async function syncResultsWithRetry(targetConfig: DynamicContentConfig) {
    syncAttempt.current = 0;
    const run = async (): Promise<void> => {
      await loadResults(0, targetConfig, false);
      if (!lastRequestFailure) return;
      syncAttempt.current += 1;
      if (syncAttempt.current > 6) {
        setMessage("数据加载失败，请稍后重试");
        return;
      }
      const delay = Math.min(30_000, 2_000 * 2 ** (syncAttempt.current - 1));
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void run(), delay);
    };
    await run();
  }

  async function loadPickList(pageIndex: number, append = false) {
    const target = Math.max(0, pageIndex);
    setPickLoading(true);
    setPickError("");
    try {
      if (!hasNexusBridge()) {
        const filtered = filterMockPages(config.pageFilters);
        setPageList((current) =>
          mergeById(current, paginate(filtered, target, PICK_PAGE_SIZE), append),
        );
        setPickIndex(target);
        setPickTotal(filtered.length);
        return;
      }
      const result = await restJson<WikiPagesResponse>(
        wikiPagesPath(target, PICK_PAGE_SIZE, {
          spaceId: config.pageFilters.spaceId || undefined,
        }),
      );
      const pages = (Array.isArray(result.values) ? result.values : [])
        .map(normalizePageRef)
        .filter((page): page is WikiPageRef => page !== null);
      setPageList((current) => mergeById(current, pages, append));
      setPickIndex(Number(result.page_index ?? target));
      setPickTotal(Number(result.total ?? 0));
    } catch (error) {
      if (!append) {
        setPageList([]);
        setPickIndex(target);
        setPickTotal(0);
        setPickError(error instanceof Error ? error.message : "页面列表加载失败");
      }
    } finally {
      setPickLoading(false);
    }
  }

  async function loadSpaceOptions(query = "") {
    setSpaceOptionsLoading(true);
    try {
      if (!hasNexusBridge()) {
        const keyword = query.trim().toLocaleLowerCase();
        const matched = keyword
          ? MOCK_SPACES.filter((space) =>
              `${space.name ?? ""} ${space.identifier ?? ""}`
                .toLocaleLowerCase()
                .includes(keyword),
            )
          : MOCK_SPACES;
        setSpaceOptions(matched.slice(0, SPACE_OPTION_PAGE_SIZE));
        return;
      }
      const result = await restJson<WikiPagesResponse>(
        wikiSpacesPath(0, SPACE_OPTION_PAGE_SIZE, {
          keywords: query,
          scopeType: "all",
          includeArchived: false,
        }),
      );
      setSpaceOptions(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizeSpace)
          .filter((space): space is WikiSpace => space !== null),
      );
    } catch {
      setSpaceOptions([]);
    } finally {
      setSpaceOptionsLoading(false);
    }
  }

  function handleSpaceQuery(value: string) {
    setSpaceQuery(value);
    if (spaceOptionTimer.current) clearTimeout(spaceOptionTimer.current);
    spaceOptionTimer.current = setTimeout(
      () => void loadSpaceOptions(value),
      300,
    );
  }

  function startWithType(sourceType: "space" | "page") {
    if (keywordTimer.current) clearTimeout(keywordTimer.current);
    const next: DynamicContentConfig = { ...config, sourceType };
    setConfig(next);
    setStep("configure");
    setTab("content");
    setPickingReference(false);
    setPageKeyword("");
    setMessage("");
    void loadResults(0, next);
    if (sourceType === "page") void loadSpaceOptions(spaceQuery);
  }

  function handleSpaceKeyword(value: string) {
    const nextFilters = { ...config.spaceFilters, keywords: value };
    const next = { ...config, spaceFilters: nextFilters };
    setConfig(next);
    if (keywordTimer.current) clearTimeout(keywordTimer.current);
    keywordTimer.current = setTimeout(() => void loadResults(0, next, false), 350);
  }

  function handleSpaceScopeType(scopeType: SpaceScopeType) {
    const next = { ...config, spaceFilters: { ...config.spaceFilters, scopeType } };
    setConfig(next);
    void loadResults(0, next, false);
  }

  function handleIncludeArchived(includeArchived: boolean) {
    const next = {
      ...config,
      spaceFilters: { ...config.spaceFilters, includeArchived },
    };
    setConfig(next);
    void loadResults(0, next, false);
  }

  function handlePageSpace(spaceId: string) {
    const selected = spaceOptions.find((space) => space.id === spaceId);
    const spaceName =
      spaceId === ""
        ? ""
        : selected?.name ??
          (config.pageFilters.spaceId === spaceId
            ? config.pageFilters.spaceName
            : "");
    const next = {
      ...config,
      pageFilters: {
        ...config.pageFilters,
        spaceId,
        spaceName,
        relationPageId: "",
        relationPageName: "",
      },
    };
    setConfig(next);
    setReferencePage(null);
    setPickingReference(false);
    setSpaceComboboxOpen(false);
    setSpaceQuery(spaceName);
    void loadResults(0, next, false);
  }

  function handlePageRelation(relation: PageRelation) {
    const next = {
      ...config,
      pageFilters: { ...config.pageFilters, relation },
    };
    setConfig(next);
    void loadResults(0, next, false);
  }

  function beginReferencePick() {
    setPickingReference(true);
    setPageKeyword("");
    setMessage("");
    void loadPickList(0);
  }

  function clearReference() {
    const next = {
      ...config,
      pageFilters: {
        ...config.pageFilters,
        relationPageId: "",
        relationPageName: "",
      },
    };
    setConfig(next);
    setReferencePage(null);
    void loadResults(0, next, false);
  }

  function chooseReferencePage(page: WikiPageRef) {
    const next = {
      ...config,
      pageFilters: {
        ...config.pageFilters,
        relationPageId: page.id,
        relationPageName: page.name,
      },
    };
    setConfig(next);
    setReferencePage(page);
    setPickingReference(false);
    void loadResults(0, next, false);
  }

  async function save() {
    if (saving) return;
    if (!config.sourceType) {
      setMessage("请先选择动态内容的来源类型");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (hasNexusBridge()) {
        // Only the query settings are persisted; content is always fetched
        // live by the REST gateway, so no items snapshot is stored.
        await view.submit({ config });
      } else {
        setMessage("预览配置已保存");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state" role="status">
        <LoaderCircle className="spin" size={18} />
        <span>正在加载动态内容</span>
      </div>
    );
  }

  if (mode === "view") {
    return (
      <main className="content-view">
        {displayItems.length ? (
          <ContentGrid config={config} items={displayItems} interactive />
        ) : (
          <div className="preview-empty">
            {resultLoading ? "正在加载动态内容" : "暂无动态内容"}
          </div>
        )}
        <LoadMore
          loaded={displayItems.length}
          total={resultTotal}
          pageSize={config.limit}
          loading={resultLoading}
          onChange={() => void loadResults(resultIndex + 1, config, true, true)}
        />
      </main>
    );
  }

  if (step === "choose" || config.sourceType === null) {
    return <SourceTypeChooser onChoose={startWithType} />;
  }

  return (
    <div className="editor-shell">
      <aside className="settings-panel">
        <div className="tabs">
          <button
            className={tab === "general" ? "active" : ""}
            onClick={() => setTab("general")}
          >
            常规
          </button>
          <button
            className={tab === "content" ? "active" : ""}
            onClick={() => setTab("content")}
          >
            内容
          </button>
        </div>
        <div className="settings-scroll">
          {tab === "general" ? (
            <>
              <section className="settings-section">
                <h2>常规</h2>
                <div className="segments">
                  <button
                    className={config.display === "card" ? "active" : ""}
                    onClick={() => update("display", "card")}
                  >
                    卡片
                  </button>
                  <button
                    className={config.display === "list" ? "active" : ""}
                    onClick={() => update("display", "list")}
                  >
                    列表
                  </button>
                </div>
                {config.display === "card" && (
                  <>
                    <label className="field-label">对齐方式</label>
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
                    <label className="field-label">卡片类型</label>
                    <div className="segments">
                      <button
                        className={config.cardType === "text" ? "active" : ""}
                        onClick={() => update("cardType", "text")}
                      >
                        纯文本
                      </button>
                      <button
                        className={config.cardType === "icon" ? "active" : ""}
                        onClick={() => update("cardType", "icon")}
                      >
                        图标 + 文本
                      </button>
                      <button
                        className={config.cardType === "image" ? "active" : ""}
                        onClick={() => update("cardType", "image")}
                      >
                        图片 + 文本
                      </button>
                    </div>
                    <label className="field-label">列数</label>
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
                    <label className="field-label">悬浮效果</label>
                    <div className="select-frame">
                      <select
                        value={config.style}
                        onChange={(event) =>
                          update(
                            "style",
                            event.target.value as DynamicContentConfig["style"],
                          )
                        }
                      >
                        <option value="classic">无</option>
                        <option value="hover">悬浮抬升</option>
                        <option value="flip">翻转</option>
                      </select>
                    </div>
                    <label className="field-label">主色</label>
                    <div className="color-field">
                      <input
                        type="color"
                        value={config.accent}
                        onChange={(event) => update("accent", event.target.value)}
                      />
                      <input
                        value={config.accent}
                        onChange={(event) =>
                          update("accent", event.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </section>
              <section className="settings-section">
                <h2>图片</h2>
                <label className="field-label">图片系列</label>
                <div className="select-frame">
                  <select
                    value={config.background}
                    onChange={(event) =>
                      update(
                        "background",
                        event.target.value as DynamicContentConfig["background"],
                      )
                    }
                  >
                    <option value="none">无</option>
                    {BACKGROUND_OPTIONS.map((option) => (
                      <option value={option.key} key={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {config.display === "list" && config.background !== "none" && (
                  <small>列表模式下作为每条结果的图标。</small>
                )}
                {config.display === "card" && config.cardType === "image" && (
                  <>
                    {config.background === "none" && (
                      <small>请选择图片系列，卡片顶部将展示该系列图片。</small>
                    )}
                    <Range
                      label="图片高度"
                      value={config.imageHeight}
                      min={60}
                      max={260}
                      onChange={(value) => update("imageHeight", value)}
                    />
                    <label className="field-label">适应方式</label>
                    <div className="segments">
                      <button
                        className={config.imageFit === "cover" ? "active" : ""}
                        onClick={() => update("imageFit", "cover")}
                      >
                        覆盖
                      </button>
                      <button
                        className={config.imageFit === "contain" ? "active" : ""}
                        onClick={() => update("imageFit", "contain")}
                      >
                        完整显示
                      </button>
                    </div>
                  </>
                )}
              </section>
              <section className="settings-section">
                <h2>尺寸与外观</h2>
                <Range
                  label="卡片间距"
                  value={config.gap}
                  min={0}
                  max={40}
                  onChange={(value) => update("gap", value)}
                />
                <Range
                  label="内边距"
                  value={config.padding}
                  min={8}
                  max={48}
                  onChange={(value) => update("padding", value)}
                />
                <Range
                  label="圆角"
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
                  描边
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.shadow}
                    onChange={(event) => update("shadow", event.target.checked)}
                  />
                  阴影
                </label>
              </section>
              <section className="settings-section">
                <h2>内容信息</h2>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.showExcerpt}
                    onChange={(event) =>
                      update("showExcerpt", event.target.checked)
                    }
                  />
                  显示摘要
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.showMeta}
                    onChange={(event) =>
                      update("showMeta", event.target.checked)
                    }
                  />
                  显示空间与更新时间
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.showCreator}
                    onChange={(event) =>
                      update("showCreator", event.target.checked)
                    }
                  />
                  显示创建人
                </label>
              </section>
            </>
          ) : (
            <>
              {isSpaceMode ? (
                <section className="settings-section">
                  <h2>过滤条件</h2>
                  <label className="field-label">关键词</label>
                  <input
                    type="search"
                    value={config.spaceFilters.keywords}
                    onChange={(event) => handleSpaceKeyword(event.target.value)}
                    placeholder="按空间名称搜索"
                  />
                  <label className="field-label">可见范围</label>
                  <div className="select-frame">
                    <select
                      value={config.spaceFilters.scopeType}
                      onChange={(event) =>
                        handleSpaceScopeType(event.target.value as SpaceScopeType)
                      }
                    >
                      <option value="all">全部范围</option>
                      <option value="organization">企业可见</option>
                      <option value="user_group">团队可见</option>
                      <option value="user">用户可见</option>
                    </select>
                  </div>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={config.spaceFilters.includeArchived}
                      onChange={(event) =>
                        handleIncludeArchived(event.target.checked)
                      }
                    />
                    包含已归档空间
                  </label>
                </section>
              ) : (
                <section className="settings-section">
                  <h2>过滤条件</h2>
                  <label className="field-label">空间</label>
                  <div className="combobox">
                    <input
                      type="text"
                      value={spaceComboboxOpen ? spaceQuery : selectedSpaceName}
                      onFocus={() => {
                        setSpaceQuery(selectedSpaceName);
                        setSpaceComboboxOpen(true);
                      }}
                      onChange={(event) => handleSpaceQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !spaceOptionsLoading) {
                          const first = spaceOptions[0];
                          if (first) handlePageSpace(first.id);
                        }
                        if (event.key === "Escape") {
                          setSpaceComboboxOpen(false);
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(
                          () => setSpaceComboboxOpen(false),
                          150,
                        );
                      }}
                      placeholder="搜索空间名称"
                    />
                    {spaceComboboxOpen && (
                      <div className="combobox-list" role="listbox">
                        <button
                          type="button"
                          className={
                            config.pageFilters.spaceId ? "" : "active"
                          }
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handlePageSpace("");
                          }}
                        >
                          全部空间
                        </button>
                        {spaceOptionsLoading ? (
                          <div className="combobox-state">正在加载空间…</div>
                        ) : spaceOptions.length ? (
                          spaceOptions.map((space) => (
                            <button
                              key={space.id}
                              type="button"
                              className={
                                config.pageFilters.spaceId === space.id
                                  ? "active"
                                  : ""
                              }
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handlePageSpace(space.id);
                              }}
                            >
                              {spaceLabel(space)}
                            </button>
                          ))
                        ) : (
                          <div className="combobox-state">没有匹配的空间</div>
                        )}
                      </div>
                    )}
                  </div>
                  <label className="field-label">定位页面</label>
                  <div className="select-frame">
                    <select
                      value={config.pageFilters.relation}
                      onChange={(event) =>
                        handlePageRelation(event.target.value as PageRelation)
                      }
                    >
                      <option value="none">不限</option>
                      <option value="parent">某页面的直接子页面</option>
                      <option value="ancestor">某页面的所有子孙页面</option>
                    </select>
                  </div>
                  {config.pageFilters.relation !== "none" && (
                    <div className="reference-box">
                      <div>
                        <span>参照页面</span>
                        <strong>{referencePage?.name || "未选择"}</strong>
                      </div>
                      <div className="reference-actions">
                        <button type="button" onClick={beginReferencePick}>
                          {referencePage ? "重新选择" : "选择"}
                        </button>
                        {referencePage && (
                          <button type="button" onClick={clearReference}>
                            清除
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}
              <section className="settings-section">
                <h2>排序与分页</h2>
                <label className="field-label">排序</label>
                <div className="select-frame">
                  <select
                    value={config.sort}
                    onChange={(event) =>
                      update(
                        "sort",
                        event.target.value as DynamicContentConfig["sort"],
                      )
                    }
                  >
                    <option value="updated_desc">最近更新</option>
                    <option value="created_desc">最新创建</option>
                    <option value="title_asc">标题 A-Z</option>
                  </select>
                </div>
                <label className="field-label">每页条数</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={config.limit}
                  onChange={(event) =>
                    update(
                      "limit",
                      Math.min(24, Math.max(1, Number(event.target.value) || 1)),
                    )
                  }
                />
              </section>
            </>
          )}
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-heading">
          <span>{pickingReference ? "选择参照页面" : "预览"}</span>
          <span className="preview-meta">
            {!pickingReference && resultError && displayItems.length > 0 && (
              <button
                className="text-button warn"
                type="button"
                onClick={() => void syncResultsWithRetry(config)}
              >
                同步失败，重试
              </button>
            )}
            {pickingReference
              ? pickLoading
                ? "加载中…"
                : `共 ${pickTotal} 个页面`
              : resultLoading
                ? "加载中…"
                : resultError
                  ? displayItems.length
                    ? "显示已保存内容"
                    : "加载失败"
                  : `共 ${resultTotal} 条`}
            {pickingReference ? (
              <button
                className="text-button"
                type="button"
                onClick={() => setPickingReference(false)}
              >
                取消
              </button>
            ) : (
              <button
                className="icon-button"
                type="button"
                aria-label="刷新"
                title="刷新"
                disabled={resultLoading}
                onClick={() => void loadResults(0, config, true)}
              >
                <RefreshCw className={resultLoading ? "spin" : ""} size={15} />
              </button>
            )}
          </span>
        </div>
        <div className="preview-canvas">
          {pickingReference ? (
            <div className="preview-content pick-list">
              <label className="picker-search">
                <Search size={16} />
                <input
                  type="search"
                  value={pageKeyword}
                  onChange={(event) => setPageKeyword(event.target.value)}
                  placeholder="在当前页结果中按名称筛选"
                />
              </label>
              {pickLoading ? (
                <div className="preview-empty">
                  <LoaderCircle className="spin" size={18} />
                  <span>正在加载页面列表</span>
                </div>
              ) : pickError ? (
                <div className="preview-empty error">{pickError}</div>
              ) : filteredPageList.length ? (
                <div className="page-list">
                  {filteredPageList.map((page) => (
                    <button
                      type="button"
                      className={`page-option${
                        referencePage?.id === page.id ? " selected" : ""
                      }`}
                      key={page.id}
                      onClick={() => chooseReferencePage(page)}
                    >
                      <span className="page-icon">
                        <FileText size={16} />
                      </span>
                      <span className="page-copy">
                        <strong>{page.name}</strong>
                        <small>
                          {[page.spaceName, formatDate(page.updatedAt)]
                            .filter(Boolean)
                            .join(" · ") || page.id}
                        </small>
                      </span>
                      <ChevronRight size={15} className="page-arrow" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="preview-empty">没有符合条件的页面</div>
              )}
              <LoadMore
                loaded={pageList.length}
                total={pickTotal}
                pageSize={PICK_PAGE_SIZE}
                loading={pickLoading}
                onChange={() => void loadPickList(pickIndex + 1, true)}
              />
            </div>
          ) : (
            <div className="preview-content">
              {resultError && !displayItems.length ? (
                <div className="preview-empty error">
                  <span>{resultError}</span>
                  <div className="error-actions">
                    <button
                      type="button"
                      onClick={() => void loadResults(0, config, true)}
                    >
                      重试
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshSession()}
                    >
                      重新加载
                    </button>
                  </div>
                </div>
              ) : resultLoading && !displayItems.length ? (
                <div className="preview-empty">
                  <LoaderCircle className="spin" size={18} />
                  <span>正在加载动态内容</span>
                </div>
              ) : displayItems.length ? (
                <ContentGrid config={config} items={displayItems} />
              ) : (
                <div className="preview-empty">没有符合条件的内容</div>
              )}
              <LoadMore
                loaded={resultItems.length}
                total={resultTotal}
                pageSize={config.limit}
                loading={resultLoading}
                onChange={() =>
                  void loadResults(resultIndex + 1, config, true, true)
                }
              />
            </div>
          )}
        </div>
      </main>

      <footer className="editor-footer">
        {message && <span className="editor-error">{message}</span>}
        <button
          onClick={() => (hasNexusBridge() ? void view.close() : setMessage(""))}
        >
          取消
        </button>
        <button
          className="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </footer>
    </div>
  );
}

function ContentGrid({
  config,
  items,
  interactive = false,
}: {
  config: DynamicContentConfig;
  items: DynamicContentItem[];
  interactive?: boolean;
}) {
  const columns = Math.max(1, Math.min(config.columns, items.length || 1));
  return (
    <div
      className={`content-grid display-${config.display}`}
      style={{
        gridTemplateColumns:
          config.display === "list"
            ? "1fr"
            : `repeat(${columns}, minmax(0, 1fr))`,
        gap: config.gap,
      }}
    >
      {items.map((item) => (
        <ContentCard
          key={item.id}
          config={config}
          item={item}
          interactive={interactive}
        />
      ))}
    </div>
  );
}

function ContentCard({
  config,
  item,
  interactive,
}: {
  config: DynamicContentConfig;
  item: DynamicContentItem;
  interactive: boolean;
}) {
  const Icon = item.resourceType === "space" ? Layers : FileText;
  const href = resolveItemUrl(item, platformUrl);
  const isList = config.display === "list";
  const isImageCard = !isList && config.cardType === "image";
  const backgroundImage = pickBackgroundImage(config.background, item.id);
  const style = {
    borderRadius: config.radius,
    border: config.border ? "1px solid #e6e9f0" : "1px solid transparent",
    boxShadow: config.shadow ? "0 1px 3px rgba(25, 34, 51, .07)" : "none",
    textAlign: isList ? "left" : config.align,
    "--accent": config.accent,
  } as CSSProperties;
  const metaLines: string[] = [];
  if (config.showMeta) {
    if (item.resourceType === "page" && item.spaceName) {
      metaLines.push(item.spaceName);
    }
    if (item.resourceType === "space" && item.identifier) {
      metaLines.push(item.identifier);
    }
    const updated = formatDate(item.updatedAt);
    if (updated) metaLines.push(`更新于 ${updated}`);
  }
  if (config.showCreator && item.createdByName) {
    metaLines.push(`创建人 ${item.createdByName}`);
  }
  const metaNode =
    metaLines.length > 0 ? (
      <small className="card-meta">
        {metaLines.map((line, index) => (
          <span key={`${index}-${line}`}>{line}</span>
        ))}
      </small>
    ) : null;
  const showIcon = isList || config.cardType === "icon";

  const front = (
    <>
      {isImageCard && backgroundImage && (
        <div
          className="card-image"
          style={{
            height: config.imageHeight,
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: config.imageFit,
          }}
        />
      )}
      <div
        className="card-body"
        style={{
          padding: config.padding,
          alignItems: isList
            ? "center"
            : config.align === "left"
              ? "flex-start"
              : config.align === "right"
                ? "flex-end"
                : "center",
        }}
      >
        {showIcon && (
          <span
            className={`card-icon${isList && backgroundImage ? " has-image" : ""}`}
          >
            {isList && backgroundImage ? (
              <img src={backgroundImage} alt="" loading="lazy" />
            ) : (
              <Icon size={20} />
            )}
          </span>
        )}
        <span className="card-text">
          <strong>{item.name}</strong>
          {config.showExcerpt && item.description && <p>{item.description}</p>}
          {metaNode}
        </span>
      </div>
    </>
  );

  const flip = config.style === "flip" && !isList;

  return (
    <div
      className={`content-card effect-${config.style} display-${config.display}`}
      style={style}
    >
      {flip ? (
        <div className="card-flip-inner">
          <div className="card-face card-front">{front}</div>
          <div className="card-face card-back">
            <strong>{item.name}</strong>
            {item.description && <p>{item.description}</p>}
            {metaNode}
          </div>
        </div>
      ) : (
        front
      )}
      {interactive && href && (
        <button
          className="card-hit-area"
          type="button"
          aria-label={item.name}
          onClick={() => {
            // The extension frame is sandboxed without allow-popups, so
            // target="_blank" is blocked; let the host open the link instead.
            if (hasNexusBridge()) {
              void router.open(href).catch(() => undefined);
            } else {
              window.open(href, "_blank", "noopener,noreferrer");
            }
          }}
        />
      )}
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

function LoadMore({
  loaded,
  total,
  pageSize,
  loading,
  onChange,
}: {
  loaded: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onChange: () => void;
}) {
  if (total <= 0) return null;
  if (loaded >= total) {
    return total > pageSize ? (
      <div className="load-more">
        <span>已加载全部 {total} 条</span>
      </div>
    ) : null;
  }
  return (
    <div className="load-more">
      <button type="button" disabled={loading} onClick={onChange}>
        {loading ? "加载中…" : `加载更多（${loaded}/${total}）`}
      </button>
    </div>
  );
}

function SourceTypeChooser({
  onChoose,
}: {
  onChoose: (sourceType: "space" | "page") => void;
}) {
  return (
    <main className="chooser-shell">
      <header className="chooser-header">
        <h1>Myriad - Dynamic Content</h1>
        <p>选择动态内容的数据来源</p>
      </header>

      <div className="chooser-cards">
        <button
          className="chooser-card"
          type="button"
          onClick={() => onChoose("space")}
        >
          <span className="chooser-icon">
            <Layers size={20} />
          </span>
          <strong>空间</strong>
          <span className="chooser-copy">
            按过滤条件汇总空间，作为块内容展示，支持分页。
          </span>
          <span className="chooser-cta">
            开始配置
            <ChevronRight size={14} />
          </span>
        </button>
        <button
          className="chooser-card"
          type="button"
          onClick={() => onChoose("page")}
        >
          <span className="chooser-icon">
            <FileText size={20} />
          </span>
          <strong>页面</strong>
          <span className="chooser-copy">
            按空间和页面位置汇总页面，作为块内容展示，支持分页。
          </span>
          <span className="chooser-cta">
            开始配置
            <ChevronRight size={14} />
          </span>
        </button>
      </div>

      <p className="chooser-footnote">如需更换来源类型，请重新插入该块。</p>
      <button
        className="chooser-cancel"
        type="button"
        onClick={() => {
          if (hasNexusBridge()) void view.close();
        }}
      >
        取消
      </button>
    </main>
  );
}

function wikiSpacesPath(
  pageIndex: number,
  pageSize: number,
  filters?: SpaceFilters,
): string {
  const params = new URLSearchParams({
    page_index: String(pageIndex),
    page_size: String(pageSize),
  });
  if (filters) {
    const keywords = filters.keywords.trim();
    if (keywords) params.set("keywords", keywords);
    if (filters.scopeType !== "all") {
      params.set("scope_type", filters.scopeType);
    }
    if (filters.includeArchived) params.set("include_archived", "true");
  }
  return `/v2/wiki/spaces?${params.toString()}`;
}

function wikiPagesPath(
  pageIndex: number,
  pageSize: number,
  filters?: { spaceId?: string; parentId?: string; ancestorId?: string },
): string {
  const params = new URLSearchParams({
    page_index: String(pageIndex),
    page_size: String(pageSize),
  });
  if (filters?.spaceId) params.set("space_id", filters.spaceId);
  if (filters?.parentId) params.set("parent_id", filters.parentId);
  if (filters?.ancestorId) params.set("ancestor_id", filters.ancestorId);
  return `/v2/wiki/pages?${params.toString()}`;
}

/**
 * Calls PingCode REST through the host's REST gateway
 * (`/api/nexus/gateway/rest-api/invoke` behind `api.invoke`). The editor and
 * the saved block always load their data through this channel; no resolver
 * `invokeFunction` call is involved.
 */
async function restJson<TResult>(path: string, attempts = 3): Promise<TResult> {
  let lastError: unknown;
  let response: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await api.invoke(path);
      break;
    } catch (error) {
      lastError = error;
      console.warn(
        `[dynamic-content] REST ${path} 第 ${attempt + 1} 次失败`,
        error,
      );
      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 600 * (attempt + 1)),
        );
      }
    }
  }
  if (!response) throw lastError;
  if (!response.ok) {
    let message = `接口请求失败 (${response.status})`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      message = String(payload["message"] ?? payload["error"] ?? message);
    } catch {
      // Keep the default message when the body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as TResult;
}

let lastRequestFailure: unknown = null;

async function refreshSession(): Promise<void> {
  // Ask the host to recreate the view, which re-mints the context token and
  // re-establishes the connection.
  if (hasNexusBridge()) {
    try {
      await view.refresh();
      return;
    } catch {
      // The view is not refreshable — fall back to reloading the document.
    }
  }
  window.location.reload();
}

function spaceLabel(space: WikiSpace): string {
  return space.name || space.identifier || space.id;
}

function paginate<T>(values: T[], pageIndex: number, pageSize: number): T[] {
  const start = Math.max(0, pageIndex) * pageSize;
  return values.slice(start, start + pageSize);
}

function mergeById<T extends { id: string }>(
  current: T[],
  next: T[],
  append: boolean,
): T[] {
  if (!append) return next;
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

function mockResults(
  targetConfig: DynamicContentConfig,
  pageIndex: number,
): { items: DynamicContentItem[]; total: number } {
  if (targetConfig.sourceType === "page") {
    const spaceName = MOCK_SPACES.find(
      (space) => space.id === targetConfig.pageFilters.spaceId,
    )?.name;
    const all = spaceName
      ? MOCK_PAGES.filter((page) => page.spaceName === spaceName)
      : MOCK_PAGES;
    const sorted = sortItems(all, targetConfig.sort);
    return {
      items: paginate(sorted, pageIndex, targetConfig.limit),
      total: sorted.length,
    };
  }
  const spaces = filterMockSpaces(targetConfig.spaceFilters)
    .map((space) => normalizeSpaceItem(space))
    .filter((item): item is DynamicContentItem => item !== null);
  const sorted = sortItems(spaces, targetConfig.sort);
  return {
    items: paginate(sorted, pageIndex, targetConfig.limit),
    total: sorted.length,
  };
}

function filterMockSpaces(filters: SpaceFilters): WikiSpace[] {
  const keyword = filters.keywords.trim().toLocaleLowerCase();
  return MOCK_SPACES.filter((space) => {
    if (!filters.includeArchived && space.isArchived) return false;
    if (filters.scopeType !== "all" && space.scopeType !== filters.scopeType) {
      return false;
    }
    if (keyword) {
      const label = `${space.name ?? ""} ${space.identifier ?? ""}`.toLocaleLowerCase();
      if (!label.includes(keyword)) return false;
    }
    return true;
  });
}

function filterMockPages(filters: PageFilters): WikiPageRef[] {
  if (!filters.spaceId) return MOCK_PAGE_REFS;
  const space = MOCK_SPACES.find((item) => item.id === filters.spaceId);
  if (!space) return MOCK_PAGE_REFS;
  return MOCK_PAGE_REFS.filter((page) => page.spaceName === space.name);
}

function sortItems(
  items: DynamicContentItem[],
  sort: DynamicContentConfig["sort"],
): DynamicContentItem[] {
  return [...items].sort((left, right) => {
    if (sort === "title_asc") return left.name.localeCompare(right.name, "zh-CN");
    if (sort === "created_desc") return right.createdAt - left.createdAt;
    return right.updatedAt - left.updatedAt;
  });
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp,
  );
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
