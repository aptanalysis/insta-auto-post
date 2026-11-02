import { all, type ProductRow } from "./db";
import { usualPrice } from "./pricing";
import { defaultDropPct } from "./tracker";

export type ProductWithStats = ProductRow & { usual: number; changePct: number; dropPct: number; isDeal: boolean };

/** 각 상품의 평소가(최근 30일 중앙값)와 변동률을 함께 계산 */
export async function withStats(rows: ProductRow[]): Promise<ProductWithStats[]> {
  if (rows.length === 0) return [];
  const hist = await all<{ product_id: number; price: number }>(
    `SELECT product_id, price FROM price_history WHERE checked_at >= datetime('now', '-30 days')
     AND product_id IN (${rows.map(() => "?").join(",")}) ORDER BY checked_at`,
    rows.map((r) => r.id),
  );
  const by = new Map<number, number[]>();
  for (const h of hist) {
    const arr = by.get(Number(h.product_id)) ?? [];
    arr.push(Number(h.price));
    by.set(Number(h.product_id), arr);
  }
  return rows.map((r) => {
    // 마지막 기록(=현재가)은 제외하고 평소가 계산 → 알림 판단과 동일한 기준
    const prices = (by.get(r.id) ?? []).slice(0, -1);
    const usual = usualPrice(prices, r.initial_price);
    const cur = r.current_price ?? r.initial_price;
    const changePct = usual > 0 ? ((cur - usual) / usual) * 100 : 0;
    const dropPct = r.drop_pct ?? defaultDropPct();
    const isDeal = cur <= usual * (1 - dropPct / 100) || (r.target_price != null && cur <= r.target_price);
    return { ...r, usual, changePct, dropPct, isDeal };
  });
}

export async function listProducts(): Promise<ProductWithStats[]> {
  return withStats(await all<ProductRow>("SELECT * FROM products ORDER BY created_at DESC, id DESC"));
}
