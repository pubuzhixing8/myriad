export type DynamicContentSourceType = "space" | "page";
export type DynamicContentDisplay = "card" | "list";
export type DynamicContentSort = "updated_desc" | "created_desc" | "title_asc";
export type DynamicContentColumns = 1 | 2 | 3 | 4 | 6;
export type DynamicContentAlign = "left" | "center" | "right";
export type DynamicContentCardType = "text" | "icon" | "image";
export type DynamicContentCardStyle = "classic" | "hover" | "flip";
export type DynamicContentBackground =
  | "none"
  | "watercolor"
  | "wavy"
  | "nature"
  | "business"
  | "gradient";
export type SpaceScopeType = "all" | "organization" | "user_group" | "user";
export type PageRelation = "none" | "parent" | "ancestor";

export interface BackgroundOption {
  key: Exclude<DynamicContentBackground, "none">;
  label: string;
  files: string[];
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    key: "watercolor",
    label: "水彩",
    files: [
      "background/Watercolor/charlesrondeau-water-1018808_1920.jpg",
      "background/Watercolor/pexels-beach-1851101_1920.jpg",
      "background/Watercolor/stocksnap-sea-2601374_1920.jpg",
    ],
  },
  {
    key: "wavy",
    label: "波浪",
    files: [
      "background/wavy/cnstnt-canyon-1356886_1920.jpg",
      "background/wavy/stevesnyderphotography-arizona-9839880_1920.jpg",
      "background/wavy/tricell1991-tea-plantations-3941741_1920.jpg",
    ],
  },
  {
    key: "nature",
    label: "自然",
    files: [
      "background/Nature/12019-maldives-1993704_1920.jpg",
      "background/Nature/guddanti-boat-5627042.jpg",
      "background/Nature/neelam279-white-flowers-10281727_1920.jpg",
      "background/Nature/renegossner-water-8100724.jpg",
      "background/Nature/tama66-field-3379250_1920.jpg",
    ],
  },
  {
    key: "business",
    label: "商务",
    files: [
      "background/Business/alpeva232-work-4372725_1920.jpg",
      "background/Business/pexels-chairs-2181916_1920.jpg",
      "background/Business/stocksnap-macbook-air-2628552_1920.jpg",
    ],
  },
  {
    key: "gradient",
    label: "渐变",
    files: [
      "background/Gradient/alexanderstein-colorful-182220.jpg",
      "background/Gradient/inspiredimages-pencils-452238_1920.jpg",
      "background/Gradient/stux-to-paint-268185_1920.jpg",
    ],
  },
];

/**
 * Picks a stable pseudo-random image for an item so cards keep their picture
 * across re-renders while the whole set still looks randomly distributed.
 */
