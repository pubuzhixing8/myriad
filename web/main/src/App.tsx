import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { events, hasNexusBridge, invoke, router, view, type Subscription } from '@pc-nexus/bridge'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Columns3,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Square,
  Type,
  X,
} from 'lucide-react'
import { DEFAULT_BUTTON, ICONFONT_ICONS, iconfontUrl, safeHref, TEMPLATES, type ButtonConfig, type ButtonShape, type ButtonSize, type ButtonShadow } from './button-catalog'
import './app.css'
import './style.css'

const CONFIG_CHANGED_EVENT = 'NEXUS_EXTENSION_DATA_CONFIG_CHANGED'
const PAGE_SIZE = 10
const MAX_PAGES = 12

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=82',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=82',
  'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=82',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=82',
]

type Alignment = 'left' | 'center' | 'right'
type CardType = 'text' | 'link' | 'image'
type Columns = 1 | 2 | 3
type HoverEffect = 'elevate' | 'outline' | 'none'

interface WikiSpace {
  id: string
  identifier?: string
  name?: string
}

interface WikiPage {
  id: string
  name: string
  description: string
  htmlUrl: string
  type: string
  updatedAt: number
  spaceName: string
  coverUrl: string
}

interface CardsConfig {
  alignment: Alignment
  cardType: CardType
  columns: Columns
  hoverEffect: HoverEffect
  pages: WikiPage[]
}

interface WikiPagesResponse {
  page_index?: number
  total?: number
  values?: unknown[]
}

interface ExtensionData {
  config?: unknown
  space?: WikiSpace
  entry?: { mode?: 'view' | 'edit' }
}

const DEFAULT_CONFIG: CardsConfig = {
  alignment: 'left',
  cardType: 'text',
  columns: 3,
  hoverEffect: 'elevate',
  pages: [],
}

const MOCK_PAGES: WikiPage[] = [
  mockPage('welcome', 'Myriad - Cards', 'Replace this text with your own content', 0),
  mockPage('roadmap', '产品路线图', '查看本季度目标、里程碑和交付计划', 1),
  mockPage('guide', '团队协作指南', '了解项目协作规范和常用工作流程', 2),
  mockPage('release', '发布检查清单', '发布前需要完成的检查与确认事项', 3),
  mockPage('research', '用户研究记录', '汇总访谈洞察与待验证的产品假设', 1),
  mockPage('decisions', '关键决策记录', '追踪方案选择、背景信息和后续影响', 0),
]

