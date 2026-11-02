import { NextResponse, type NextRequest } from "next/server";

/** APP_PASSWORD 가 설정되어 있으면 간단한 Basic 인증으로 앱을 보호 */
export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();
  const h = req.headers.get("authorization");
  if (h?.startsWith("Basic ")) {
    try {
      const [, pass] = atob(h.slice(6)).split(/:(.*)/s);
      if (pass === pw) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("인증이 필요합니다", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="baby-price-tracker", charset="UTF-8"' },
  });
}

export const config = {
  // 크론 엔드포인트(자체 비밀값 사용), 서비스워커, 매니페스트, 아이콘은 제외
  matcher: ["/((?!api/cron|sw.js|manifest.webmanifest|icon|_next/static|_next/image|favicon).*)"],
};
