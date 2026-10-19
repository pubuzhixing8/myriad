export const FALLBACK_COVERS = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=82",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=82",
  "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=82",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=82",
];

export type Alignment = "left" | "center" | "right";
export type CardType = "text" | "link" | "image";
export type Columns = 1 | 2 | 3;
export type HoverEffect = "elevate" | "outline" | "none";

export interface WikiSpace {
  id: string;
  identifier?: string;
  name?: string;
}

export interface WikiPage {
  id: string;
  name: string;
  description: string;
  htmlUrl: string;
  type: string;
  updatedAt: number;
  spaceName: string;
  coverUrl: string;
}

export interface CardsConfig {
  alignment: Alignment;
  cardType: CardType;
  columns: Columns;
  hoverEffect: HoverEffect;
  space: WikiSpace | null;
  pages: WikiPage[];
}

export const DEFAULT_CONFIG: CardsConfig = {
  alignment: "left",
  cardType: "text",
  columns: 3,
  hoverEffect: "elevate",
  space: null,
  pages: [],
};

export const MOCK_SPACES: WikiSpace[] = [
  { id: "demo-space", name: "Myriad Wiki", identifier: "MYRIAD" },
  { id: "team-space", name: "团队知识库", identifier: "TEAM" },
];

export const MOCK_PAGES: WikiPage[] = [
  mockPage(
    "welcome",
    "Myriad - Cards",
    "Replace this text with your own content",
    0,
  ),
  mockPage("roadmap", "产品路线图", "查看本季度目标、里程碑和交付计划", 1),
  mockPage("guide", "团队协作指南", "了解项目协作规范和常用工作流程", 2),
  mockPage("release", "发布检查清单", "发布前需要完成的检查与确认事项", 3),
  mockPage("research", "用户研究记录", "汇总访谈洞察与待验证的产品假设", 1),
  mockPage("decisions", "关键决策记录", "追踪方案选择、背景信息和后续影响", 0),
];

function mockPage(
  id: string,
  name: string,
  description: string,
  cover: number,
): WikiPage {
  return {
    id,
    name,
    description,
    htmlUrl: "#",
    type: "page",
    updatedAt: Date.now(),
    spaceName: "Myriad Wiki",
    coverUrl: FALLBACK_COVERS[cover] ?? FALLBACK_COVERS[0],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFrom(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function normalizePage(value: unknown, index = 0): WikiPage | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  if (!id) return null;
  const space = isRecord(value["space"]) ? value["space"] : {};
  const cover = isRecord(value["cover"]) ? value["cover"] : {};
  const description = textFrom(
    value["description"] ??
      value["excerpt"] ??
      value["summary"] ??
      "打开页面查看完整内容",
  );

  return {
    id,
    name: String(value["name"] ?? value["title"] ?? "未命名页面"),
    description: description || "打开页面查看完整内容",
    htmlUrl: String(
      value["htmlUrl"] ?? value["html_url"] ?? value["url"] ?? "",
    ),
    type: String(value["type"] ?? "page"),
    updatedAt: Number(value["updatedAt"] ?? value["updated_at"] ?? 0),
    spaceName: String(value["spaceName"] ?? space["name"] ?? ""),
    coverUrl: String(
      value["coverUrl"] ??
        value["cover_url"] ??
        cover["url"] ??
        FALLBACK_COVERS[index % FALLBACK_COVERS.length],
    ),
  };
}

export function normalizeSpace(value: unknown): WikiSpace | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  return id
    ? {
        id,
        name: String(value["name"] ?? ""),
        identifier: String(value["identifier"] ?? ""),
      }
    : null;
}

export function normalizeConfig(value: unknown): CardsConfig {
  if (!isRecord(value)) return DEFAULT_CONFIG;
  const pages = Array.isArray(value["pages"])
    ? value["pages"]
        .map(normalizePage)
        .filter((page): page is WikiPage => page !== null)
    : [];
  const alignment = value["alignment"];
  const cardType = value["cardType"];
  const columns = Number(value["columns"]);
  const hoverEffect = value["hoverEffect"];
  return {
    alignment:
      alignment === "center" || alignment === "right" ? alignment : "left",
    cardType: cardType === "link" || cardType === "image" ? cardType : "text",
    columns: columns === 1 || columns === 2 ? columns : 3,
    hoverEffect:
      hoverEffect === "outline" || hoverEffect === "none"
        ? hoverEffect
        : "elevate",
    space: normalizeSpace(value["space"]),
    pages,
  };
}

export function mergeRefreshedPages(
  current: WikiPage[],
  refreshed: unknown[],
): WikiPage[] {
  const byId = new Map(
    refreshed
      .map(normalizePage)
      .filter((page): page is WikiPage => page !== null)
      .map((page) => [page.id, page]),
  );
  return current.map((page) => byId.get(page.id) ?? page);
}
