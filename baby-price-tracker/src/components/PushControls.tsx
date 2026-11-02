"use client";
import { useEffect, useState } from "react";
import { useToast } from "./useToast";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "loading" | "unsupported" | "not-configured" | "denied" | "off" | "on";

export default function PushControls() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      const { configured } = await fetch("/api/push/subscribe").then((r) => r.json());
      if (!configured) return setState("not-configured");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const { publicKey } = await fetch("/api/push/subscribe").then((r) => r.json());
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      if (!r.ok) throw new Error("서버 등록 실패");
      setState("on");
      toast.show("✅ 알림이 켜졌어요");
    } catch (e) {
      toast.show("⚠️ " + (e as Error).message);
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off"); setBusy(false);
    toast.show("알림을 껐어요");
  }

  async function test() {
    const r = await fetch("/api/push/test", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    toast.show(r.ok ? `테스트 알림 전송: ${j.sent}대 성공${j.failed ? `, ${j.failed}대 실패` : ""}` : "⚠️ " + (j.error || "실패"));
  }

  const msg: Record<State, string> = {
    loading: "확인 중…",
    unsupported: "이 브라우저는 웹 푸시를 지원하지 않아요. (아이폰은 홈 화면에 추가한 뒤 열어주세요)",
    "not-configured": "서버에 VAPID 키가 없어요. README의 ‘웹 푸시 설정’을 따라 키를 넣어주세요.",
    denied: "알림 권한이 차단되어 있어요. 브라우저/기기 설정에서 이 사이트의 알림을 허용해주세요.",
    off: "이 기기는 아직 알림을 받지 않아요.",
    on: "✅ 이 기기로 최저가 알림을 받고 있어요.",
  };

  return (
    <div>
      <p>{msg[state]}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {state === "off" && <button className="btn primary" disabled={busy} onClick={enable}>🔔 알림 켜기</button>}
        {state === "on" && <><button className="btn" onClick={test}>테스트 알림 보내기</button><button className="btn" disabled={busy} onClick={disable}>알림 끄기</button></>}
      </div>
      {toast.node}
    </div>
  );
}
