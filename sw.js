/* Kaarya service worker: caches the app shell only. API calls, file downloads and the
   WebSocket always go to the server, so the app never shows stale task data as current. */
const CACHE = "kaarya-shell-v2";
const SHELL = ["/", "/index.html", "/theme-init.js", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// A pop-up notification was clicked: bring Kaarya to the front and open the task.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      const client = all.find((c) => new URL(c.url).origin === location.origin);
      if (client) {
        return client.focus().then(() => {
          if (taskId) client.postMessage({ type: "open-task", taskId });
        });
      }
      return self.clients.openWindow(taskId ? "/?task=" + taskId : "/");
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;

  if (req.mode === "navigate") {
    // Network first so a new version is picked up; fall back to the cached shell.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    // Hashed, immutable build assets: cache first.
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
