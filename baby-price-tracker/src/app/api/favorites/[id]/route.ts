import { NextResponse } from "next/server";
import { all, one, run, type ProductRow } from "@/lib/db";
import { checkProduct } from "@/lib/tracker";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  const item = await one<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  const history = await all("SELECT price, mall_name, checked_at FROM price_history WHERE product_id = ? ORDER BY checked_at", [id]);
  const alerts = await all("SELECT * FROM alerts WHERE product_id = ? ORDER BY created_at DESC LIMIT 20", [id]);
  return NextResponse.json({ item, history, alerts });
}

/** 목표가 / 알림 기준(%) 변경. null 이면 해제(기본값 사용) */
export async function PATCH(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  const b = (await req.json()) as { target_price?: number | null; drop_pct?: number | null };
  const num = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));
  if ("target_price" in b) {
    const t = num(b.target_price);
    if (t !== null && !(t > 0)) return NextResponse.json({ error: "목표가는 0보다 커야 합니다" }, { status: 400 });
    await run("UPDATE products SET target_price = ?, last_alert_price = NULL WHERE id = ?", [t === null ? null : Math.round(t), id]);
  }
  if ("drop_pct" in b) {
    const d = num(b.drop_pct);
    if (d !== null && !(d > 0 && d < 100)) return NextResponse.json({ error: "알림 기준은 0~100% 사이" }, { status: 400 });
    await run("UPDATE products SET drop_pct = ?, last_alert_price = NULL WHERE id = ?", [d, id]);
  }
  return NextResponse.json({ item: await one("SELECT * FROM products WHERE id = ?", [id]) });
}

/** 지금 바로 가격 체크 */
export async function POST(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  const p = await one<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ result: await checkProduct(p) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  await run("DELETE FROM alerts WHERE product_id = ?", [id]);
  await run("DELETE FROM price_history WHERE product_id = ?", [id]);
  await run("DELETE FROM products WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
