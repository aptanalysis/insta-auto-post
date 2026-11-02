import { NextResponse } from "next/server";
import { checkAll } from "@/lib/tracker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 주기적 가격 체크. 외부 스케줄러(GitHub Actions, Vercel Cron, crontab 등)에서 호출.
 *   Authorization: Bearer <CRON_SECRET>   또는   ?secret=<CRON_SECRET>
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || u.searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await checkAll();
  return NextResponse.json({
    checked: results.length,
    alerted: results.filter((r) => r.alerted).length,
    errors: results.filter((r) => !r.ok).length,
    results,
  });
}

export const GET = handle;
export const POST = handle;
