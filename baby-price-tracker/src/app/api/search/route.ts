import { NextResponse } from "next/server";
import { searchShop, isMockMode, type SortType } from "@/lib/naver";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [], mock: isMockMode() });
  const sort = (["sim", "date", "asc", "dsc"].includes(u.searchParams.get("sort") || "") ? u.searchParams.get("sort") : "sim") as SortType;
  const start = Number(u.searchParams.get("start") || 1);
  try {
    const items = await searchShop(q, { display: 40, start, sort });
    const tracked = new Set(
      (await all<{ naver_product_id: string }>("SELECT naver_product_id FROM products")).map((r) => r.naver_product_id),
    );
    return NextResponse.json({
      mock: isMockMode(),
      items: items.map((i) => ({ ...i, tracked: tracked.has(i.productId) })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
