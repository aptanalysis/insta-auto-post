import { NextResponse } from "next/server";
import { listProducts } from "@/lib/stats";
import { addProduct } from "@/lib/tracker";
import type { ShopItem } from "@/lib/naver";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listProducts();
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { item?: ShopItem; category?: string | null };
  const it = body.item;
  if (!it?.productId || !it.title || !(Number(it.price) > 0)) {
    return NextResponse.json({ error: "잘못된 상품 정보" }, { status: 400 });
  }
  const row = await addProduct(
    {
      productId: String(it.productId),
      title: String(it.title).slice(0, 300),
      link: String(it.link || ""),
      image: String(it.image || ""),
      price: Math.round(Number(it.price)),
      mallName: String(it.mallName || ""),
      brand: String(it.brand || ""),
      maker: String(it.maker || ""),
      productType: Number(it.productType) || 0,
      category: String(it.category || ""),
    },
    body.category ?? null,
  );
  return NextResponse.json({ item: row });
}
