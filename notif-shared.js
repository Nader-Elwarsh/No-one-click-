/* مخزن صغير (IndexedDB) يشترك فيه الصفحة و الـ Service Worker معًا،
   لأن الـ Service Worker (اللي بيشتغل في الخلفية) مايقدرش يوصل لـ localStorage
   العادي؛ فبنستخدم IndexedDB كجسر بسيط بين الاتنين خاص بملخص الإشعارات بس
   (مش بديل لتخزين بيانات النظام الأساسية). */
const NOTIF_DB_NAME = "workshopNotifDB";
const NOTIF_STORE = "kv";

function notifDbOpen() {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open(NOTIF_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(NOTIF_STORE)) req.result.createObjectStore(NOTIF_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function notifGet(key) {
  try {
    let db = await notifDbOpen();
    return await new Promise((resolve, reject) => {
      let tx = db.transaction(NOTIF_STORE, "readonly");
      let rq = tx.objectStore(NOTIF_STORE).get(key);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
  } catch (e) { return null; }
}

async function notifSet(key, value) {
  try {
    let db = await notifDbOpen();
    return await new Promise((resolve, reject) => {
      let tx = db.transaction(NOTIF_STORE, "readwrite");
      tx.objectStore(NOTIF_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { return false; }
}
