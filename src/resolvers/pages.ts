import { Resolver } from "@pc-nexus/core";
import { api } from "@pc-nexus/network";

const resolver = new Resolver();

interface ListWikiSpacesPayload {
    pageIndex?: number;
    pageSize?: number;
    keywords?: string;
    scopeType?: string;
    includeArchived?: boolean;
}

interface ListWikiPagesPayload {
    spaceId?: string;
    parentId?: string;
    ancestorId?: string;
    pageIndex?: number;
    pageSize?: number;
}

interface GetWikiPagesPayload {
    pageIds?: string[];
}

interface DynamicContentSpaceFilters {
    keywords?: string;
    scopeType?: string;
    includeArchived?: boolean;
}

interface DynamicContentPageFilters {
    spaceId?: string;
    relation?: "none" | "parent" | "ancestor";
    relationPageId?: string;
}

interface ListDynamicContentPayload {
    sourceType?: "space" | "page";
    pageIndex?: number;
    pageSize?: number;
    sort?: "updated_desc" | "created_desc" | "title_asc";
    spaceFilters?: DynamicContentSpaceFilters;
    pageFilters?: DynamicContentPageFilters;
}

interface WikiPagesResponse {
    page_size?: number;
    page_index?: number;
    total?: number;
    values?: unknown[];
}

interface WikiSpacesResponse {
    page_size?: number;
    page_index?: number;
    total?: number;
    values?: unknown[];
}

resolver.define<ListWikiSpacesPayload, WikiSpacesResponse>(
    "listWikiSpaces",
    async (_context, payload) => {
        const pageIndex = Math.max(0, Number(payload?.pageIndex) || 0);
        const pageSize = Math.min(50, Math.max(1, Number(payload?.pageSize) || 20));
        const params = new URLSearchParams({
            page_index: String(pageIndex),
            page_size: String(pageSize),
        });
        const keywords = String(payload?.keywords ?? "").trim();
        if (keywords) params.set("keywords", keywords);
        const scopeType = String(payload?.scopeType ?? "").trim();
        if (scopeType === "organization" || scopeType === "user_group" || scopeType === "user") {
            params.set("scope_type", scopeType);
        }
        if (payload?.includeArchived) params.set("include_archived", "true");

        const response = await api.invoke(`/v2/wiki/spaces?${params.toString()}`, { as: "user" });
        if (!response.ok) {
            throw new Error(await responseError(response, "Wiki 空间列表加载失败"));
        }
        return (await response.json()) as WikiSpacesResponse;
    },
);

resolver.define<ListWikiPagesPayload, WikiPagesResponse>(
    "listWikiPages",
    async (_context, payload) => {
        const pageIndex = Math.max(0, Number(payload?.pageIndex) || 0);
        const pageSize = Math.min(50, Math.max(1, Number(payload?.pageSize) || 12));
        const spaceId = String(payload?.spaceId ?? "").trim();
        const parentId = String(payload?.parentId ?? "").trim();
        const ancestorId = String(payload?.ancestorId ?? "").trim();
        const params = new URLSearchParams({
            page_index: String(pageIndex),
            page_size: String(pageSize),
        });
        if (spaceId) params.set("space_id", spaceId);
        if (parentId) params.set("parent_id", parentId);
        if (ancestorId) params.set("ancestor_id", ancestorId);

        const response = await api.invoke(`/v2/wiki/pages?${params.toString()}`, { as: "user" });
        if (!response.ok) {
            throw new Error(await responseError(response, "Wiki 页面列表加载失败"));
        }
        return (await response.json()) as WikiPagesResponse;
    },
);

resolver.define<GetWikiPagesPayload, unknown[]>("getWikiPages", async (_context, payload) => {
    const pageIds = Array.from(
        new Set((Array.isArray(payload?.pageIds) ? payload.pageIds : []).map(String).filter(Boolean)),
    ).slice(0, 12);

    return Promise.all(
        pageIds.map(async (pageId) => {
            const response = await api.invoke(`/v2/wiki/pages/${encodeURIComponent(pageId)}`, {
                as: "user",
            });
            if (!response.ok) return null;
            return response.json();
        }),
    );
});

