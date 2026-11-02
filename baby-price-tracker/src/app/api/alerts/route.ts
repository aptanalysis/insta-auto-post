import { NextResponse } from "next/server";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await all(
    `SELECT a.*, p.title, p.image FROM alerts a JOIN products p ON p.id = a.product_id
     ORDER BY a.created_at DESC LIMIT 50`,
  );
  return NextResponse.json({ items: rows });
}
