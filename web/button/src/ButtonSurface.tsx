import type { CSSProperties } from 'react'
import { router } from '@pc-nexus/bridge'
import { iconfontUrl, safeHref, safeIconUrl, type ButtonConfig } from '../../../plugins/button/config'

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export function ButtonSurface({ config, navigate = false }: { config: ButtonConfig; navigate?: boolean }) {
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
