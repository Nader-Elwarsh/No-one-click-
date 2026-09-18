/* share-store.js — مخزن IndexedDB صغير لتمرير بيانات "المشاركة" (Web Share
   Target) من الـ Service Worker (اللي بيستقبل POST الفعلي من نظام المشاركة
   في الأندرويد لما تدوس "مشاركة" في تطبيق تسجيل المكالمات وتختار الورشة
   الفنية) للصفحة (share-target.html) اللي بتفتح بعدها مباشرة.
   نفس فكرة notif-shared.js بالظبط (IndexedDB كجسر بين SW والصفحة)، بس
   بقاعدة بيانات ومخزن منفصلين عشان مايتلخبطش مع ملخص الإشعارات. */
const SHARE_DB_NAME = "workshopShareDB";
const SHARE_STORE = "pending";
const SHARE_KEY = "latest";

function shareDbOpen() {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open(SHARE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(SHARE_STORE)) req.result.createObjectStore(SHARE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// بيحفظ حمولة المشاركة (بتستدعيها الـ Service Worker لما يستقبل POST فعلي).
async function sharePut(value) {
  try {
    let db = await shareDbOpen();
    return await new Promise((resolve, reject) => {
      let tx = db.transaction(SHARE_STORE, "readwrite");
      tx.objectStore(SHARE_STORE).put(value, SHARE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { return false; }
}

// بيرجّع آخر حمولة مشاركة محفوظة ويمسحها فورًا (استهلاك لمرة واحدة، عشان
// لو المستخدم عمل refresh للصفحة بعدين مايترجعش يعرضها له تاني وكأنها
// مشاركة جديدة).
async function shareTake() {
  try {
    let db = await shareDbOpen();
    return await new Promise((resolve, reject) => {
      let tx = db.transaction(SHARE_STORE, "readwrite");
      let store = tx.objectStore(SHARE_STORE);
      let rq = store.get(SHARE_KEY);
      rq.onsuccess = () => { store.delete(SHARE_KEY); resolve(rq.result || null); };
      rq.onerror = () => reject(rq.error);
    });
  } catch (e) { return null; }
}
