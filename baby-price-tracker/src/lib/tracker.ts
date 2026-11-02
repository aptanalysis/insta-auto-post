import { all, one, run, type Offer, type ProductRow } from "./db";
import { isMockMode, isSameProduct, mockCurrentPrice, searchShop, trackingQuery, type ShopItem } from "./naver";
import { decideAlert, usualPrice } from "./pricing";
import { pushConfigured, sendToAll } from "./push";
import { won } from "./format";

export function defaultDropPct(): number {
  const n = Number(process.env.DEFAULT_DROP_PCT);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/** 즐겨찾기(추적) 등록 */
export async function addProduct(item: ShopItem, categorySlug: string | null): Promise<ProductRow> {
  await run(
    `INSERT INTO products (naver_product_id, title, image, link, mall_name, brand, category_slug, query,
       initial_price, current_price, current_mall, current_link, lowest_price, lowest_at, last_checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(naver_product_id) DO NOTHING`,
    [
      item.productId, item.title, item.image, item.link, item.mallName, item.brand || null, categorySlug,
      trackingQuery(item.title), item.price, item.price, item.mallName, item.link, item.price,
    ],
  );
  const row = (await one<ProductRow>("SELECT * FROM products WHERE naver_product_id = ?", [item.productId]))!;
  const hasHistory = await one("SELECT 1 FROM price_history WHERE product_id = ? LIMIT 1", [row.id]);
  if (!hasHistory) {
    await run("INSERT INTO price_history (product_id, price, mall_name) VALUES (?, ?, ?)", [row.id, item.price, item.mallName]);
  }
  return row;
}

async function findOffers(p: ProductRow): Promise<Offer[]> {
  if (isMockMode()) {
    const price = mockCurrentPrice(p.naver_product_id, p.initial_price);
    return [
      { mallName: p.mall_name || "네이버 가격비교", price, link: p.link || "", title: p.title, exact: true },
      { mallName: "쿠팡", price: Math.round((price * 1.04) / 10) * 10, link: p.link || "", title: p.title, exact: false },
      { mallName: "11번가", price: Math.round((price * 1.07) / 10) * 10, link: p.link || "", title: p.title, exact: false },
    ];
  }
  // 1) 관련도순, 2) 못 찾으면 가격 낮은순으로 한 번 더
  let items = await searchShop(p.query, { display: 100, sort: "sim" });
  if (!items.some((i) => i.productId === p.naver_product_id)) {
    await sleep(150);
    items = items.concat(await searchShop(p.query, { display: 100, sort: "asc" }));
  }
  const byMall = new Map<string, Offer>();
  for (const it of items) {
    const exact = it.productId === p.naver_product_id;
    if (!exact && !isSameProduct(p.title, it.title)) continue;
    const key = exact ? "__exact__" : it.mallName;
    const prev = byMall.get(key);
    if (!prev || it.price < prev.price) {
      byMall.set(key, { mallName: it.mallName, price: it.price, link: it.link, title: it.title, exact });
    }
  }
  return [...byMall.values()].sort((a, b) => a.price - b.price);
}

export type CheckResult = {
  id: number;
  title: string;
  ok: boolean;
  price?: number;
  usual?: number;
  alerted?: boolean;
  reasons?: string[];
  error?: string;
};

export async function checkProduct(p: ProductRow): Promise<CheckResult> {
  let offers: Offer[];
  try {
    offers = await findOffers(p);
  } catch (e) {
    const msg = (e as Error).message;
    await run("UPDATE products SET check_error = ?, last_checked_at = datetime('now') WHERE id = ?", [msg, p.id]);
    return { id: p.id, title: p.title, ok: false, error: msg };
  }
  if (offers.length === 0) {
    const msg = "검색 결과에서 상품을 찾지 못했습니다 (품절/판매종료 가능)";
    await run("UPDATE products SET check_error = ?, last_checked_at = datetime('now') WHERE id = ?", [msg, p.id]);
    return { id: p.id, title: p.title, ok: false, error: msg };
  }

  const best = offers[0];
  const prev = await all<{ price: number }>(
    "SELECT price FROM price_history WHERE product_id = ? AND checked_at >= datetime('now', '-30 days')",
    [p.id],
  );
  const usual = usualPrice(prev.map((r) => Number(r.price)), p.initial_price);
  const decision = decideAlert({
    current: best.price,
    usual,
    dropPct: p.drop_pct ?? defaultDropPct(),
    targetPrice: p.target_price,
    lowestEver: p.lowest_price,
    lastAlertPrice: p.last_alert_price,
  });

  const newLowest = p.lowest_price == null || best.price < p.lowest_price;
  await run("INSERT INTO price_history (product_id, price, mall_name) VALUES (?, ?, ?)", [p.id, best.price, best.mallName]);
  await run(
    `UPDATE products SET current_price = ?, current_mall = ?, current_link = ?, offers_json = ?,
       lowest_price = ?, lowest_at = CASE WHEN ? THEN datetime('now') ELSE lowest_at END,
       last_alert_price = ?, last_alert_at = CASE WHEN ? THEN datetime('now') ELSE last_alert_at END,
       check_error = NULL, last_checked_at = datetime('now')
     WHERE id = ?`,
    [
      best.price, best.mallName, best.link, JSON.stringify(offers.slice(0, 10)),
      newLowest ? best.price : p.lowest_price, newLowest ? 1 : 0,
      decision.nextLastAlertPrice, decision.alert ? 1 : 0,
      p.id,
    ],
  );

  if (decision.alert) {
    const reason = decision.reasons.join(" · ");
    await run(
      "INSERT INTO alerts (product_id, price, usual_price, mall_name, link, reason) VALUES (?, ?, ?, ?, ?, ?)",
      [p.id, best.price, usual, best.mallName, best.link, reason],
    );
    if (pushConfigured()) {
      try {
        await sendToAll({
          title: `📉 ${won(best.price)} · ${p.title.slice(0, 40)}`,
          body: `${reason}\n평소 ${won(usual)} → ${best.mallName}에서 ${won(best.price)}`,
          url: best.link,
          image: p.image,
          tag: `product-${p.id}`,
        });
      } catch (e) {
        console.error("[tracker] push error", (e as Error).message);
      }
    }
  }

  return { id: p.id, title: p.title, ok: true, price: best.price, usual, alerted: decision.alert, reasons: decision.reasons };
}

export async function checkAll(): Promise<CheckResult[]> {
  const products = await all<ProductRow>("SELECT * FROM products ORDER BY id");
  const results: CheckResult[] = [];
  for (const p of products) {
    results.push(await checkProduct(p));
    if (!isMockMode()) await sleep(250); // 네이버 API 초당 호출 제한 여유
  }
  return results;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
