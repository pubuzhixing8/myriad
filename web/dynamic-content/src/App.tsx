import { useEffect, useMemo, useRef, useState } from "react";
import {
  events,
  hasNexusBridge,
  invoke,
  view,
  type Subscription,
} from "@pc-nexus/bridge";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Layers,
  List,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import {
  DEFAULT_DYNAMIC_CONTENT_CONFIG,
  MOCK_PAGES,
  MOCK_PAGE_REFS,
  MOCK_SPACES,
  normalizeDynamicContentConfig,
  normalizePageItem,
  normalizePageRef,
  normalizeSpace,
  normalizeSpaceItem,
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
const SPACE_OPTION_PAGE_SIZE = 20;

interface WikiPagesResponse {
  page_index?: number;
  total?: number;
  values?: unknown[];
}

interface ExtensionData {
  config?: unknown;
  entry?: { mode?: "view" | "edit" };
}

interface ListSpacesPayload {
  pageIndex: number;
  pageSize: number;
  keywords?: string;
  scopeType?: string;
  includeArchived?: boolean;
}

interface ListPagesPayload {
  pageIndex: number;
  pageSize: number;
  spaceId?: string;
  parentId?: string;
  ancestorId?: string;
}

export default function App() {
  const initialized = useRef(false);
  const keywordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [step, setStep] = useState<"choose" | "configure">("configure");
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
  const [spaceOptionsIndex, setSpaceOptionsIndex] = useState(0);
  const [spaceOptionsTotal, setSpaceOptionsTotal] = useState(0);
  const [spaceOptionsLoading, setSpaceOptionsLoading] = useState(false);

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
        if (nextMode === "edit") await loadSpaceOptions(0);
        setLoading(false);
        return;
      }

      try {
        const context = await view.getContext<ExtensionData>();
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
            await Promise.all([
              loadResults(0, nextConfig, false),
              nextConfig.sourceType === "page"
                ? loadSpaceOptions(0)
                : Promise.resolve(),
            ]);
          }
        } else {
          await loadResults(0, nextConfig, false);
          subscription = await events.on<{ config?: unknown }>(
            CONFIG_CHANGED_EVENT,
            (payload) => {
              void (async () => {
                const changedConfig = normalizeDynamicContentConfig(
                  payload?.config,
                );
                setConfig(changedConfig);
                syncReferencePage(changedConfig);
                await loadResults(0, changedConfig, false);
              })();
            },
          );
          requestAnimationFrame(
            () => void view.emitReadyEvent().catch(() => undefined),
          );
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "动态内容加载失败");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
    return () => {
      subscription?.unsubscribe();
      if (keywordTimer.current) clearTimeout(keywordTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSpaceMode = config.sourceType === "space";
  const pageSize = config.limit;
  const displayItems = resultItems.length ? resultItems : config.items;
  const filteredPageList = useMemo(() => {
    const keyword = pageKeyword.trim().toLocaleLowerCase();
    if (!keyword) return pageList;
    return pageList.filter((page) =>
      page.name.toLocaleLowerCase().includes(keyword),
    );
  }, [pageKeyword, pageList]);

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

  function patchDisplay(patch: Partial<DynamicContentConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    if ("sort" in patch || "limit" in patch) {
      void loadResults(0, next, false);
    }
  }

  async function loadResults(
    pageIndex: number,
    targetConfig: DynamicContentConfig,
    reportErrors = true,
  ): Promise<DynamicContentItem[]> {
    const target = Math.max(0, pageIndex);
    setResultLoading(true);
    if (reportErrors) setMessage("");

    try {
      if (!hasNexusBridge()) {
        const { items, total } = mockResults(targetConfig, target);
        setResultItems(items);
        setResultIndex(target);
        setResultTotal(total);
        setResultError("");
        return items;
      }

      let result: WikiPagesResponse = { values: [] };
      if (targetConfig.sourceType === "space") {
        result = await invoke<ListSpacesPayload, WikiPagesResponse>(
          "listWikiSpaces",
          {
            pageIndex: target,
            pageSize: targetConfig.limit,
            keywords: targetConfig.spaceFilters.keywords.trim() || undefined,
            scopeType:
              targetConfig.spaceFilters.scopeType === "all"
                ? undefined
                : targetConfig.spaceFilters.scopeType,
            includeArchived:
              targetConfig.spaceFilters.includeArchived || undefined,
          },
        );
      } else {
        const filters = targetConfig.pageFilters;
        result = await invoke<ListPagesPayload, WikiPagesResponse>(
          "listWikiPages",
          {
            pageIndex: target,
            pageSize: targetConfig.limit,
            spaceId: filters.spaceId || undefined,
            parentId:
              filters.relation === "parent"
                ? filters.relationPageId || undefined
                : undefined,
            ancestorId:
              filters.relation === "ancestor"
                ? filters.relationPageId || undefined
                : undefined,
          },
        );
      }

      const items = (Array.isArray(result.values) ? result.values : [])
        .map((value) =>
          targetConfig.sourceType === "space"
            ? normalizeSpaceItem(value)
            : normalizePageItem(value),
        )
        .filter((item): item is DynamicContentItem => item !== null);
      const sorted = sortItems(items, targetConfig.sort);
      setResultItems(sorted);
      setResultIndex(Number(result.page_index ?? target));
      setResultTotal(Number(result.total ?? 0));
      setResultError("");
      return sorted;
    } catch (error) {
      setResultItems([]);
      setResultIndex(target);
      setResultTotal(0);
      setResultError(error instanceof Error ? error.message : "动态内容加载失败");
      if (reportErrors) {
        setMessage(error instanceof Error ? error.message : "动态内容加载失败");
      }
      return [];
    } finally {
      setResultLoading(false);
    }
  }

  async function loadPickList(pageIndex: number) {
    const target = Math.max(0, pageIndex);
    setPickLoading(true);
    setPickError("");
    try {
      if (!hasNexusBridge()) {
        const filtered = filterMockPages(config.pageFilters);
        setPageList(paginate(filtered, target, PICK_PAGE_SIZE));
        setPickIndex(target);
        setPickTotal(filtered.length);
        return;
      }
      const result = await invoke<ListPagesPayload, WikiPagesResponse>(
        "listWikiPages",
        {
          pageIndex: target,
          pageSize: PICK_PAGE_SIZE,
          spaceId: config.pageFilters.spaceId || undefined,
        },
      );
      setPageList(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizePageRef)
          .filter((page): page is WikiPageRef => page !== null),
      );
      setPickIndex(Number(result.page_index ?? target));
      setPickTotal(Number(result.total ?? 0));
    } catch (error) {
      setPageList([]);
      setPickIndex(target);
      setPickTotal(0);
      setPickError(error instanceof Error ? error.message : "页面列表加载失败");
    } finally {
      setPickLoading(false);
    }
  }

  async function loadSpaceOptions(pageIndex: number) {
    const target = Math.max(0, pageIndex);
    setSpaceOptionsLoading(true);
    try {
      if (!hasNexusBridge()) {
        setSpaceOptions(paginate(MOCK_SPACES, target, SPACE_OPTION_PAGE_SIZE));
        setSpaceOptionsIndex(target);
        setSpaceOptionsTotal(MOCK_SPACES.length);
        return;
      }
      const result = await invoke<ListSpacesPayload, WikiPagesResponse>(
        "listWikiSpaces",
        { pageIndex: target, pageSize: SPACE_OPTION_PAGE_SIZE },
      );
      setSpaceOptions(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizeSpace)
          .filter((space): space is WikiSpace => space !== null),
      );
      setSpaceOptionsIndex(Number(result.page_index ?? target));
      setSpaceOptionsTotal(Number(result.total ?? 0));
    } catch {
      setSpaceOptions([]);
      setSpaceOptionsTotal(0);
    } finally {
      setSpaceOptionsLoading(false);
    }
  }

  function startWithType(sourceType: "space" | "page") {
    if (keywordTimer.current) clearTimeout(keywordTimer.current);
    const next: DynamicContentConfig = { ...config, sourceType };
    setConfig(next);
    setStep("configure");
    setPickingReference(false);
    setPageKeyword("");
    setMessage("");
    void loadResults(0, next);
    if (sourceType === "page") void loadSpaceOptions(spaceOptionsIndex);
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
    const next = {
      ...config,
      pageFilters: {
        ...config.pageFilters,
        spaceId,
        spaceName: selected?.name ?? "",
        relationPageId: "",
        relationPageName: "",
      },
    };
    setConfig(next);
    setReferencePage(null);
    setPickingReference(false);
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

  function cancelReferencePick() {
    setPickingReference(false);
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
      const latestItems = await loadResults(resultIndex, config, true);
      const nextConfig = {
        ...config,
        items: latestItems.length ? latestItems : config.items,
      };
      setConfig(nextConfig);
      if (hasNexusBridge()) {
        await view.submit({ config: nextConfig, body: [{ id: "content" }] });
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
        <LoaderCircle />
        <span>正在加载动态内容</span>
      </div>
    );
  }

  if (mode === "view") {
    return (
      <div className="view-shell">
        {resultLoading && !displayItems.length ? (
          <div className="empty-state">正在加载动态内容</div>
        ) : (
          <DynamicContentView config={config} items={displayItems} />
        )}
        <Pagination
          index={resultIndex}
          total={resultTotal}
          pageSize={pageSize}
          loading={resultLoading}
          onChange={(pageIndex) => void loadResults(pageIndex, config, false)}
        />
      </div>
    );
  }

  if (step === "choose" || config.sourceType === null) {
    return <SourceTypeChooser onChoose={startWithType} />;
  }

  return (
    <main className="editor-shell">
      <aside className="settings-panel">
        <div className="settings-body">
          {isSpaceMode ? (
            <section className="filter-section" aria-label="空间过滤条件">
              <div className="section-heading compact">
                <h2>过滤条件</h2>
                <p>按名称、可见范围筛选空间，结果即块内容。</p>
              </div>
              <label className="field">
                <span>关键词</span>
                <span className="input-with-icon">
                  <Search aria-hidden="true" />
                  <input
                    type="search"
                    value={config.spaceFilters.keywords}
                    onChange={(event) => handleSpaceKeyword(event.target.value)}
                    placeholder="按空间名称搜索"
                  />
                </span>
              </label>
              <label className="field">
                <span>可见范围</span>
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
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={config.spaceFilters.includeArchived}
                  onChange={(event) =>
                    handleIncludeArchived(event.target.checked)
                  }
                />
                <span>包含已归档空间</span>
              </label>
            </section>
          ) : (
            <section className="filter-section" aria-label="页面过滤条件">
              <div className="section-heading compact">
                <h2>过滤条件</h2>
                <p>按空间和页面位置筛选页面，结果即块内容。</p>
              </div>
              <label className="field">
                <span>空间</span>
                <select
                  value={config.pageFilters.spaceId}
                  disabled={spaceOptionsLoading}
                  onChange={(event) => handlePageSpace(event.target.value)}
                >
                  <option value="">全部空间</option>
                  {config.pageFilters.spaceId &&
                    !spaceOptions.some(
                      (space) => space.id === config.pageFilters.spaceId,
                    ) && (
                      <option value={config.pageFilters.spaceId}>
                        {config.pageFilters.spaceName ||
                          config.pageFilters.spaceId}
                      </option>
                    )}
                  {spaceOptions.map((space) => (
                    <option value={space.id} key={space.id}>
                      {spaceLabel(space)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-pagination" aria-label="空间选项分页">
                <button
                  className="icon-button"
                  type="button"
                  aria-label="上一页空间"
                  disabled={spaceOptionsLoading || spaceOptionsIndex <= 0}
                  onClick={() => void loadSpaceOptions(spaceOptionsIndex - 1)}
                >
                  <ChevronLeft />
                </button>
                <span>
                  {spaceOptionsIndex + 1} /{" "}
                  {Math.max(
                    1,
                    Math.ceil(spaceOptionsTotal / SPACE_OPTION_PAGE_SIZE),
                  )}{" "}
                  · {spaceOptionsTotal} 个空间
                </span>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="下一页空间"
                  disabled={
                    spaceOptionsLoading ||
                    spaceOptionsIndex + 1 >=
                      Math.ceil(spaceOptionsTotal / SPACE_OPTION_PAGE_SIZE)
                  }
                  onClick={() => void loadSpaceOptions(spaceOptionsIndex + 1)}
                >
                  <ChevronRight />
                </button>
              </div>
              <label className="field">
                <span>定位页面</span>
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
              </label>
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

          <div className="section-divider" />

          <section className="display-section" aria-label="展示设置">
            <div className="section-heading compact">
              <h2>展示设置</h2>
              <p>{querySummary(config)}</p>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>展示</span>
                <select
                  value={config.display}
                  onChange={(event) =>
                    patchDisplay({
                      display: event.target
                        .value as DynamicContentConfig["display"],
                    })
                  }
                >
                  <option value="card">卡片</option>
                  <option value="list">列表</option>
                </select>
              </label>
              <label className="field">
                <span>列数</span>
                <select
                  value={config.columns}
                  onChange={(event) =>
                    patchDisplay({
                      columns: Number(event.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>1 列</option>
                  <option value={2}>2 列</option>
                  <option value={3}>3 列</option>
                </select>
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>排序</span>
                <select
                  value={config.sort}
                  onChange={(event) =>
                    patchDisplay({
                      sort: event.target
                        .value as DynamicContentConfig["sort"],
                    })
                  }
                >
                  <option value="updated_desc">最近更新</option>
                  <option value="created_desc">最新创建</option>
                  <option value="title_asc">标题 A-Z</option>
                </select>
              </label>
              <label className="field">
                <span>每页条数</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={config.limit}
                  onChange={(event) =>
                    patchDisplay({
                      limit: Math.min(
                        24,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    })
                  }
                />
              </label>
            </div>
            <label className="check-field">
              <input
                type="checkbox"
                checked={config.showExcerpt}
                onChange={(event) =>
                  patchDisplay({ showExcerpt: event.target.checked })
                }
              />
              <span>显示摘要</span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={config.showMeta}
                onChange={(event) =>
                  patchDisplay({ showMeta: event.target.checked })
                }
              />
              <span>显示空间与更新时间</span>
            </label>
          </section>
        </div>
      </aside>

      <section className="browser-panel" aria-label="动态内容结果">
        <header className="browser-header">
          <div className="browser-heading">
            <h2>{pickingReference ? "选择参照页面" : "结果预览"}</h2>
            <p>
              {(pickingReference ? pickLoading : resultLoading)
                ? "正在加载"
                : pickingReference
                  ? `共 ${pickTotal} 个页面`
                  : `共 ${resultTotal} 条${isSpaceMode ? "空间" : "页面"}`}
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="刷新"
            title="刷新"
            disabled={pickingReference ? pickLoading : resultLoading}
            onClick={() =>
              pickingReference
                ? void loadPickList(pickIndex)
                : void loadResults(resultIndex, config, true)
            }
          >
            <RefreshCw
              className={(pickingReference ? pickLoading : resultLoading) ? "spin" : ""}
            />
          </button>
        </header>

        {pickingReference && (
          <div className="pick-banner" role="status">
            <span>
              请选择作为
              {config.pageFilters.relation === "parent" ? "父页面" : "祖先页面"}
              的页面
            </span>
            <button type="button" onClick={cancelReferencePick}>
              取消
            </button>
          </div>
        )}

        <div className="browser-body">
          {pickingReference ? (
            <>
              <label className="search-field">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={pageKeyword}
                  onChange={(event) => setPageKeyword(event.target.value)}
                  placeholder="在当前页结果中按名称筛选"
                />
              </label>
              {pickLoading ? (
                <div className="list-state" role="status">
                  <LoaderCircle className="spin" />
                  <span>正在加载页面列表</span>
                </div>
              ) : pickError ? (
                <div className="list-state error">{pickError}</div>
              ) : filteredPageList.length ? (
                <div className="source-list">
                  {filteredPageList.map((page) => (
                    <button
                      type="button"
                      className={`source-row${
                        referencePage?.id === page.id ? " selected" : ""
                      }`}
                      key={page.id}
                      onClick={() => chooseReferencePage(page)}
                    >
                      <span className="row-icon">
                        <FileText />
                      </span>
                      <span className="row-copy">
                        <span className="row-title">{page.name}</span>
                        <small>
                          {[page.spaceName, formatDate(page.updatedAt)]
                            .filter(Boolean)
                            .join(" · ") || page.id}
                        </small>
                      </span>
                      <span className="row-state">
                        <ChevronRight aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="list-state">没有符合条件的页面</div>
              )}
              <Pagination
                index={pickIndex}
                total={pickTotal}
                pageSize={PICK_PAGE_SIZE}
                loading={pickLoading}
                onChange={(pageIndex) => void loadPickList(pageIndex)}
              />
            </>
          ) : resultError && !displayItems.length ? (
            <div className="list-state error">
              <span>{resultError}</span>
              <button
                className="retry-button"
                type="button"
                onClick={() => void loadResults(resultIndex, config, true)}
              >
                重试
              </button>
            </div>
          ) : resultLoading && !displayItems.length ? (
            <div className="list-state" role="status">
              <LoaderCircle className="spin" />
              <span>正在加载动态内容</span>
            </div>
          ) : (
            <>
              <div className="preview-wrap">
                <DynamicContentView
                  config={config}
                  items={displayItems}
                  editable
                />
              </div>
              <Pagination
                index={resultIndex}
                total={resultTotal}
                pageSize={pageSize}
                loading={resultLoading}
                onChange={(pageIndex) =>
                  void loadResults(pageIndex, config, false)
                }
              />
            </>
          )}
        </div>

        <footer className="editor-footer">
          {message && <span className="message">{message}</span>}
          <button
            className="cancel-button"
            type="button"
            onClick={() => (hasNexusBridge() ? void view.close() : setMessage(""))}
          >
            取消
          </button>
          <button
            className="save-button"
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            <Save />
            <span>{saving ? "保存中" : "保存"}</span>
          </button>
        </footer>
      </section>
    </main>
  );
}

function Pagination({
  index,
  total,
  pageSize,
  loading,
  onChange,
}: {
  index: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onChange: (pageIndex: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="list-pagination" aria-label="结果分页">
      <button
        className="icon-button"
        type="button"
        aria-label="上一页"
        disabled={loading || index <= 0}
        onClick={() => onChange(index - 1)}
      >
        <ChevronLeft />
      </button>
      <span>
        第 {Math.min(index + 1, pageCount)} / {pageCount} 页 · 共 {total} 条
      </span>
      <button
        className="icon-button"
        type="button"
        aria-label="下一页"
        disabled={loading || index + 1 >= pageCount}
        onClick={() => onChange(index + 1)}
      >
        <ChevronRight />
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
        <span className="brand-mark">
          <Layers />
        </span>
        <div>
          <h1>Myriad - Dynamic Content</h1>
          <p>选择动态内容的数据来源</p>
        </div>
      </header>

      <div className="chooser-cards">
        <button
          className="chooser-card"
          type="button"
          onClick={() => onChoose("space")}
        >
          <span className="chooser-icon">
            <Layers />
          </span>
          <strong>空间</strong>
          <span className="chooser-copy">
            按过滤条件汇总空间，作为块内容展示，支持分页。
          </span>
          <span className="chooser-cta">
            开始配置
            <ChevronRight />
          </span>
        </button>
        <button
          className="chooser-card"
          type="button"
          onClick={() => onChoose("page")}
        >
          <span className="chooser-icon">
            <FileText />
          </span>
          <strong>页面</strong>
          <span className="chooser-copy">
            按空间和页面位置汇总页面，作为块内容展示，支持分页。
          </span>
          <span className="chooser-cta">
            开始配置
            <ChevronRight />
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

function DynamicContentView({
  config,
  items,
  editable = false,
}: {
  config: DynamicContentConfig;
  items: DynamicContentItem[];
  editable?: boolean;
}) {
  return (
    <section
      className={`dynamic-content display-${config.display} columns-${config.columns}`}
    >
      {items.length ? (
        <div className="content-grid">
          {items.map((item) => (
            <ContentCard config={config} item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {editable ? "没有符合条件的内容" : "暂无动态内容"}
        </div>
      )}
    </section>
  );
}

function ContentCard({
  config,
  item,
}: {
  config: DynamicContentConfig;
  item: DynamicContentItem;
}) {
  const meta = [
    item.resourceType === "space" ? item.identifier : item.spaceName,
    formatDate(item.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");

  const content = (
    <>
      <span className="item-icon">
        {item.resourceType === "space" ? (
          <Layers />
        ) : config.display === "list" ? (
          <List />
        ) : (
          <FileText />
        )}
      </span>
      <span className="item-copy">
        <strong>{item.name}</strong>
        {config.showExcerpt && item.description && (
          <span>{item.description}</span>
        )}
        {config.showMeta && meta && <small>{meta}</small>}
      </span>
      {item.htmlUrl && item.htmlUrl !== "#" && (
        <span className="item-link" aria-hidden="true">
          <ExternalLink />
        </span>
      )}
    </>
  );

  return item.htmlUrl && item.htmlUrl !== "#" ? (
    <a
      className="content-item"
      href={item.htmlUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <article className="content-item">{content}</article>
  );
}

function spaceLabel(space: WikiSpace): string {
  return space.name || space.identifier || space.id;
}

function scopeLabel(scopeType: SpaceScopeType): string {
  if (scopeType === "organization") return "企业可见";
  if (scopeType === "user_group") return "团队可见";
  if (scopeType === "user") return "用户可见";
  return "全部范围";
}

function querySummary(config: DynamicContentConfig): string {
  if (config.sourceType === "space") {
    const parts = [scopeLabel(config.spaceFilters.scopeType)];
    const keywords = config.spaceFilters.keywords.trim();
    if (keywords) parts.push(`关键词“${keywords}”`);
    if (config.spaceFilters.includeArchived) parts.push("含已归档");
    return `空间 · ${parts.join(" · ")}`;
  }
  const parts = [config.pageFilters.spaceName || "全部空间"];
  if (config.pageFilters.relation !== "none") {
    const relationLabel =
      config.pageFilters.relation === "parent" ? "直接子页面" : "所有子孙页面";
    parts.push(
      config.pageFilters.relationPageName
        ? `${config.pageFilters.relationPageName} 的${relationLabel}`
        : relationLabel,
    );
  } else {
    parts.push("全部页面");
  }
  return `页面 · ${parts.join(" · ")}`;
}

function paginate<T>(values: T[], pageIndex: number, pageSize: number): T[] {
  const start = Math.max(0, pageIndex) * pageSize;
  return values.slice(start, start + pageSize);
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
