const cacheName = "MyCache_1";
const appShellFiles = [
  "/index.html",
  "/src/css/reset.css",
  "/src/js/components/todo-app.js",
  "/src/js/components/todo-form.js",
  "/src/js/components/todo-icon-button.js",
  "/src/js/components/todo-item.js",
  "/src/js/components/todo-list.js",
  "/src/js/store/store.js",
  "/src/js/store/todo-store.js",
];

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      console.log("[Service Worker] Caching all: app shell");
      await cache.addAll(appShellFiles);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const r = await caches.match(event.request);
      console.log(`[Service Worker] Fetching resource: ${event.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(event.request);
      const cache = await caches.open(cacheName);
      console.log(
        `[Service Worker] Caching new resource: ${event.request.url}`
      );
      cache.put(event.request, response.clone());
      return response;
    })()
  );
});
