import type { CSSProperties } from "react";
import { router } from "@pc-nexus/bridge";
import {
  darkenColor,
  iconfontSvg,
  safeButtonHref,
  safeColor,
  type ButtonConfig,
} from "../../../plugins/button/config";

export function ButtonSurface({
  config,
  navigate = false,
}: {
  config: ButtonConfig;
  navigate?: boolean;
}) {
  const base = safeColor(config.backgroundColor, "#2b6cf0");
  const outline = config.outlineEnabled
    ? safeColor(config.outlineColor, base)
    : base;
  const foreground =
    config.textColorEnabled
      ? safeColor(config.textColor, "#ffffff")
      : config.appearance === "fill" && config.backgroundEnabled
        ? "#ffffff"
        : base;
  const hoverBackground = config.hoverBackgroundEnabled
    ? safeColor(config.hoverBackgroundColor, darkenColor(base))
    : darkenColor(base);
  const hoverForeground = config.hoverTextEnabled
    ? safeColor(config.hoverTextColor, foreground)
    : foreground;
  const style = {
    "--button-bg":
      config.backgroundEnabled ? base : "transparent",
    "--button-fg": foreground,
    "--button-border":
      config.appearance === "outline" ? outline : "transparent",
    "--button-hover-bg":
      config.hoverBackgroundEnabled
        ? config.backgroundEnabled
          ? hoverBackground
          : `${hoverBackground}18`
        : config.backgroundEnabled
          ? base
          : "transparent",
    "--button-hover-fg": hoverForeground,
    minWidth:
      config.shape === "circle"
        ? undefined
        : `${Math.min(320, Math.max(0, config.minWidth || 0))}px`,
  } as CSSProperties;
  const iconSvg = iconfontSvg(config.iconId);
  const icon = iconSvg ? (
    <span
      className="button-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  ) : null;
  const content = (
    <>
      {config.iconPosition === "left" && icon}
      {config.showLabel && config.shape !== "circle" && (
        <span className="button-label">{config.label || "按钮"}</span>
      )}
      {config.iconPosition === "right" && icon}
    </>
  );
  const className = `styled-button shape-${config.shape} size-${config.size} appearance-${config.appearance}`;
  const href = safeButtonHref(config);
  const button =
    navigate && href ? (
      <a
        className={className}
        style={style}
        href={href}
        aria-label={config.label || "按钮"}
        onClick={(event) => {
          if (config.linkType === "email") {
            return;
          }
          event.preventDefault();
          void (config.openNewTab ? router.open(href) : router.navigate(href));
        }}
      >
        {content}
      </a>
    ) : (
      <span
        className={className}
        style={style}
        aria-label={config.label || "按钮"}
      >
        {content}
      </span>
    );
  return <span className="button-row">{button}</span>;
}
