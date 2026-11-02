import { listProducts } from "@/lib/stats";
import { getCategory } from "@/lib/categories";
import { pct, relTime, won } from "@/lib/format";
import { CheckAllButton, ProductActions } from "@/components/Actions";

export const dynamic = "force-dynamic";

export default async function Favorites() {
  const items = await listProducts();
  const deals = items.filter((i) => i.isDeal).length;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ marginRight: "auto" }}>⭐ 관심상품 <span className="muted small">{items.length}개 추적 중 · 특가 {deals}개</span></h1>
        {items.length > 0 && <CheckAllButton />}
      </div>
      {items.length === 0 ? (
        <div className="card empty">아직 추적 중인 상품이 없어요. <a href="/" style={{ color: "var(--accent)" }}>카테고리에서 골라보세요 →</a></div>
      ) : (
        <div className="list">
          {items.map((p) => {
            const cat = p.category_slug ? getCategory(p.category_slug) : undefined;
            return (
              <div key={p.id} className="card row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image || ""} alt="" />
                <div style={{ minWidth: 0 }}>
                  <a href={`/product/${p.id}`} className="t">{p.title}</a>
                  <div className="small muted">
                    {cat ? `${cat.emoji} ${cat.name} · ` : ""}평소 {won(p.usual)} · 최저 {won(p.lowest_price)}
                    {p.target_price ? ` · 목표 ${won(p.target_price)}` : ""}
                  </div>
                  <div className="small muted">
                    {p.check_error ? <span className="up">⚠️ {p.check_error}</span> : `확인 ${relTime(p.last_checked_at)}`}
                  </div>
                </div>
                <div className="right">
                  <div>
                    <div className={"price " + (p.isDeal ? "down" : "")}>{won(p.current_price)}</div>
                    <div className="mall">{p.current_mall}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {p.isDeal ? <span className="badge good">{p.changePct <= -p.dropPct ? `특가 ${pct(p.changePct)}` : "🎯 목표가 도달"}</span>
                      : <span className={"badge " + (p.changePct > 0.5 ? "warn" : "neutral")}>{pct(p.changePct)}</span>}
                    <ProductActions id={p.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