function mockPage(id: string, name: string, description: string, cover: number): WikiPage {
  return {
    id,
    name,
    description,
    htmlUrl: '#',
    type: 'page',
    updatedAt: Date.now(),
    spaceName: 'Myriad Wiki',
    coverUrl: FALLBACK_COVERS[cover] ?? FALLBACK_COVERS[0],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textFrom(value: unknown): string {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim()
}

function normalizePage(value: unknown, index = 0): WikiPage | null {
  if (!isRecord(value)) return null
  const id = String(value['id'] ?? '').trim()
  if (!id) return null
  const space = isRecord(value['space']) ? value['space'] : {}
  const cover = isRecord(value['cover']) ? value['cover'] : {}
  const description = textFrom(
    value['description'] ?? value['excerpt'] ?? value['summary'] ?? '打开页面查看完整内容',
  )

  return {
    id,
    name: String(value['name'] ?? value['title'] ?? '未命名页面'),
    description: description || '打开页面查看完整内容',
    htmlUrl: String(value['htmlUrl'] ?? value['html_url'] ?? value['url'] ?? ''),
    type: String(value['type'] ?? 'page'),
    updatedAt: Number(value['updatedAt'] ?? value['updated_at'] ?? 0),
    spaceName: String(value['spaceName'] ?? space['name'] ?? ''),
    coverUrl: String(
      value['coverUrl'] ?? value['cover_url'] ?? cover['url'] ??
      FALLBACK_COVERS[index % FALLBACK_COVERS.length],
    ),
  }
}

function normalizeSpace(value: unknown): WikiSpace | null {
  if (!isRecord(value)) return null
  const id = String(value['id'] ?? '').trim()
  return id
    ? { id, name: String(value['name'] ?? ''), identifier: String(value['identifier'] ?? '') }
    : null
}

function findSpace(data: unknown): WikiSpace | null {
  if (!isRecord(data)) return null
  const direct = normalizeSpace(data['space'])
  if (direct) return direct
  for (const key of ['data', 'context', 'entry']) {
    const nested = isRecord(data[key]) ? normalizeSpace(data[key]['space']) : null
    if (nested) return nested
  }
  return null
}

function normalizeConfig(value: unknown): CardsConfig {
  if (!isRecord(value)) return DEFAULT_CONFIG
  const pages = Array.isArray(value['pages'])
    ? value['pages'].map(normalizePage).filter((page): page is WikiPage => page !== null)
    : []
  const alignment = value['alignment']
  const cardType = value['cardType']
  const columns = Number(value['columns'])
  const hoverEffect = value['hoverEffect']
  return {
    alignment: alignment === 'center' || alignment === 'right' ? alignment : 'left',
    cardType: cardType === 'link' || cardType === 'image' ? cardType : 'text',
    columns: columns === 1 || columns === 2 ? columns : 3,
    hoverEffect: hoverEffect === 'outline' || hoverEffect === 'none' ? hoverEffect : 'elevate',
    pages,
  }
}

function mergeRefreshedPages(current: WikiPage[], refreshed: unknown[]): WikiPage[] {
  const byId = new Map(
    refreshed
      .map(normalizePage)
      .filter((page): page is WikiPage => page !== null)
      .map((page) => [page.id, page]),
  )
  return current.map((page) => byId.get(page.id) ?? page)
}

function CardsApp() {
  const initialized = useRef(false)
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [activeTab, setActiveTab] = useState<'general' | 'content'>('general')
  const [config, setConfig] = useState<CardsConfig>(DEFAULT_CONFIG)
  const [space, setSpace] = useState<WikiSpace | null>(null)
  const [availablePages, setAvailablePages] = useState<WikiPage[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageTotal, setPageTotal] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    let subscription: Subscription | undefined

    async function initialize() {
      if (!hasNexusBridge()) {
        const standaloneMode = new URLSearchParams(window.location.search).get('mode')
        setMode(standaloneMode === 'view' ? 'view' : 'edit')
        setSpace({ id: 'demo-space', name: 'Myriad Wiki' })
        setAvailablePages(MOCK_PAGES)
        setPageTotal(MOCK_PAGES.length)
        setConfig({ ...DEFAULT_CONFIG, pages: MOCK_PAGES.slice(0, 3) })
        setLoading(false)
        return
      }

      try {
        const context = await view.getContext<ExtensionData>()
        const data = context.extension.data
        const nextMode = data.entry?.mode ?? 'view'
        const nextConfig = normalizeConfig(data.config)
        const nextSpace = findSpace(data)
        setMode(nextMode)
        setConfig(nextConfig)
        setSpace(nextSpace)

        if (nextMode === 'edit') {
          await loadPageData(0, nextSpace?.id ?? '')
        } else {
          if (nextConfig.pages.length) {
            try {
              const refreshed = await invoke<{ pageIds: string[] }, unknown[]>('getWikiPages', {
                pageIds: nextConfig.pages.map((page) => page.id),
              })
              setConfig({ ...nextConfig, pages: mergeRefreshedPages(nextConfig.pages, refreshed) })
            } catch {
              // Saved data remains usable when a page was removed or temporarily unavailable.
            }
          }
          subscription = await events.on<{ config?: unknown }>(CONFIG_CHANGED_EVENT, (payload) => {
            setConfig(normalizeConfig(payload?.config))
          })
          requestAnimationFrame(() => void view.emitReadyEvent().catch(() => undefined))
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '无法加载卡片配置')
      } finally {
        setLoading(false)
      }
    }

    void initialize()
    return () => subscription?.unsubscribe()
  }, [])

  async function loadPageData(targetIndex: number, selectedSpaceId = space?.id ?? '') {
    if (!hasNexusBridge()) {
      setAvailablePages(MOCK_PAGES)
      setPageIndex(0)
      setPageTotal(MOCK_PAGES.length)
      return
    }
    setPageLoading(true)
    setMessage('')
    try {
      const result = await invoke<
        { spaceId: string; pageIndex: number; pageSize: number },
        WikiPagesResponse
      >('listWikiPages', {
        spaceId: selectedSpaceId,
        pageIndex: Math.max(0, targetIndex),
        pageSize: PAGE_SIZE,
      })
      setAvailablePages(
        (Array.isArray(result.values) ? result.values : [])
          .map(normalizePage)
          .filter((page): page is WikiPage => page !== null),
      )
      setPageIndex(Number.isFinite(result.page_index) ? Number(result.page_index) : targetIndex)
      setPageTotal(Number(result.total ?? 0))
      setQuery('')
    } catch (error) {
      setAvailablePages([])
      setMessage(error instanceof Error ? error.message : 'Wiki 页面列表加载失败')
    } finally {
      setPageLoading(false)
    }
  }

  function patchConfig(patch: Partial<CardsConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function togglePage(page: WikiPage) {
    setMessage('')
    setConfig((current) => {
      const selected = current.pages.some((item) => item.id === page.id)
      if (selected) return { ...current, pages: current.pages.filter((item) => item.id !== page.id) }
      if (current.pages.length >= MAX_PAGES) {
        setMessage(`最多选择 ${MAX_PAGES} 个页面`)
        return current
      }
      return { ...current, pages: [...current.pages, page] }
    })
  }

  async function save() {
    if (saving) return
    if (!config.pages.length) {
      setMessage('请至少选择一个 Wiki 页面')
      setActiveTab('content')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      if (hasNexusBridge()) await view.submit({ config, body: [{ id: 'content' }] })
      else setMessage('预览配置已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const filteredPages = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()
    if (!keyword) return availablePages
    return availablePages.filter((page) => page.name.toLocaleLowerCase().includes(keyword))
  }, [availablePages, query])
  const pageCount = Math.max(1, Math.ceil(pageTotal / PAGE_SIZE))

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        <LoaderCircle size={20} />
        <span>正在加载页面卡片</span>
      </div>
    )
  }

  if (mode === 'view') return <CardsGrid config={config} />

  return (
    <main className="editor-shell">
      <aside className="settings-panel">
        <div className="brand-row">
          <BrandMark />
          <h1>Myriad - Cards</h1>
        </div>

        <div className="tabs" role="tablist" aria-label="卡片设置">
          <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')} role="tab" aria-selected={activeTab === 'general'}>General</button>
          <button className={activeTab === 'content' ? 'active' : ''} onClick={() => setActiveTab('content')} role="tab" aria-selected={activeTab === 'content'}>Content</button>
        </div>

        {activeTab === 'general' ? (
          <div className="settings-body">
            <ControlGroup label="Alignment">
              <SegmentedControl
                value={config.alignment}
                options={[
                  { value: 'left', label: '左对齐', icon: <AlignLeft /> },
                  { value: 'center', label: '居中', icon: <AlignCenter /> },
                  { value: 'right', label: '右对齐', icon: <AlignRight /> },
                ]}
                onChange={(alignment) => patchConfig({ alignment: alignment as Alignment })}
              />
            </ControlGroup>
            <ControlGroup label="Card Type">
              <SegmentedControl
                wide
                value={config.cardType}
                options={[
                  { value: 'text', label: '内容卡片', icon: <Type /> },
                  { value: 'link', label: '链接卡片', icon: <Link2 /> },
                  { value: 'image', label: '图片卡片', icon: <ImageIcon /> },
                ]}
                onChange={(cardType) => patchConfig({ cardType: cardType as CardType })}
              />
            </ControlGroup>
            <ControlGroup label="Columns">
              <SegmentedControl
                wide
                value={String(config.columns)}
                options={[
                  { value: '1', label: '单列', icon: <Square /> },
                  { value: '2', label: '双列', icon: <Columns2 /> },
                  { value: '3', label: '三列', icon: <Columns3 /> },
                ]}
                onChange={(columns) => patchConfig({ columns: Number(columns) as Columns })}
              />
            </ControlGroup>
            <label className="select-field">
              <span>Hover Effect</span>
              <select value={config.hoverEffect} onChange={(event) => patchConfig({ hoverEffect: event.target.value as HoverEffect })}>
                <option value="elevate">Elevate</option>
                <option value="outline">Outline</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="settings-body content-settings">
            <div className="content-heading">
              <div>
                <span>Wiki Pages</span>
                <small>{space?.name || space?.identifier || '当前 Wiki 空间'} · 已选 {config.pages.length}/{MAX_PAGES}</small>
              </div>
              <button className="icon-button" type="button" title="刷新页面列表" aria-label="刷新页面列表" disabled={pageLoading} onClick={() => void loadPageData(pageIndex)}>
                <RefreshCw className={pageLoading ? 'spin' : ''} />
              </button>
            </div>
            <label className="search-field">
              <Search aria-hidden="true" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前页" />
            </label>
            <div className="page-list" aria-busy={pageLoading}>
              {pageLoading ? (
                <div className="list-state"><LoaderCircle className="spin" /><span>正在加载页面</span></div>
              ) : filteredPages.length ? filteredPages.map((page) => {
                const selected = config.pages.some((item) => item.id === page.id)
                return (
                  <label className={`page-option ${selected ? 'selected' : ''}`} key={page.id}>
                    <input type="checkbox" checked={selected} onChange={() => togglePage(page)} />
                    <span className="page-icon"><FileText /></span>
                    <span className="page-copy"><strong>{page.name}</strong><small>{formatDate(page.updatedAt)}</small></span>
                  </label>
                )
              }) : <div className="list-state">没有匹配的页面</div>}
            </div>
            <div className="pagination">
              <button className="icon-button" title="上一页" aria-label="上一页" disabled={pageLoading || pageIndex <= 0} onClick={() => void loadPageData(pageIndex - 1)}><ChevronLeft /></button>
              <span>{pageIndex + 1} / {pageCount} · {pageTotal} 项</span>
              <button className="icon-button" title="下一页" aria-label="下一页" disabled={pageLoading || pageIndex + 1 >= pageCount} onClick={() => void loadPageData(pageIndex + 1)}><ChevronRight /></button>
            </div>
            {config.pages.length > 0 && (
              <div className="selected-pages">
                {config.pages.map((page) => (
                  <span key={page.id}>{page.name}<button type="button" aria-label={`移除 ${page.name}`} title={`移除 ${page.name}`} onClick={() => togglePage(page)}><X /></button></span>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      <section className="preview-panel" aria-label="卡片预览">
        <div className="preview-scroll">
          <CardsGrid config={config} editable onAdd={() => setActiveTab('content')} />
        </div>
        <footer className="editor-footer">
          {message && <span className={message.includes('失败') || message.includes('请') || message.includes('最多') ? 'error-message' : 'status-message'} role="status">{message}</span>}
          <button className="cancel-button" type="button" onClick={() => hasNexusBridge() ? void view.close() : setMessage('')}>取消</button>
          <button className="save-button" type="button" disabled={saving} onClick={() => void save()}>{saving ? '保存中' : '保存'}</button>
        </footer>
      </section>
    </main>
  )
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section className="control-group"><h2>{label}</h2>{children}</section>
}

function SegmentedControl({ value, options, onChange, wide = false }: {
  value: string
  options: Array<{ value: string; label: string; icon: ReactNode }>
  onChange: (value: string) => void
  wide?: boolean
}) {
  return (
    <div className={`segmented-control ${wide ? 'wide' : ''}`}>
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'selected' : ''} title={option.label} aria-label={option.label} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.icon}</button>
      ))}
    </div>
  )
}

function BrandMark() {
  return <span className="cards-brand-mark" aria-hidden="true"><i /><i /><i /></span>
}

function CardsGrid({ config, editable = false, onAdd }: { config: CardsConfig; editable?: boolean; onAdd?: () => void }) {
  return (
    <div className={`cards-grid columns-${config.columns} align-${config.alignment} card-type-${config.cardType} hover-${config.hoverEffect}`}>
      {config.pages.map((page, index) => {
        const content = (
          <>
            <img src={page.coverUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length]} alt="" />
            <span className="card-content">
              <strong>{page.name}</strong>
              <span>{page.description}</span>
              {config.cardType === 'link' && <small><Link2 />打开 Wiki 页面</small>}
            </span>
          </>
        )
        return page.htmlUrl && page.htmlUrl !== '#'
          ? <a className="page-card" href={page.htmlUrl} target="_blank" rel="noreferrer" key={page.id}>{content}</a>
          : <article className="page-card" key={page.id}>{content}</article>
      })}
      {editable && (
        <button className="add-card" type="button" title="选择 Wiki 页面" aria-label="选择 Wiki 页面" onClick={onAdd}>
          <Plus />
          {!config.pages.length && <span>选择 Wiki 页面</span>}
        </button>
      )}
    </div>
  )
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '更新时间未知'
  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
  if (Number.isNaN(date.getTime())) return '更新时间未知'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

type EntryData = { config?: Partial<ButtonConfig>; entry?: { mode?: 'view' | 'edit' } }
type ConfigChanged = { config?: Partial<ButtonConfig> }
const CONFIG_CHANGED = 'NEXUS_EXTENSION_DATA_CONFIG_CHANGED'

function fullConfig(value?: Partial<ButtonConfig>): ButtonConfig {
  return { ...DEFAULT_BUTTON, ...value }
}

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function safeIconUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : undefined
  } catch { return undefined }
}

