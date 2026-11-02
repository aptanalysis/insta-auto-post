import { NextResponse } from "next/server";
import { sendToAll, pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!pushConfigured()) return NextResponse.json({ error: "VAPID 키가 설정되지 않았습니다" }, { status: 400 });
  const origin = new URL(req.url).origin;
  const r = await sendToAll({
    title: "🍼 테스트 알림",
    body: "알림이 정상적으로 도착했어요! 최저가가 뜨면 이렇게 알려드릴게요.",
    url: origin + "/favorites",
    tag: "test",
  });
  return NextResponse.json(r);
}
