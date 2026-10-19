import { Resolver } from "@pc-nexus/core";
import { api } from "@pc-nexus/network";

const resolver = new Resolver();

interface ListWikiPagesPayload {
    spaceId?: string;
    pageIndex?: number;
    pageSize?: number;
}

interface GetWikiPagesPayload {
    pageIds?: string[];
}

interface WikiPagesResponse {
    page_size?: number;
    page_index?: number;
    total?: number;
    values?: unknown[];
}

resolver.define<ListWikiPagesPayload, WikiPagesResponse>(
    "listWikiPages",
    async (_context, payload) => {
        const pageIndex = Math.max(0, Number(payload?.pageIndex) || 0);
        const pageSize = Math.min(50, Math.max(1, Number(payload?.pageSize) || 12));
        const spaceId = String(payload?.spaceId ?? "").trim();
        const params = new URLSearchParams({
            page_index: String(pageIndex),
            page_size: String(pageSize),
        });
        if (spaceId) params.set("space_id", spaceId);

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

async function responseError(response: Response, fallback: string): Promise<string> {
    try {
        const result = (await response.json()) as Record<string, unknown>;
        return String(result["message"] ?? result["error"] ?? `${fallback} (${response.status})`);
    } catch {
        return `${fallback} (${response.status})`;
    }
}

export { resolver };
