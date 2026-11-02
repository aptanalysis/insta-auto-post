import webpush from "web-push";
import { all, run } from "./db";

let configured = false;

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 가 설정되지 않았습니다 (npm run vapid)");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url: string; image?: string | null; tag?: string };

type SubRow = { id: number; endpoint: string; p256dh: string; auth: string };

/** 등록된 모든 기기로 전송. 만료된 구독(404/410)은 삭제. */
export async function sendToAll(payload: PushPayload): Promise<{ sent: number; failed: number; removed: number }> {
  configure();
  const subs = await all<SubRow>("SELECT id, endpoint, p256dh, auth FROM push_subscriptions");
  let sent = 0, failed = 0, removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await run("DELETE FROM push_subscriptions WHERE id = ?", [s.id]);
          removed++;
        } else {
          failed++;
          console.error("[push] send failed", code, (e as Error).message);
        }
      }
    }),
  );
  return { sent, failed, removed };
}
