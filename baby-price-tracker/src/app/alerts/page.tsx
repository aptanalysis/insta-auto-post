import { all } from "@/lib/db";
import { relTime, won } from "@/lib/format";

export const dynamic = "force-dynamic";

type A = { id: number; product_id: number; price: number; usual_price: number; mall_name: string; link: string; reason: string; created_at: string; title: string; image: string };

export default async function Alerts() {
  const items = await all<A>(
    `SELECT a.*, p.title, p.image FROM alerts a JOIN products p ON p.id = a.product_id ORDER BY a.created_at DESC LIMIT 100`,
  );
  return (
    <>
      <h1>🔔 알림 내역</h1>
      {items.length === 0 ? <div className="card empty">아직 최저가 알림이 없어요.</div> : (
        <div className="list">
          {items.map((a) => (
            <div key={a.id} className="card row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.image || ""} alt="" />
              <a href={`/product/${a.product_id}`} style={{ minWidth: 0 }}>
                <div className="t">{a.title}</div>
                <div className="small muted">{a.reason} · 평소 {won(a.usual_price)} · {relTime(a.created_at)}</div>
              </a>
              <div className="right">
                <span className="price down">{won(a.price)}</span>
                <a className="btn sm" href={a.link} target="_blank" rel="noopener noreferrer">{a.mall_name} →</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
