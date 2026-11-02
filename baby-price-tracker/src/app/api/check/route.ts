import { NextResponse } from "next/server";
import { checkAll } from "@/lib/tracker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 앱 화면의 '전체 지금 체크' 버튼용 (APP_PASSWORD 미들웨어로 보호) */
export async function POST() {
  const results = await checkAll();
  return NextResponse.json({ checked: results.length, alerted: results.filter((r) => r.alerted).length, results });
}
