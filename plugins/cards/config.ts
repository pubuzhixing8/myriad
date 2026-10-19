export type Alignment = "left" | "center" | "right";
export type Columns = 1 | 2 | 3;
export type DisplayMode = "card" | "list";
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
  columns: Columns;
  display: DisplayMode;
  hoverEffect: HoverEffect;
  space: WikiSpace | null;
  pages: WikiPage[];
}

export const DEFAULT_CONFIG: CardsConfig = {
  alignment: "left",
  columns: 3,
  display: "card",
  hoverEffect: "elevate",
  space: null,
  pages: [],
};

export const MOCK_SPACES: WikiSpace[] = [
  { id: "demo-space", name: "Myriad Wiki", identifier: "MYRIAD" },
  { id: "team-space", name: "团队知识库", identifier: "TEAM" },
];

export const MOCK_PAGES: WikiPage[] = [
  mockPage("welcome", "Myriad - Pages"),
  mockPage("roadmap", "产品路线图"),
  mockPage("guide", "团队协作指南"),
  mockPage("release", "发布检查清单"),
  mockPage("research", "用户研究记录"),
  mockPage("decisions", "关键决策记录"),
];

function mockPage(id: string, name: string): WikiPage {
  return {
    id,
    name,
    description: "",
    htmlUrl: "#",
    type: "page",
    updatedAt: Date.now(),
    spaceName: "Myriad Wiki",
    coverUrl: "",
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

export function normalizePage(value: unknown): WikiPage | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  if (!id) return null;
  const space = isRecord(value["space"]) ? value["space"] : {};
  const cover = isRecord(value["cover"]) ? value["cover"] : {};
  const description = textFrom(
    value["description"] ?? value["excerpt"] ?? value["summary"] ?? "",
  );

  return {
    id,
    name: String(value["name"] ?? value["title"] ?? "未命名页面"),
    description,
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
        "",
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
  const columns = Number(value["columns"]);
  const display = value["display"];
  const hoverEffect = value["hoverEffect"];
  return {
    alignment:
      alignment === "center" || alignment === "right" ? alignment : "left",
    columns: columns === 1 || columns === 2 ? columns : 3,
    display: display === "list" ? display : "card",
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
