import { notFound } from "next/navigation";
import { all, one, type Offer, type ProductRow } from "@/lib/db";
import { withStats } from "@/lib/stats";
import { defaultDropPct } from "@/lib/tracker";
import { pct, relTime, won } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import { AlertSettings, ProductActions } from "@/components/Actions";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const row = await one<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  if (!row) notFound();
  const [p] = await withStats([row]);
  const history = await all<{ price: number; mall_name: string; checked_at: string }>(
    "SELECT price, mall_name, checked_at FROM price_history WHERE product_id = ? ORDER BY checked_at", [id],
  );
  const alerts = await all<{ id: number; price: number; usual_price: number; mall_name: string; link: string; reason: string; created_at: string }>(
    "SELECT * FROM alerts WHERE product_id = ? ORDER BY created_at DESC LIMIT 20", [id],
  );
  let offers: Offer[] = [];
  try { offers = row.offers_json ? JSON.parse(row.offers_json) : []; } catch {}

  return (
    <>
      <p className="small"><a href="/favorites" className="muted">← 관심상품</a></p>
      <div className="detail">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image || ""} alt="" />
        <div>
          <h1 style={{ fontSize: 20 }}>{p.title}</h1>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className={"price " + (p.isDeal ? "down" : "")} style={{ fontSize: 28 }}>{won(p.current_price)}</span>
            <span className="muted">{p.current_mall}</span>
            {p.isDeal ? <span className="badge good">{p.changePct <= -p.dropPct ? `특가 ${pct(p.changePct)}` : "🎯 목표가 도달"}</span> : <span className="badge neutral">평소 대비 {pct(p.changePct)}</span>}
          </div>
          <p className="small muted">마지막 확인 {relTime(p.last_checked_at)}{p.check_error ? ` · ⚠️ ${p.check_error}` : ""}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
            <a className="btn primary" href={p.current_link || p.link || "#"} target="_blank" rel="noopener noreferrer">🛒 최저가로 구매하러 가기</a>
            <ProductActions id={p.id} redirectAfterDelete />
          </div>
          <div className="stats">
            <div className="card stat"><div className="k">평소 가격 (30일 중앙값)</div><div className="v">{won(p.usual)}</div></div>
            <div className="card stat"><div className="k">역대 최저가</div><div className="v">{won(p.lowest_price)}</div></div>
            <div className="card stat"><div className="k">등록 시 가격</div><div className="v">{won(p.initial_price)}</div></div>
          </div>
        </div>
      </div>

      <h2>📈 가격 추이</h2>
      <div className="card pad"><PriceChart points={history} usual={p.usual} target={p.target_price} /></div>

      <h2>🏬 쇼핑몰별 가격</h2>
      <div className="card pad">
        {offers.length === 0 ? <p className="muted small">아직 비교 데이터가 없어요. ‘지금 체크’를 눌러보세요.</p> : (
          <table>
            <thead><tr><th>쇼핑몰</th><th className="num">가격</th><th></th></tr></thead>
            <tbody>
              {offers.map((o, i) => (
                <tr key={i}>
                  <td>{o.mallName}{o.exact ? <span className="badge neutral" style={{ marginLeft: 6 }}>추적 상품</span> : null}{i === 0 ? <span className="badge good" style={{ marginLeft: 6 }}>최저</span> : null}</td>
                  <td className="num">{won(o.price)}</td>
                  <td className="num"><a href={o.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>이동 →</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>‘네이버 가격비교’는 여러 쇼핑몰(쿠팡·11번가·G마켓·SSG 등) 중 최저가를 모아 보여주는 페이지예요. 같은 상품명/용량의 개별 판매처도 함께 비교해요.</p>
      </div>

      <h2>🔔 알림 조건</h2>
      <div className="card pad">
        <p className="small muted" style={{ marginTop: 0 }}>현재: 평소가 대비 <b>{p.dropPct}%</b> 이상 할인{p.target_price ? <> 또는 <b>{won(p.target_price)}</b> 이하</> : null}일 때 알림</p>
        <AlertSettings id={p.id} target={p.target_price} drop={p.drop_pct} defaultDrop={defaultDropPct()} />
      </div>

      <h2>알림 기록</h2>
      <div className="card pad">
        {alerts.length === 0 ? <p className="muted small" style={{ margin: 0 }}>아직 보낸 알림이 없어요.</p> : (
          <table>
            <thead><tr><th>시각</th><th>사유</th><th className="num">가격</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}><td className="small">{relTime(a.created_at)}</td><td className="small">{a.reason} · {a.mall_name}</td><td className="num">{won(a.price)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
