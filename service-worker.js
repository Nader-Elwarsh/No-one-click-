const CACHE_NAME = "workshop-v11-127-warranty";
importScripts("./notif-shared.js");
importScripts("./share-store.js");
const CORE_FILES = [
  "./",
  "./index.html",
  "./route.html",
  "./followup.html",
  "./customers.html",
  "./customer.html",
  "./devices.html",
  "./device.html",
  "./requests.html",
  "./request.html",
  "./inventory.html",
  "./part.html",
  "./part-moves.html",
  "./faultcodes.html",
  "./compcodes.html",
  "./faultcode.html",
  "./settings.html",
  "./treasury.html",
  "./wallets.html",
  "./wallet.html",
  "./tasks.html",
  "./reports.html",
  "./style.css",
  "./theme.js",
  "./shared-data.js",
  "./audit-log.js",
  "./global-search.js",
  "./bottom-nav.js",
  "./backup-reminder.js",
  "./image-store.js",
  "./migrations.js",
  "./treasury.js",
  "./wallets.js",
  "./tasks.js",
  "./app-shared.js",
  "./app-dashboard-reports.js",
  "./app-customers.js",
  "./app-devices.js",
  "./app-requests.js",
  "./app-settings-lists.js",
  "./app-parts.js",
  "./app-fault-codes.js",
  "./app-compressor-codes.js",
  "./compressor-index.js",
  "./app-part-moves.js",
  "./app-inventory-bulk.js",
  "./app-settings.js",
  "./settings-events.js",
  "./app-delete-tools.js",
  "./app-trash.js",
  "./app-lock.js",
  "./event-delegation.js",
  "./app-invoices.js",
  "./app-route-followup.js",
  "./app-data-management.js",
  "./app-customer-autocomplete.js",
  "./app-list-autocomplete.js",
  "./app-restock.js",
  "./app-quick-add.js",
  "./app-notifications-bootstrap.js",
  "./share-target.html",
  "./share-target.js",
  "./share-store.js",
  "./pending-calls.html",
  "./workshop-mini-simple-ui.js",
  "./workshop-mini-enhancements.js",
  "./reports.js",
  "./print-share.js",
  "./print-share.css",
  "./manifest.json",
  "./icon-192-v12.png",
  "./icon-512-v12.png",
  "./logo-header-v12.png",
  "./notif-shared.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // نقطة استقبال "مشاركة" من تطبيقات تانية (زي تطبيق تسجيل المكالمات):
  // نظام المشاركة في أندرويد بيبعت POST فعلي هنا لما المستخدم يختار
  // "الورشة الفنية" من قايمة المشاركة بعد تسجيل مكالمة. الصفحة (share-
  // target.html) مايقدرش تقرأ body الـ POST مباشرة، فبنستقبله هنا،
  // نحفظه في IndexedDB (share-store.js)، وبعدين نعمل redirect لنفس
  // الصفحة كـ navigation عادي (GET) عشان تقرأ اللي اتحفظ وتعرضه.
  if (request.method === "POST" && url.pathname.endsWith("/share-target.html")) {
    event.respondWith((async () => {
      try {
        const form = await request.formData();
        const files = form.getAll("recording").filter(f => f && f.size);
        await sharePut({
          title: form.get("title") || "",
          text: form.get("text") || "",
          url: form.get("url") || "",
          file: files[0] || null,
          fileName: files[0]?.name || "",
          at: Date.now()
        });
      } catch (e) { console.error("[SW] فشل استقبال المشاركة", e); }
      return Response.redirect("./share-target.html?shared=1", 303);
    })());
    return;
  }

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // HTML pages: cache by pathname, not by query string.
  // This makes customer.html?id=..., device.html?id=... and request.html?id=...
  // open correctly while offline; the app-*.js files read the ID from the URL.
  //
  // Strategy: Stale-While-Revalidate. اعرض النسخة المحفوظة فورًا لو موجودة
  // (سرعة فورية زي التصفح العادي)، وفي نفس الوقت هات نسخة جديدة من الشبكة
  // في الخلفية واحفظها في الكاش عشان المرة الجاية — من غير ما تخلي المستخدم
  // ينتظر الشبكة كل ضغطة. لو النسخة المحفوظة مش موجودة أصلاً (أول زيارة)،
  // ننتظر الشبكة عادي.
  if (request.mode === "navigate") {
    const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(cacheKey).then(cached => {
          const networkUpdate = fetch(request)
            .then(response => {
              if (response && response.ok) cache.put(cacheKey, response.clone());
              return response;
            })
            .catch(() => null);
          if (cached) {
            event.waitUntil(networkUpdate);
            return cached;
          }
          return networkUpdate.then(r => r || caches.match("./index.html"));
        })
      )
    );
    return;
  }

  // Static files (JS/CSS/صور): نفس منطق Stale-While-Revalidate — عرض فوري
  // من الكاش، وتحديث صامت في الخلفية عشان أي نسخة جديدة تتنزل تظهر في
  // الزيارة اللي بعدها من غير ما تبطّئ الزيارة الحالية.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        const networkUpdate = fetch(request)
          .then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(networkUpdate);
          return cached;
        }
        return networkUpdate.then(r => r || cached);
      })
    )
  );
});

/* ---------------------------------------------------------------------
   إشعارات في الخلفية (Periodic Background Sync) — دعم أفضل مجهود:
   شغالة فعليًا على أندرويد/كروم لو التطبيق متثبت على الشاشة الرئيسية،
   والمتصفح هو اللي بيقرر التوقيت الفعلي (مش مضمون بالظبط، ومش مدعوم
   خالص على آيفون Safari). البيانات بتوصل من IndexedDB (notif-shared.js)
   لأن الـ Service Worker مايقدرش يقرأ localStorage مباشرة.
--------------------------------------------------------------------- */
function localDayKey(value) {
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function runNotificationCheck() {
  let snap = await notifGet("snapshot");
  if (!snap) return;
  let today = localDayKey(new Date());
  let lastDate = await notifGet("lastNotifiedDate");
  if (lastDate === today) return;
  let shown = false;
  if (snap.today && snap.today.length) {
    await self.registration.showNotification("📅 مواعيد اليوم", {
      body: `عندك ${snap.today.length} زيارة/زيارات اليوم.`,
      icon: "./icon-192-v12.png", tag: "wf-today",
      data: { url: "./requests.html?bucket=today" }
    });
    shown = true;
  }
  if (snap.overdue && snap.overdue.length) {
    await self.registration.showNotification("⚠️ أوامر متأخرة", {
      body: `فيه ${snap.overdue.length} أمر متأخر محتاج متابعة.`,
      icon: "./icon-192-v12.png", tag: "wf-overdue",
      data: { url: "./requests.html?bucket=overdue" }
    });
    shown = true;
  }
  if (snap.lowStock && snap.lowStock.length) {
    await self.registration.showNotification("📉 قطع منخفضة", {
      body: `فيه ${snap.lowStock.length} صنف وصل للحد الأدنى في المخزن.`,
      icon: "./icon-192-v12.png", tag: "wf-lowstock",
      data: { url: "./inventory.html?bucket=low" }
    });
    shown = true;
  }
  if (shown) await notifSet("lastNotifiedDate", today);
}

self.addEventListener("periodicsync", event => {
  if (event.tag === "workshop-check") event.waitUntil(runNotificationCheck());
});

self.addEventListener("sync", event => {
  if (event.tag === "workshop-check-once") event.waitUntil(runNotificationCheck());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  let url = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(list => {
      for (const c of list) { if ("focus" in c) { c.postMessage({ type: "GO_TO", url }); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