export function pickBackgroundImage(
  background: DynamicContentBackground,
  seed: string,
): string | null {
  if (background === "none") return null;
  const option = BACKGROUND_OPTIONS.find((item) => item.key === background);
  if (!option || option.files.length === 0) return null;
  const value = `${seed}:${background}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return option.files[hash % option.files.length];
}

/**
 * Builds the link target for an item. Space links always come from the team
 * URL (`/wiki/spaces/<identifier>`), never from the API response; pages keep
 * their API URL and fall back to `/wiki/pages/<id>`.
 */
export function resolveItemUrl(
  item: DynamicContentItem,
  baseUrl = "",
): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (item.resourceType === "space") {
    const key = item.identifier || item.id;
    return base && key
      ? `${base}/wiki/spaces/${encodeURIComponent(key)}`
      : "";
  }
  if (item.htmlUrl && item.htmlUrl !== "#") return item.htmlUrl;
  return base && item.id
    ? `${base}/wiki/pages/${encodeURIComponent(item.id)}`
    : "";
}

export interface WikiSpace {
  id: string;
  identifier?: string;
  url?: string;
  name?: string;
  description?: string;
  scopeType?: string;
  updatedAt?: number;
  createdAt?: number;
  isArchived?: boolean;
}

export interface WikiPageRef {
  id: string;
  name: string;
  spaceName: string;
  updatedAt: number;
}

export interface SpaceFilters {
  keywords: string;
  scopeType: SpaceScopeType;
  includeArchived: boolean;
}

export interface PageFilters {
  spaceId: string;
  spaceName: string;
  relation: PageRelation;
  relationPageId: string;
  relationPageName: string;
}

export interface DynamicContentItem {
  id: string;
  resourceType: DynamicContentSourceType;
  name: string;
  description: string;
  htmlUrl: string;
  type: string;
  identifier: string;
  scopeType: string;
  updatedAt: number;
  createdAt: number;
  spaceName: string;
}

export interface DynamicContentConfig {
  sourceType: DynamicContentSourceType | null;
  spaceFilters: SpaceFilters;
  pageFilters: PageFilters;
  display: DynamicContentDisplay;
  columns: DynamicContentColumns;
  align: DynamicContentAlign;
  cardType: DynamicContentCardType;
  style: DynamicContentCardStyle;
  background: DynamicContentBackground;
  imageHeight: number;
  imageFit: "cover" | "contain";
  accent: string;
  gap: number;
  padding: number;
  radius: number;
  border: boolean;
  shadow: boolean;
  sort: DynamicContentSort;
  limit: number;
  showExcerpt: boolean;
  showMeta: boolean;
}

export const DEFAULT_DYNAMIC_CONTENT_CONFIG: DynamicContentConfig = {
  sourceType: null,
  spaceFilters: { keywords: "", scopeType: "all", includeArchived: false },
  pageFilters: {
    spaceId: "",
    spaceName: "",
    relation: "none",
    relationPageId: "",
    relationPageName: "",
  },
  display: "card",
  columns: 3,
  align: "left",
  cardType: "icon",
  style: "hover",
  background: "none",
  imageHeight: 140,
  imageFit: "cover",
  accent: "#3d5cf0",
  gap: 16,
  padding: 22,
  radius: 8,
  border: true,
  shadow: true,
  sort: "updated_desc",
  limit: 12,
  showExcerpt: true,
  showMeta: true,
};

const MOCK_BASE_TIME = Date.now();

const SPACE_SEEDS: Array<
  [name: string, identifier: string, description: string, scopeType: string]
> = [
  ["Myriad Wiki", "MYRIAD", "企业产品与协作知识库", "organization"],
  ["产品知识库", "PRODUCT", "产品规划、研究与发布资料", "organization"],
  ["团队空间", "TEAM", "团队制度与日常协作文档", "user_group"],
  ["设计资源", "DESIGN", "设计规范与素材沉淀", "organization"],
  ["研发手册", "ENGINEERING", "工程实践、发布流程与值班说明", "user_group"],
  ["客户成功", "CS", "客户交付、服务标准与案例复盘", "user_group"],
  ["市场资料", "MARKETING", "品牌规范、活动物料与渠道数据", "organization"],
  ["人事政策", "HR", "假期、考勤与员工关怀制度", "user_group"],
  ["财务制度", "FINANCE", "报销、采购与预算管理", "user_group"],
  ["安全合规", "SECURITY", "安全规范、审计记录与应急预案", "organization"],
  ["数据分析", "DATA", "指标口径、报表说明与埋点文档", "user_group"],
  ["销售赋能", "SALES", "销售话术、投标资料与竞品分析", "user_group"],
  ["个人笔记", "NOTES", "个人整理的学习与工作笔记", "user"],
  ["已归档空间", "ARCHIVE", "历史项目资料，只读留存", "organization"],
];

export const MOCK_SPACES: WikiSpace[] = SPACE_SEEDS.map(
  ([name, identifier, description, scopeType], index) => ({
    id: `mock-space-${index + 1}`,
    name,
    identifier,
    description,
    scopeType,
    updatedAt: MOCK_BASE_TIME - index * 86_400_000,
    createdAt: MOCK_BASE_TIME - (index + 30) * 86_400_000,
    isArchived: identifier === "ARCHIVE",
  }),
);

const PAGE_SEEDS: Array<[name: string, description: string, spaceName: string]> = [
  ["发布说明", "汇总最近版本中的新能力、修复和升级提示。", "Myriad Wiki"],
  ["团队手册", "团队制度、角色职责与协作方式。", "团队空间"],
  ["新人入门", "帮助新成员快速找到所需的入门材料。", "Myriad Wiki"],
  ["产品路线图", "呈现持续更新的计划和里程碑。", "产品知识库"],
  ["常见问题", "集中整理高频问题与标准答案。", "产品知识库"],
  ["支持流程", "客户问题处理流程与服务规范。", "客户成功"],
  ["设计规范", "颜色、字体、间距与组件使用约定。", "设计资源"],
  ["组件库说明", "设计组件与前端实现的对应关系。", "设计资源"],
  ["发布检查清单", "上线前必须确认的检查项。", "研发手册"],
  ["故障处理手册", "线上故障的分级、响应与复盘流程。", "研发手册"],
  ["值班安排", "当前值班人员与交接说明。", "研发手册"],
  ["品牌使用指南", "Logo、配色与对外传播规范。", "市场资料"],
  ["活动复盘模板", "活动目标、数据与经验沉淀模板。", "市场资料"],
  ["假期与考勤", "年假、调休与考勤规则说明。", "人事政策"],
  ["报销流程", "费用申请、审批与票据要求。", "财务制度"],
  ["采购管理", "采购申请与供应商管理流程。", "财务制度"],
  ["安全基线", "账号、数据与设备的安全要求。", "安全合规"],
  ["应急响应预案", "安全事件的响应步骤与联系人。", "安全合规"],
  ["指标口径", "核心指标的统计范围与计算方式。", "数据分析"],
  ["埋点文档", "客户端与服务端埋点字段说明。", "数据分析"],
  ["销售话术库", "不同场景下的沟通模板与要点。", "销售赋能"],
  ["竞品分析", "主要竞品的能力对比与动态。", "销售赋能"],
  ["学习笔记", "个人整理的学习资料索引。", "个人笔记"],
];

export const MOCK_PAGES: DynamicContentItem[] = PAGE_SEEDS.map(
  ([name, description, spaceName], index) => ({
    id: `mock-page-${index + 1}`,
    resourceType: "page",
    name,
    description,
    htmlUrl: "#",
    type: "page",
    identifier: "",
    scopeType: "",
    updatedAt: MOCK_BASE_TIME - index * 7 * 3_600_000,
    createdAt: MOCK_BASE_TIME - (index + 20) * 86_400_000,
    spaceName,
  }),
);

export const MOCK_PAGE_REFS: WikiPageRef[] = MOCK_PAGES.map((page) => ({
  id: page.id,
  name: page.name,
  spaceName: page.spaceName,
  updatedAt: page.updatedAt,
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFrom(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

export function normalizeSpace(value: unknown): WikiSpace | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(value["name"] ?? ""),
    identifier: String(value["identifier"] ?? ""),
    url: String(value["url"] ?? value["html_url"] ?? value["htmlUrl"] ?? ""),
    description: textFrom(value["description"]),
    scopeType: String(value["scopeType"] ?? value["scope_type"] ?? ""),
    updatedAt: Number(value["updatedAt"] ?? value["updated_at"] ?? 0),
    createdAt: Number(value["createdAt"] ?? value["created_at"] ?? 0),
    isArchived: Boolean(value["isArchived"] ?? value["is_archived"]),
  };
}

export function normalizePageRef(value: unknown): WikiPageRef | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  if (!id) return null;
  const space = isRecord(value["space"]) ? value["space"] : {};
  return {
    id,
    name: String(value["name"] ?? value["title"] ?? "未命名页面"),
    spaceName: String(value["spaceName"] ?? value["space_name"] ?? space["name"] ?? ""),
    updatedAt: Number(value["updatedAt"] ?? value["updated_at"] ?? 0),
  };
}

export function normalizeSpaceItem(value: unknown): DynamicContentItem | null {
  const space = normalizeSpace(value);
  if (!space) return null;
  const raw = isRecord(value) ? value : {};
  return {
    id: space.id,
    resourceType: "space",
    name: space.name || space.identifier || "未命名空间",
    description: space.description || "",
    htmlUrl: String(raw["htmlUrl"] ?? raw["html_url"] ?? space.url ?? ""),
    type: "space",
    identifier: space.identifier || "",
    scopeType: space.scopeType || "",
    updatedAt: space.updatedAt || 0,
    createdAt: space.createdAt || 0,
    spaceName: "",
  };
}

export function normalizePageItem(value: unknown): DynamicContentItem | null {
  if (!isRecord(value)) return null;
  const id = String(value["id"] ?? "").trim();
  if (!id) return null;
  const space = isRecord(value["space"]) ? value["space"] : {};
  return {
    id,
    resourceType: "page",
    name: String(value["name"] ?? value["title"] ?? "未命名页面"),
    description: textFrom(value["description"] ?? value["excerpt"] ?? value["summary"] ?? ""),
    htmlUrl: String(
      value["htmlUrl"] ?? value["html_url"] ?? value["url"] ?? "",
    ),
    type: String(value["type"] ?? "page"),
    identifier: "",
    scopeType: "",
    updatedAt: Number(value["updatedAt"] ?? value["updated_at"] ?? 0),
    createdAt: Number(value["createdAt"] ?? value["created_at"] ?? 0),
    spaceName: String(value["spaceName"] ?? space["name"] ?? ""),
  };
}

export function normalizeDynamicContentItem(value: unknown): DynamicContentItem | null {
  if (!isRecord(value)) return null;
  return value["resourceType"] === "space" ? normalizeSpaceItem(value) : normalizePageItem(value);
}

export function normalizeDynamicContentConfig(value: unknown): DynamicContentConfig {
  if (!isRecord(value)) return DEFAULT_DYNAMIC_CONTENT_CONFIG;
  const limit = Math.min(50, Math.max(1, Number(value["limit"]) || 12));
  const display = value["display"];
  const sort = value["sort"];
  const sourceType = value["sourceType"];
  const rawSpaceFilters = isRecord(value["spaceFilters"]) ? value["spaceFilters"] : {};
  const rawPageFilters = isRecord(value["pageFilters"]) ? value["pageFilters"] : {};
  const relation = rawPageFilters["relation"];
  const scopeType = rawSpaceFilters["scopeType"];

  return {
    sourceType: sourceType === "space" || sourceType === "page" ? sourceType : null,
    spaceFilters: {
      keywords: String(rawSpaceFilters["keywords"] ?? ""),
      scopeType:
        scopeType === "organization" || scopeType === "user_group" || scopeType === "user"
          ? scopeType
          : "all",
      includeArchived: Boolean(rawSpaceFilters["includeArchived"]),
    },
    pageFilters: {
      spaceId: String(rawPageFilters["spaceId"] ?? ""),
      spaceName: String(rawPageFilters["spaceName"] ?? ""),
      relation: relation === "parent" || relation === "ancestor" ? relation : "none",
      relationPageId: String(rawPageFilters["relationPageId"] ?? ""),
      relationPageName: String(rawPageFilters["relationPageName"] ?? ""),
    },
    display: display === "list" ? "list" : "card",
    columns: choice(Number(value["columns"]), [1, 2, 3, 4, 6] as const, 3),
    align: choice(value["align"], ["left", "center", "right"] as const, "left"),
    cardType: choice(value["cardType"], ["text", "icon", "image"] as const, "icon"),
    style: choice(value["style"], ["classic", "hover", "flip"] as const, "hover"),
    background: choice(
      value["background"],
      ["none", "watercolor", "wavy", "nature", "business", "gradient"] as const,
      "none",
    ),
    imageHeight: numberInRange(value["imageHeight"], 140, 60, 260),
    imageFit: choice(value["imageFit"], ["cover", "contain"] as const, "cover"),
    accent: /^#[\da-f]{6}$/i.test(String(value["accent"] ?? ""))
      ? String(value["accent"])
      : DEFAULT_DYNAMIC_CONTENT_CONFIG.accent,
    gap: numberInRange(value["gap"], 16, 0, 40),
    padding: numberInRange(value["padding"], 22, 8, 48),
    radius: numberInRange(value["radius"], 8, 0, 24),
    border: value["border"] !== false,
    shadow: value["shadow"] !== false,
    sort: sort === "created_desc" || sort === "title_asc" ? sort : "updated_desc",
    limit,
    showExcerpt:
      typeof value["showExcerpt"] === "boolean"
        ? value["showExcerpt"]
        : DEFAULT_DYNAMIC_CONTENT_CONFIG.showExcerpt,
    showMeta:
      typeof value["showMeta"] === "boolean"
        ? value["showMeta"]
        : DEFAULT_DYNAMIC_CONTENT_CONFIG.showMeta,
  };
}

function choice<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, number))
    : fallback;
}
