"use client";
import { useCallback, useEffect, useState } from "react";
import { won } from "@/lib/format";
import { useToast } from "./useToast";

type Item = {
  productId: string; title: string; link: string; image: string; price: number;
  mallName: string; brand: string; maker: string; productType: number; category: string; tracked: boolean;
};

const SORTS = [
  { v: "sim", label: "관련도순" },
  { v: "asc", label: "낮은 가격순" },
  { v: "dsc", label: "높은 가격순" },
  { v: "date", label: "최신순" },
];

export default function SearchPanel({
  keywords = [], category = null, initialQuery = "",
}: { keywords?: string[]; category?: string | null; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [active, setActive] = useState(initialQuery);
  const [sort, setSort] = useState("sim");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const search = useCallback(async (query: string, s: string) => {
    if (!query.trim()) return;
    setActive(query); setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&sort=${s}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "검색 실패");
      setItems(j.items);
    } catch (e) {
      setError((e as Error).message); setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (initialQuery) search(initialQuery, "sim"); }, [initialQuery, search]);

  async function track(it: Item) {
    const r = await fetch("/api/favorites", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ item: it, category }),
    });
    if (r.ok) {
      setItems((xs) => xs.map((x) => (x.productId === it.productId ? { ...x, tracked: true } : x)));
      toast.show("⭐ 관심상품에 추가했어요. 가격을 계속 추적할게요!");
    } else {
      toast.show("추가 실패: " + ((await r.json().catch(() => ({}))).error || r.status));
    }
  }

  return (
    <div>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); search(q, sort); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명, 브랜드로 검색 (예: 하기스 네이처메이드 4단계)" />
        <button className="btn primary" type="submit">검색</button>
      </form>
      {keywords.length > 0 && (
        <div className="chips">
          {keywords.map((k) => (
            <button key={k} className={"chip" + (active === k ? " on" : "")} onClick={() => { setQ(k); search(k, sort); }}>{k}</button>
          ))}
        </div>
      )}
      <div className="chips">
        {SORTS.map((s) => (
          <button key={s.v} className={"chip" + (sort === s.v ? " on" : "")} onClick={() => { setSort(s.v); if (active) search(active, s.v); }}>{s.label}</button>
        ))}
      </div>

      {loading && <p className="muted">검색 중…</p>}
      {error && <p className="up">⚠️ {error}</p>}
      {!loading && !error && active && items.length === 0 && <div className="empty">검색 결과가 없어요.</div>}

      <div className="grid">
        {items.map((it) => (
          <div key={it.productId} className="card item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb" src={it.image} alt="" loading="lazy" />
            <div className="body">
              <div className="title" title={it.title}>{it.title}</div>
              <div className="price">{won(it.price)}</div>
              <div className="mall">
                {it.productType === 1 || it.mallName === "네이버 가격비교" ? "🏷️ 여러 쇼핑몰 최저가" : it.mallName}
              </div>
              <div className="actions">
                <a className="btn sm" href={it.link} target="_blank" rel="noopener noreferrer">보러가기</a>
                <button className={"btn sm" + (it.tracked ? "" : " primary")} disabled={it.tracked} onClick={() => track(it)}>
                  {it.tracked ? "추적 중 ⭐" : "☆ 추적"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {toast.node}
    </div>
  );
}
