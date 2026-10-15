export interface BackgroundPhoto {
  id: string;
  name: string;
  category: "山川" | "森林" | "海洋" | "城市" | "原野" | "花卉";
  url: string;
}

// These are direct, verified Unsplash image URLs. Keep the selected URL in block config.
export const BACKGROUNDS: BackgroundPhoto[] = [
  { id: "mountain-lake", name: "山间湖泊", category: "山川", url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=85" },
  { id: "forest", name: "森林光影", category: "森林", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85" },
  { id: "ocean", name: "蓝色海面", category: "海洋", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1800&q=85" },
  { id: "city", name: "城市夜色", category: "城市", url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85" },
  { id: "field", name: "开阔原野", category: "原野", url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=85" },
  { id: "flowers", name: "春日花朵", category: "花卉", url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1800&q=85" },
];

export const CATEGORIES = ["全部", "山川", "森林", "海洋", "城市", "原野", "花卉"] as const;

export type VerticalAlign = "top" | "center" | "bottom";

export interface BackgroundConfig {
  imageId: string;
  verticalAlign: VerticalAlign;
  opacity?: number;
}

export function getBackground(config?: Partial<BackgroundConfig>): BackgroundPhoto {
  return BACKGROUNDS.find((item) => item.id === config?.imageId) ?? BACKGROUNDS[0];
}
