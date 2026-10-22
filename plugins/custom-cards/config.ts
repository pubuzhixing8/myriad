export type Alignment = "left" | "center" | "right";
export type CardType = "text" | "icon" | "image";
export type CardStyle = "classic" | "hover" | "flip";
export type CardIcon =
  | "none"
  | "file"
  | "link"
  | "star"
  | "bolt"
  | "user"
  | "lock"
  | "chart"
  | "check";
export type LinkType = "none" | "url" | "page";

export const MAX_CARDS = 12;

export interface CardImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  photographer: string;
  pageUrl: string;
}

export interface CardItem {
  id: string;
  title: string;
  text: string;
  icon: CardIcon;
  image: CardImage | null;
  linkType: LinkType;
  link: string;
  linkText: string;
}

export interface CardsConfig {
  align: Alignment;
  cardType: CardType;
  columns: 1 | 2 | 3 | 4 | 6;
  style: CardStyle;
  imageHeight: number;
  imageFit: "cover" | "contain";
  gap: number;
  padding: number;
  radius: number;
  border: boolean;
  shadow: boolean;
  accent: string;
  cards: CardItem[];
}

const sampleImages: CardImage[] = [
  {
    id: "pixabay:7276585",
    url: "https://cdn.pixabay.com/photo/2022/06/21/21/56/konigssee-7276585_1280.jpg",
    thumbnailUrl:
      "https://cdn.pixabay.com/photo/2022/06/21/21/56/konigssee-7276585_640.jpg",
    name: "Mountain lake",
    photographer: "ChiemSeherin",
    pageUrl: "https://pixabay.com/photos/k%C3%B6nigssee-mountains-7276585/",
  },
  {
    id: "pixabay:5337646",
    url: "https://cdn.pixabay.com/photo/2020/06/24/20/41/truebsee-5337646_1280.jpg",
    thumbnailUrl:
      "https://cdn.pixabay.com/photo/2020/06/24/20/41/truebsee-5337646_640.jpg",
    name: "Alpine lake",
    photographer: "suju-foto",
    pageUrl:
      "https://pixabay.com/photos/tr%C3%BCebsee-titlis-switzerland-5337646/",
  },
  {
    id: "pixabay:5499649",
    url: "https://cdn.pixabay.com/photo/2020/08/19/00/13/sea-5499649_1280.jpg",
    thumbnailUrl:
      "https://cdn.pixabay.com/photo/2020/08/19/00/13/sea-5499649_640.jpg",
    name: "Ocean wave",
    photographer: "Kanenori",
    pageUrl:
      "https://pixabay.com/photos/sea-wave-splash-big-wave-ocean-5499649/",
  },
];

const sampleCards: CardItem[] = [
  {
    id: "card-1",
    title: "Background Content",
    text: "把这段文字替换成你自己的内容。",
    icon: "bolt",
    image: sampleImages[0],
    linkType: "none",
    link: "",
    linkText: "了解更多",
  },
  {
    id: "card-2",
    title: "Button",
    text: "把这段文字替换成你自己的内容。",
    icon: "link",
    image: sampleImages[1],
    linkType: "none",
    link: "",
    linkText: "了解更多",
  },
  {
    id: "card-3",
    title: "Cards",
    text: "把这段文字替换成你自己的内容。",
    icon: "file",
    image: sampleImages[2],
    linkType: "none",
    link: "",
    linkText: "了解更多",
  },
];

export const DEFAULT_CONFIG: CardsConfig = {
  align: "left",
  cardType: "image",
  columns: 3,
  style: "hover",
  imageHeight: 140,
  imageFit: "cover",
  gap: 16,
  padding: 22,
  radius: 8,
  border: true,
  shadow: true,
  accent: "#3d5cf0",
  cards: sampleCards,
};

export function createCard(index: number): CardItem {
  return {
    id: `card-${Date.now()}-${index}`,
    title: `卡片 ${index}`,
    text: "",
    icon: "file",
    image: null,
    linkType: "none",
    link: "",
    linkText: "了解更多",
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function choice<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeConfig(value: unknown): CardsConfig {
  const source = record(value);
  if (!source)
    return {
      ...DEFAULT_CONFIG,
      cards: sampleCards.map((card) => ({ ...card })),
    };
  const cards = Array.isArray(source.cards)
    ? source.cards.slice(0, MAX_CARDS).map((item, index) => {
        const data = record(item) ?? {};
        const imageData = record(data.image);
        const image =
          imageData &&
          String(imageData.url ?? "").startsWith("https://cdn.pixabay.com/")
            ? {
                id: String(imageData.id ?? ""),
                url: String(imageData.url ?? ""),
                thumbnailUrl: String(imageData.thumbnailUrl ?? ""),
                name: String(imageData.name ?? ""),
                photographer: String(imageData.photographer ?? ""),
                pageUrl: String(imageData.pageUrl ?? ""),
              }
            : null;
        return {
          id: String(data.id ?? `card-${index}`),
          title: String(data.title ?? ""),
          text: String(data.text ?? ""),
          icon: choice(
            data.icon,
            [
              "none",
              "file",
              "link",
              "star",
              "bolt",
              "user",
              "lock",
              "chart",
              "check",
            ],
            "file",
          ),
          image,
          linkType: choice(
            data.linkType === "attachment" ? "url" : data.linkType,
            ["none", "url", "page"],
            "none",
          ),
          link: String(data.link ?? ""),
          linkText: String(data.linkText ?? ""),
        } satisfies CardItem;
      })
    : sampleCards.map((card) => ({ ...card }));

  return {
    align: choice(
      source.align,
      ["left", "center", "right"],
      DEFAULT_CONFIG.align,
    ),
    cardType: choice(
      source.cardType,
      ["text", "icon", "image"],
      DEFAULT_CONFIG.cardType,
    ),
    columns: choice(
      Number(source.columns),
      [1, 2, 3, 4, 6],
      DEFAULT_CONFIG.columns,
    ),
    style: choice(
      source.style,
      ["classic", "hover", "flip"],
      DEFAULT_CONFIG.style,
    ),
    imageHeight: numberInRange(source.imageHeight, 140, 60, 260),
    imageFit: choice(
      source.imageFit,
      ["cover", "contain"],
      DEFAULT_CONFIG.imageFit,
    ),
    gap: numberInRange(source.gap, 16, 0, 40),
    padding: numberInRange(source.padding, 22, 8, 48),
    radius: numberInRange(source.radius, 8, 0, 24),
    border: source.border !== false,
    shadow: source.shadow !== false,
    accent: /^#[\da-f]{6}$/i.test(String(source.accent ?? ""))
      ? String(source.accent)
      : DEFAULT_CONFIG.accent,
    cards: cards.length ? cards : [createCard(1)],
  };
}
