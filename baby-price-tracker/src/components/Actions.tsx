"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./useToast";

export function CheckAllButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button className="btn sm" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/check", { method: "POST" });
        const j = await r.json().catch(() => ({}));
        setBusy(false);
        toast.show(r.ok ? `${j.checked}개 확인 완료 · 새 알림 ${j.alerted}건` : "체크 실패");
        router.refresh();
      }}>{busy ? "확인 중…" : "🔄 전체 지금 체크"}</button>
      {toast.node}
    </>
  );
}

export function ProductActions({ id, redirectAfterDelete = false }: { id: number; redirectAfterDelete?: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="btn sm" disabled={busy} onClick={async (e) => {
        e.preventDefault(); setBusy(true);
        const r = await fetch(`/api/favorites/${id}`, { method: "POST" });
        const j = await r.json().catch(() => ({}));
        setBusy(false);
        if (!r.ok || !j.result?.ok) toast.show("⚠️ " + (j.result?.error || j.error || "체크 실패"));
        else toast.show(j.result.alerted ? "📉 특가 발견! 알림을 보냈어요" : "가격 확인 완료");
        router.refresh();
      }}>{busy ? "…" : "지금 체크"}</button>
      <button className="btn sm" onClick={async (e) => {
        e.preventDefault();
        if (!confirm("추적을 중단하고 가격 기록을 삭제할까요?")) return;
        await fetch(`/api/favorites/${id}`, { method: "DELETE" });
        if (redirectAfterDelete) router.push("/favorites"); else router.refresh();
      }}>삭제</button>
      {toast.node}
    </div>
  );
}

export function AlertSettings({ id, target, drop, defaultDrop }: { id: number; target: number | null; drop: number | null; defaultDrop: number }) {
  const [t, setT] = useState(target?.toString() ?? "");
  const [d, setD] = useState(drop?.toString() ?? "");
  const router = useRouter();
  const toast = useToast();
  async function save() {
    const r = await fetch(`/api/favorites/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_price: t.trim() === "" ? null : Number(t), drop_pct: d.trim() === "" ? null : Number(d) }),
    });
    const j = await r.json().catch(() => ({}));
    toast.show(r.ok ? "알림 조건을 저장했어요" : "⚠️ " + (j.error || "저장 실패"));
    router.refresh();
  }
  return (
    <div>
      <div className="form-row">
        <label htmlFor="target">목표가 (원)</label>
        <input id="target" className="input" inputMode="numeric" value={t} onChange={(e) => setT(e.target.value.replace(/[^\d]/g, ""))} placeholder="예: 29900" />
        <span className="small muted">이 가격 이하가 되면 알림</span>
      </div>
      <div className="form-row">
        <label htmlFor="drop">할인 기준 (%)</label>
        <input id="drop" className="input" inputMode="decimal" value={d} onChange={(e) => setD(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`기본 ${defaultDrop}`} />
        <span className="small muted">평소가보다 이만큼 싸지면 알림</span>
      </div>
      <button className="btn primary sm" onClick={save}>저장</button>
      {toast.node}
    </div>
  );
}