function ButtonSurface({ config, navigate = false }: { config: ButtonConfig; navigate?: boolean }) {
  const colors = {
    '--button-bg': config.appearance === 'outline' ? '#ffffff' : safeColor(config.backgroundColor, '#2d7ff9'),
    '--button-fg': safeColor(config.textColor, '#ffffff'),
    '--button-border': safeColor(config.outlineColor, '#2d7ff9'),
    '--button-hover-bg': safeColor(config.hoverBackgroundColor, config.backgroundColor),
    '--button-hover-fg': safeColor(config.hoverTextColor, '#ffffff'),
    minWidth: config.shape === 'circle' ? undefined : `${Math.min(800, Math.max(0, config.minWidth || 0))}px`,
  } as CSSProperties
  const href = safeHref(config.href)
  const className = `styled-button shape-${config.shape} size-${config.size} shadow-${config.shadow}`
  const iconUrl = iconfontUrl(config.iconId) || safeIconUrl(config.iconUrl)
  const iconStyle = iconUrl ? {
    backgroundColor: safeColor(config.iconColor, config.textColor),
    maskImage: `url("${iconUrl}")`,
    WebkitMaskImage: `url("${iconUrl}")`,
  } as CSSProperties : undefined
  const icon = iconUrl
    ? <span className="button-icon image-icon" style={iconStyle} aria-hidden="true" />
    : config.iconText ? <span className="button-icon text-icon" style={{ color: safeColor(config.iconColor, config.textColor) }} aria-hidden="true">{config.iconText}</span> : null
  const content = <>{icon}<span className="button-label">{config.label || '按钮'}</span></>
  if (navigate && href) {
    return <a className={className} style={colors} href={href} aria-label={config.label || '按钮'} onClick={(event) => {
      event.preventDefault()
      void (config.openNewTab ? router.open(href) : router.navigate(href))
    }}>{content}</a>
  }
  return <span className={className} style={colors} aria-label={config.label || '按钮'}>{content}</span>
}

