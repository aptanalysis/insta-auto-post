/**
 * 서버 없이 바로 가격 체크 실행:  npm run check
 * (자체 서버에서 crontab 으로 돌리거나, GitHub Actions 에서 직접 실행할 때 사용)
 */
import fs from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) process.loadEnvFile(f);
}

async function main() {
  const { checkAll } = await import("../src/lib/tracker");
  const results = await checkAll();
  for (const r of results) {
    const line = r.ok
      ? `${r.alerted ? "🔔" : "  "} #${r.id} ${r.price?.toLocaleString()}원 (평소 ${r.usual?.toLocaleString()}원) ${r.reasons?.join(", ") ?? ""}`
      : `⚠️  #${r.id} ${r.error}`;
    console.log(line, "-", r.title.slice(0, 40));
  }
  console.log(`\n총 ${results.length}개 확인, 알림 ${results.filter((r) => r.alerted).length}건, 오류 ${results.filter((r) => !r.ok).length}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
