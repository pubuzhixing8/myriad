import { useState } from 'react'
import { view } from '@pc-nexus/bridge'
import { ButtonSurface } from './ButtonSurface'
import { ICONFONT_ICONS, iconfontUrl, safeHref, safeIconUrl, TEMPLATES, type ButtonConfig, type ButtonShape, type ButtonSize, type ButtonShadow } from '../../../plugins/button/config'

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export function Editor({ initialConfig }: { initialConfig: ButtonConfig }) {
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