function ButtonApp() {
  const [mode, setMode] = useState<'view' | 'edit' | null>(null)
  const [config, setConfig] = useState<ButtonConfig>(fullConfig())
  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    void view.getContext<EntryData>().then((context) => {
      if (!active) return
      setMode(context.extension.data.entry?.mode ?? 'view')
      setConfig(fullConfig(context.extension.data.config))
      if (context.extension.data.entry?.mode !== 'edit') {
        void events.on<ConfigChanged>(CONFIG_CHANGED, (payload) => {
          if (active) setConfig(fullConfig(payload?.config))
        }).then((subscription) => { unsubscribe = () => subscription.unsubscribe() })
      }
    }).catch(() => { if (active) setMode('edit') })
    return () => { active = false; unsubscribe?.() }
  }, [])
  if (mode === null) return <div className="loading">正在加载按钮…</div>
  if (mode === 'view') return <div className="viewer"><ButtonSurface config={config} navigate /></div>
  return <Editor initialConfig={config} />
}

function Editor({ initialConfig }: { initialConfig: ButtonConfig }) {
  const [config, setConfig] = useState(initialConfig)
  const [tab, setTab] = useState<'templates' | 'configuration'>('templates')
  const [designTab, setDesignTab] = useState<'default' | 'hover'>('default')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  function change<K extends keyof ButtonConfig>(key: K, value: ButtonConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }
  async function save() {
    if (config.href.trim() && !safeHref(config.href)) { setError('请输入 http:// 或 https:// 链接'); return }
    if (config.iconUrl.trim() && !safeIconUrl(config.iconUrl)) { setError('图标地址必须为 HTTPS URL'); return }
    setSaving(true)
    setError('')
    try { await view.submit({ config }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试') }
    finally { setSaving(false) }
  }
  return <main className="editor">
    <aside className="settings">
      <header className="settings-header"><img className="brand-mark" src={`${import.meta.env.BASE_URL}myriad.svg`} alt="Myriad" /><div><strong>Myriad - Button</strong><small>创建可定制按钮</small></div></header>
      <div className="top-tabs" role="tablist" aria-label="按钮设置">
        <button type="button" role="tab" aria-selected={tab === 'templates'} className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}>Templates 模板</button>
        <button type="button" role="tab" aria-selected={tab === 'configuration'} className={tab === 'configuration' ? 'active' : ''} onClick={() => setTab('configuration')}>Configuration 配置</button>
      </div>
      <div className="settings-scroll">
        {tab === 'templates' ? <section className="template-list">
          {['媒体', '通用'].map((group) => <div key={group}><h2>{group}按钮</h2><div className="template-grid">
            {TEMPLATES.filter((template) => template.group === group).map((template) => <button type="button" className="template-card" key={template.id} onClick={() => { setConfig({ ...template.config }); setTab('configuration') }}>
              <ButtonSurface config={template.config} /><span>{template.name}</span>
            </button>)}
          </div></div>)}
        </section> : <div className="config-panel">
          <h2>General</h2>
          <Field label="Shape 形状"><Choices value={config.shape} options={[["rectangle", "方形"], ["rounded", "圆角"], ["pill", "胶囊"], ["circle", "圆形"], ["slanted", "斜切"]]} onChange={(value) => change('shape', value as ButtonShape)} /></Field>
          <Field label="Label 文字"><input value={config.label} onChange={(e) => change('label', e.target.value)} placeholder="按钮文字" /></Field>
          <Field label="Size 尺寸"><Choices value={config.size} options={[["small", "Small"], ["medium", "Medium"], ["large", "Large"]]} onChange={(value) => change('size', value as ButtonSize)} /></Field>
          <Field label={`Minimum Width 最小宽度 · ${config.minWidth}px`}><div className="number-slider"><input type="number" min="0" max="800" value={config.minWidth} onChange={(e) => change('minWidth', Math.min(800, Math.max(0, Number(e.target.value) || 0)))} /><input type="range" min="0" max="800" value={config.minWidth} onChange={(e) => change('minWidth', Number(e.target.value))} /></div></Field>
          <Field label="Link & Actions 链接"><input type="url" value={config.href} onChange={(e) => change('href', e.target.value)} placeholder="https://example.com" /></Field>
          <label className="check-row"><input type="checkbox" checked={config.openNewTab} onChange={(e) => change('openNewTab', e.target.checked)} /> 在新标签页打开</label>
          <h2>Design</h2>
          <div className="sub-tabs" role="tablist" aria-label="设计状态"><button type="button" role="tab" aria-selected={designTab === 'default'} className={designTab === 'default' ? 'active' : ''} onClick={() => setDesignTab('default')}>Default</button><button type="button" role="tab" aria-selected={designTab === 'hover'} className={designTab === 'hover' ? 'active' : ''} onClick={() => setDesignTab('hover')}>Hover</button></div>
          {designTab === 'default' ? <>
            <Field label="Appearance 填充方式"><Choices value={config.appearance} options={[["fill", "实心"], ["outline", "描边"]]} onChange={(value) => change('appearance', value as ButtonConfig['appearance'])} /></Field>
            <ColorField label="Background Color 背景颜色" value={config.backgroundColor} onChange={(value) => change('backgroundColor', value)} />
            <ColorField label="Text Color 文字颜色" value={config.textColor} onChange={(value) => change('textColor', value)} />
            <ColorField label="Outline Color 描边颜色" value={config.outlineColor} onChange={(value) => change('outlineColor', value)} />
            <Field label="Shadow 阴影"><Choices value={config.shadow} options={[["none", "无"], ["soft", "柔和"], ["grounded", "悬浮"]]} onChange={(value) => change('shadow', value as ButtonShadow)} /></Field>
          </> : <>
            <ColorField label="Hover Background 悬停背景" value={config.hoverBackgroundColor} onChange={(value) => change('hoverBackgroundColor', value)} />
            <ColorField label="Hover Text 悬停文字" value={config.hoverTextColor} onChange={(value) => change('hoverTextColor', value)} />
          </>}
          <h2>Icon 图标</h2>
          <Field label="选择 iconfont 图标"><div className="icon-picker">
            <button type="button" className={!config.iconId && !config.iconUrl && !config.iconText ? 'selected' : ''} onClick={() => setConfig((current) => ({ ...current, iconId: '', iconUrl: '', iconText: '' }))}>无图标</button>
            {ICONFONT_ICONS.map(([id, name]) => <button type="button" key={id} title={name} aria-label={name} aria-pressed={config.iconId === id} className={config.iconId === id ? 'selected' : ''} onClick={() => setConfig((current) => ({ ...current, iconId: id, iconUrl: '', iconText: '' }))}><span className="picker-icon" style={{ maskImage: `url("${iconfontUrl(id)}")`, WebkitMaskImage: `url("${iconfontUrl(id)}")` }} />{name}</button>)}
          </div><small>图标来自 iconfont；选择后可修改颜色。</small></Field>
          <ColorField label="Icon Color 图标颜色" value={config.iconColor} onChange={(value) => change('iconColor', value)} />
          <Field label="自定义 iconfont SVG URL"><input type="url" value={config.iconUrl} onChange={(e) => setConfig((current) => ({ ...current, iconUrl: e.target.value, iconId: e.target.value ? '' : current.iconId }))} placeholder="https://at.alicdn.com/...svg" /><small>粘贴 HTTPS SVG 图片地址；图标会作为单色蒙版显示，支持改色。</small></Field>
          <Field label="文字图标（兼容旧配置）"><input value={config.iconText} onChange={(e) => setConfig((current) => ({ ...current, iconText: e.target.value, iconId: e.target.value ? '' : current.iconId, iconUrl: e.target.value ? '' : current.iconUrl }))} placeholder="小、哔、↓" /></Field>
        </div>}
      </div>
    </aside>
    <section className="preview" aria-label="按钮预览"><div className="preview-heading"><strong>实时预览</strong><span>更改配置后立即更新</span></div><div className="preview-stage"><ButtonSurface config={config} /></div><footer><span className="error" role="alert">{error}</span><button type="button" className="secondary" onClick={() => void view.close()}>取消</button><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存按钮'}</button></footer></section>
  </main>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <fieldset className="field"><legend>{label}</legend>{children}</fieldset> }
function Choices({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (value: string) => void }) { return <div className="choices">{options.map(([key, label]) => <button key={key} type="button" className={value === key ? 'selected' : ''} onClick={() => onChange(key)}>{label}</button>)}</div> }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><div className="color-field"><input type="color" value={safeColor(value, '#ffffff')} onChange={(e) => onChange(e.target.value)} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" /></div></Field> }

function App() {
  const [extensionKey, setExtensionKey] = useState<string | null>(() => {
    if (hasNexusBridge()) return null
    return new URLSearchParams(window.location.search).get('extension') ?? 'myriad-cards'
  })

  useEffect(() => {
    if (!hasNexusBridge()) return
    let active = true
    void view.getContext().then((context) => {
      if (active) setExtensionKey(context.extension.key)
    }).catch(() => {
      if (active) setExtensionKey('myriad-cards')
    })
    return () => { active = false }
  }, [])

  if (extensionKey === null) return <div className="loading-screen">正在加载 Myriad…</div>
  return extensionKey === 'myriad-button' ? <ButtonApp /> : <CardsApp />
}

export default App
