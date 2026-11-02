import { pushConfigured } from "@/lib/push";
import { isMockMode } from "@/lib/naver";
import { all } from "@/lib/db";
import { defaultDropPct } from "@/lib/tracker";
import PushControls from "@/components/PushControls";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const devices = (await all<{ n: number }>("SELECT COUNT(*) AS n FROM push_subscriptions"))[0]?.n ?? 0;
  const ok = (b: boolean) => (b ? <span className="badge good">설정됨</span> : <span className="badge warn">미설정</span>);
  return (
    <>
      <h1>설정</h1>
      <div className="card pad">
        <h2 style={{ marginTop: 0 }}>🔔 이 기기에서 알림 받기</h2>
        <PushControls />
        <p className="small muted">등록된 기기: {devices}대</p>
        <details className="small muted">
          <summary>아이폰/안드로이드에서 앱처럼 쓰려면</summary>
          <ul>
            <li><b>아이폰(iOS 16.4+)</b>: Safari에서 공유 버튼 → <b>홈 화면에 추가</b> → 홈 화면 아이콘으로 앱을 연 뒤 ‘알림 켜기’. (Safari 탭에서는 웹 푸시가 안 돼요)</li>
            <li><b>안드로이드</b>: Chrome 메뉴 → <b>앱 설치</b>(또는 홈 화면에 추가) 후 ‘알림 켜기’.</li>
            <li>웹 푸시는 <b>HTTPS</b> 주소(또는 localhost)에서만 동작해요.</li>
          </ul>
        </details>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>⚙️ 서버 상태</h2>
        <table>
          <tbody>
            <tr><td>네이버 쇼핑 API</td><td>{isMockMode() ? <span className="badge warn">MOCK 모드</span> : <span className="badge good">연결됨</span>}</td></tr>
            <tr><td>웹 푸시 VAPID 키</td><td>{ok(pushConfigured())}</td></tr>
            <tr><td>자동 체크 비밀값 (CRON_SECRET)</td><td>{ok(Boolean(process.env.CRON_SECRET))}</td></tr>
            <tr><td>앱 비밀번호 (APP_PASSWORD)</td><td>{ok(Boolean(process.env.APP_PASSWORD))}</td></tr>
            <tr><td>기본 할인 알림 기준</td><td>평소가 대비 {defaultDropPct()}% 이상</td></tr>
          </tbody>
        </table>
        <p className="small muted">설정 방법은 README.md를 참고하세요.</p>
      </div>
    </>
  );
}
