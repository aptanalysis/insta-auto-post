import { won } from "@/lib/format";

type Point = { price: number; checked_at: string };

/** 의존성 없는 간단한 SVG 가격 추이 차트 */
export default function PriceChart({ points, usual: usualIn, target: targetIn }: { points: Point[]; usual?: number | null; target?: number | null }) {
  let usual = usualIn, target = targetIn;
  if (points.length < 2) return <p className="muted small">가격 기록이 2개 이상 쌓이면 그래프가 표시돼요.</p>;
  const W = 360, H = 170, P = { l: 6, r: 6, t: 16, b: 20 };
  const prices = points.map((p) => p.price);
  const hi = Math.max(...prices), lo = Math.min(...prices);
  // 가격대와 너무 동떨어진 기준선(예: 목표가 999,999원)은 그래프를 납작하게 만들므로 생략
  const near = (v: number | null | undefined): v is number => typeof v === "number" && v <= hi * 1.5 && v >= lo * 0.5;
  if (!near(target)) target = null;
  if (!near(usual)) usual = null;
  const refs = [usual, target].filter((v): v is number => typeof v === "number");
  let min = Math.min(...prices, ...refs), max = Math.max(...prices, ...refs);
  if (min === max) { min *= 0.95; max *= 1.05; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const lowIdx = prices.indexOf(Math.min(...prices));
  const fmt = (s: string) => new Date(s.replace(" ", "T") + "Z").toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="가격 추이">
      {usual != null && (
        <g>
          <line x1={P.l} x2={W - P.r} y1={y(usual)} y2={y(usual)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" />
          <text x={W - P.r} y={y(usual) - 4} textAnchor="end" fontSize="11" fill="var(--muted)">평소 {won(usual)}</text>
        </g>
      )}
      {target != null && (
        <g>
          <line x1={P.l} x2={W - P.r} y1={y(target)} y2={y(target)} stroke="var(--good)" strokeDasharray="2 4" strokeWidth="1" />
          <text x={P.l} y={y(target) - 4} fontSize="11" fill="var(--good)">목표 {won(target)}</text>
        </g>
      )}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(lowIdx)} cy={y(prices[lowIdx])} r="4" fill="var(--good)" />
      <circle cx={x(points.length - 1)} cy={y(prices[prices.length - 1])} r="4" fill="var(--accent)" />
      <text x={P.l} y={H - 6} fontSize="11" fill="var(--muted)">{fmt(points[0].checked_at)}</text>
      <text x={W - P.r} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">{fmt(points[points.length - 1].checked_at)}</text>
    </svg>
  );
}
