import { cleanTitle } from "./format";

/** 네이버 쇼핑 검색 API 응답 아이템 (필요한 필드만 정규화) */
export type ShopItem = {
  productId: string;
  title: string;
  link: string;
  image: string;
  price: number; // lprice: 최저가
  mallName: string;
  brand: string;
  maker: string;
  productType: number;
  category: string;
};

export type SortType = "sim" | "date" | "asc" | "dsc";

type RawItem = {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
};

const ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

export function isMockMode(): boolean {
  return !process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET;
}

function normalize(r: RawItem): ShopItem {
  return {
    productId: r.productId,
    title: cleanTitle(r.title),
    link: r.link,
    image: r.image,
    price: Number(r.lprice) || 0,
    mallName: r.mallName === "네이버" ? "네이버 가격비교" : r.mallName,
    brand: r.brand,
    maker: r.maker,
    productType: Number(r.productType) || 0,
    category: [r.category1, r.category2, r.category3, r.category4].filter(Boolean).join(" > "),
  };
}

/**
 * 네이버 쇼핑 검색. 중고/렌탈/해외직구는 제외.
 * 가격비교(productType 1) 상품은 여러 쇼핑몰 중 최저가(lprice)와 가격비교 페이지 링크를 돌려준다.
 */
export async function searchShop(
  query: string,
  opts: { display?: number; start?: number; sort?: SortType } = {},
): Promise<ShopItem[]> {
  const display = Math.min(Math.max(opts.display ?? 40, 1), 100);
  const start = Math.min(Math.max(opts.start ?? 1, 1), 1000);
  const sort = opts.sort ?? "sim";
  if (isMockMode()) return mockSearch(query, display, start, sort);

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("start", String(start));
  url.searchParams.set("sort", sort);
  url.searchParams.set("exclude", "used:rental:cbshop");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Naver API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { items?: RawItem[] };
  return (json.items ?? []).map(normalize).filter((i) => i.price > 0);
}

// ─────────────────────────── 동일 상품 판별 ───────────────────────────

/** 비교용 토큰: 소문자, 특수문자 제거, 1글자 한글 조사 등은 유지 */
export function tokens(title: string): string[] {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** 수량/용량/단계 등 숫자 정보 (예: 4단계, 56매, 800g, 3팩). 숫자가 다르면 다른 상품으로 본다 */
export function numericSignature(title: string): string {
  const nums = cleanTitle(title)
    .toLowerCase()
    .match(/\d+(?:\.\d+)?\s*(?:단계|매|g|kg|ml|l|개|팩|입|박스|box|p|ea|세트|개월|호|cm|mm)?/g);
  return (nums ?? [])
    .map((n) => n.replace(/\s+/g, ""))
    .sort()
    .join("|");
}

export function similarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** 같은 상품을 다른 쇼핑몰에서 파는 것으로 볼 수 있는지 (보수적으로 판단) */
export function isSameProduct(trackedTitle: string, candidateTitle: string): boolean {
  if (numericSignature(trackedTitle) !== numericSignature(candidateTitle)) return false;
  return similarity(trackedTitle, candidateTitle) >= 0.6;
}

/** 추적 검색어: 제목에서 너무 긴 부분/괄호 제거 후 앞쪽 핵심 단어만 */
export function trackingQuery(title: string): string {
  const t = cleanTitle(title)
    .replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.split(" ").slice(0, 8).join(" ") || cleanTitle(title);
}

// ─────────────────────────── MOCK (API 키 없을 때) ───────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MOCK_MALLS = ["쿠팡", "11번가", "G마켓", "SSG.COM", "롯데ON", "옥션", "네이버 가격비교"];

function mockSearch(query: string, display: number, start: number, sort: SortType): ShopItem[] {
  const q = query.trim() || "육아용품";
  const base = q.split(" ").slice(0, 3).join(" ");
  const items: ShopItem[] = [];
  for (let i = 0; i < 30; i++) {
    const seed = hash(base + "#" + i);
    const basePrice = 5000 + (seed % 200) * 500;
    // 시간이 지나면 가격이 조금씩 출렁이도록 (알림 테스트용). 가끔 큰 할인.
    const hourSeed = hash(base + i + Math.floor(Date.now() / (10 * 60 * 1000)));
    const swing = ((hourSeed % 21) - 10) / 100; // -10%~+10%
    const deal = hourSeed % 7 === 0 ? -0.18 : 0;
    const price = Math.round((basePrice * (1 + swing + deal)) / 10) * 10;
    const pid = String(80000000000 + (seed % 900000000));
    items.push({
      productId: pid,
      title: `[MOCK] ${base} ${["프리미엄", "베이직", "대용량", "신생아용", "특가"][seed % 5]} ${(seed % 4) + 1}팩`,
      link: `https://search.shopping.naver.com/catalog/${pid}`,
      image: `https://placehold.co/300x300/fde68a/78350f?text=${encodeURIComponent(base.slice(0, 6))}`,
      price,
      mallName: MOCK_MALLS[seed % MOCK_MALLS.length],
      brand: "MOCK",
      maker: "MOCK",
      productType: 1,
      category: "출산/육아",
    });
  }
  if (sort === "asc") items.sort((a, b) => a.price - b.price);
  if (sort === "dsc") items.sort((a, b) => b.price - a.price);
  return items.slice(start - 1, start - 1 + display);
}

/** MOCK 모드에서 추적 중인 상품의 '현재 가격'을 흉내낸다 (10분마다 변동, 가끔 큰 할인) */
export function mockCurrentPrice(productId: string, initialPrice: number): number {
  const s = hash(productId + Math.floor(Date.now() / (10 * 60 * 1000)));
  const swing = ((s % 13) - 6) / 100; // -6%~+6%
  const deal = s % 5 === 0 ? -0.15 : 0;
  return Math.round((initialPrice * (1 + swing + deal)) / 10) * 10;
}
