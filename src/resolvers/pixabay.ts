import { Resolver } from "@pc-nexus/core";
import { fetch } from "@pc-nexus/network";

interface SearchPayload {
  query?: string;
  color?: string;
  orientation?: "landscape" | "portrait";
  locale?: "zh-CN" | "en-US";
  page?: number;
}

interface PixabayPhoto {
  id: number;
  tags: string;
  user: string;
  pageURL: string;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
}

interface PixabayResponse {
  hits: PixabayPhoto[];
  totalHits: number;
}

interface PhotoResult {
  id: string;
  name: string;
  photographer: string;
  imageUrl: string;
  thumbnailUrl: string;
  pageUrl: string;
}

interface SearchResult {
  photos: PhotoResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

const PAGE_SIZE = 24;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const ALLOWED_COLORS = new Set([
  "red",
  "orange",
  "yellow",
  "green",
  "turquoise",
  "blue",
  "lilac",
  "pink",
  "brown",
  "black",
  "gray",
  "white",
]);
const cache = new Map<string, { expiresAt: number; result: SearchResult }>();
const backgroundResolver = new Resolver();

backgroundResolver.define<SearchPayload, SearchResult>(
  "searchPixabayPhotos",
  async (_context, payload) => {
    const apiKey = process.env["PIXABAY_API_KEY"];
    if (!apiKey) {
      throw new Error("PIXABAY_API_KEY_NOT_CONFIGURED");
    }

    const query = String(payload?.query ?? "")
      .trim()
      .slice(0, 100);
    const page = Math.max(1, Math.min(21, Number(payload?.page) || 1));
    const color = payload?.color === "violet" ? "lilac" : payload?.color;
    const orientation =
      payload?.orientation === "landscape"
        ? "horizontal"
        : payload?.orientation === "portrait"
          ? "vertical"
          : "all";
    const locale = payload?.locale === "zh-CN" ? "zh" : "en";
    const cacheKey = JSON.stringify({
      query,
      page,
      color,
      orientation,
      locale,
    });
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const params = new URLSearchParams({
      key: apiKey,
      image_type: "photo",
      min_width: "1280",
      orientation,
      lang: locale,
      safesearch: "true",
      page: String(page),
      per_page: String(PAGE_SIZE),
    });
    if (query) {
      params.set("q", query);
    }
    if (color && ALLOWED_COLORS.has(color)) {
      params.set("colors", color);
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("PIXABAY_SEARCH_TIMEOUT")),
        4000,
      );
    });
    let responseData: PixabayResponse;
    try {
      responseData = await Promise.race([
        (async () => {
          const response = await fetch.request(
            `https://pixabay.com/api/?${params}`,
            {
              headers: {
                "User-Agent": "Myriad/1.0 Pixabay image search",
                "Accept-Encoding": "identity",
              },
            },
          );
          if (!response.ok) {
            throw new Error(`PIXABAY_SEARCH_FAILED_${response.status}`);
          }
          return response.json() as Promise<PixabayResponse>;
        })(),
        timeout,
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    const photos = responseData.hits.map((photo) => {
      const cdnPhoto = photo.previewURL.match(
        /^(https:\/\/cdn\.pixabay\.com\/photo\/.*)_150\.(jpe?g|png)$/i,
      );
      return {
        id: `pixabay:${photo.id}`,
        name: photo.tags || `Photo ${photo.id}`,
        photographer: photo.user,
        imageUrl: cdnPhoto
          ? `${cdnPhoto[1]}_1280.${cdnPhoto[2]}`
          : photo.largeImageURL || photo.webformatURL,
        thumbnailUrl: cdnPhoto
          ? `${cdnPhoto[1]}_640.${cdnPhoto[2]}`
          : photo.webformatURL || photo.previewURL,
        pageUrl: photo.pageURL,
      };
    });
    const total = responseData.totalHits;
    const result = {
      photos,
      total,
      page,
      hasMore: page * PAGE_SIZE < total && photos.length > 0,
    };

    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_DURATION_MS, result });
    return result;
  },
);

export { backgroundResolver };
