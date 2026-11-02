import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

/** 공개키 조회 (브라우저 구독 시 필요) */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, configured: pushConfigured() });
}

export async function POST(req: Request) {
  const sub = (await req.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "잘못된 구독 정보" }, { status: 400 });
  }
  await run(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth, req.headers.get("user-agent")?.slice(0, 200) ?? null],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) await run("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
  return NextResponse.json({ ok: true });
}
