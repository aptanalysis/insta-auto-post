import { CATEGORIES } from "@/lib/categories";
import { all, type ProductRow } from "@/lib/db";
import { won } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const deals = await all<ProductRow & { alert_reason: string | null }>(
    `SELECT p.*, (SELECT reason FROM alerts a WHERE a.product_id = p.id ORDER BY a.created_at DESC LIMIT 1) AS alert_reason
     FROM products p WHERE p.last_alert_price IS NOT NULL ORDER BY p.last_alert_at DESC LIMIT 6`,
  );
  const count = (await all<{ n: number }>("SELECT COUNT(*) AS n FROM products"))[0]?.n ?? 0;

  return (
    <>
      <h1>어떤 육아템을 찾고 계세요?</h1>
      <p className="muted">카테고리에서 상품을 고르고 <b>☆ 추적</b>을 누르면, 여러 쇼핑몰 가격을 계속 확인해서 평소보다 싸지면 알림을 보내드려요.</p>
      <form action="/search" className="searchbar" style={{ margin: "14px 0 20px" }}>
        <input className="input" name="q" placeholder="상품명으로 바로 검색" />
        <button className="btn primary">검색</button>
      </form>

      <div className="cat-grid">
        {CATEGORIES.map((c) => (
          <a key={c.slug} href={`/category/${c.slug}`} className="card cat">
            <span className="emoji">{c.emoji}</span>
            <span className="name">{c.name}</span>
            <span className="muted small">{c.keywords.slice(0, 2).join(", ")}</span>
          </a>
        ))}
      </div>

      <h2>🔥 지금 특가인 관심상품</h2>
      {deals.length === 0 ? (
        <div className="card empty">
          {count === 0 ? "아직 추적 중인 상품이 없어요. 카테고리에서 상품을 추가해보세요!" : `추적 중인 ${count}개 상품 중 아직 특가가 없어요. 가격이 내려가면 알려드릴게요.`}
        </div>
      ) : (
        <div className="list">
          {deals.map((p) => (
            <a key={p.id} href={`/product/${p.id}`} className="card row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image || ""} alt="" />
              <div>
                <div className="t">{p.title}</div>
                <div className="small muted">{p.alert_reason}</div>
              </div>
              <div className="right">
                <span className="price down">{won(p.current_price)}</span>
                <span className="mall">{p.current_mall}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
