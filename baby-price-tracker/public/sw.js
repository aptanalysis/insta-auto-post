/* 육아템 최저가 알리미 - 서비스 워커 (웹 푸시 수신/클릭 처리) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "최저가 알림", body: event.data && event.data.text() }; }
  const title = data.title || "📉 최저가 알림";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      image: data.image || undefined,
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/favorites" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/favorites";
  event.waitUntil(self.clients.openWindow(url));
});