resolver.define<ListDynamicContentPayload, WikiPagesResponse>(
    "listDynamicContent",
    async (_context, payload) => {
        const sourceType = payload?.sourceType === "page" ? "page" : "space";
        const pageIndex = Math.max(0, Number(payload?.pageIndex) || 0);
        const pageSize = Math.min(24, Math.max(1, Number(payload?.pageSize) || 12));
        const sort = payload?.sort ?? "updated_desc";
        const params = new URLSearchParams({
            page_index: String(pageIndex),
            page_size: String(pageSize),
        });

        if (sourceType === "page") {
            const filters = payload?.pageFilters ?? {};
            const spaceId = String(filters.spaceId ?? "").trim();
            const relation =
                filters.relation === "parent" || filters.relation === "ancestor"
                    ? filters.relation
                    : "none";
            const relationPageId = String(filters.relationPageId ?? "").trim();
            if (spaceId) params.set("space_id", spaceId);
            if (relation === "parent" && relationPageId) params.set("parent_id", relationPageId);
            if (relation === "ancestor" && relationPageId) params.set("ancestor_id", relationPageId);

            const response = await api.invoke(`/v2/wiki/pages?${params.toString()}`, { as: "user" });
            if (!response.ok) {
                throw new Error(await responseError(response, "动态内容加载失败"));
            }
            const result = (await response.json()) as WikiPagesResponse;
            const values = Array.isArray(result.values) ? [...result.values] : [];
            values.sort((left, right) => compareWikiItems(left, right, sort));
            return { ...result, page_size: pageSize, page_index: pageIndex, values };
        }

        const filters = payload?.spaceFilters ?? {};
        const keywords = String(filters.keywords ?? "").trim();
        if (keywords) params.set("keywords", keywords);
        const scopeType = String(filters.scopeType ?? "").trim();
        if (scopeType === "organization" || scopeType === "user_group" || scopeType === "user") {
            params.set("scope_type", scopeType);
        }
        if (filters.includeArchived) params.set("include_archived", "true");

        const response = await api.invoke(`/v2/wiki/spaces?${params.toString()}`, { as: "user" });
        if (!response.ok) {
            throw new Error(await responseError(response, "动态内容加载失败"));
        }
        const result = (await response.json()) as WikiSpacesResponse;
        const values = Array.isArray(result.values) ? [...result.values] : [];
        values.sort((left, right) => compareWikiItems(left, right, sort));
        return { ...result, page_size: pageSize, page_index: pageIndex, values };
    },
);

function compareWikiItems(
    left: unknown,
    right: unknown,
    sort: NonNullable<ListDynamicContentPayload["sort"]>,
): number {
    if (sort === "title_asc") {
        return wikiPageTitle(left).localeCompare(wikiPageTitle(right), "zh-CN");
    }
    const key = sort === "created_desc" ? "created" : "updated";
    return wikiPageTime(right, key) - wikiPageTime(left, key);
}

function wikiPageTitle(value: unknown): string {
    if (!isRecord(value)) return "";
    return String(value["name"] ?? value["title"] ?? "");
}

function wikiPageTime(value: unknown, key: "created" | "updated"): number {
    if (!isRecord(value)) return 0;
    const raw =
        key === "created"
            ? value["createdAt"] ?? value["created_at"]
            : value["updatedAt"] ?? value["updated_at"];
    const timestamp = Number(raw ?? 0);
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function responseError(response: Response, fallback: string): Promise<string> {
    try {
        const result = (await response.json()) as Record<string, unknown>;
        return String(result["message"] ?? result["error"] ?? `${fallback} (${response.status})`);
    } catch {
        return `${fallback} (${response.status})`;
    }
}

export { resolver };
