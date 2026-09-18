/* =========================================================
   الورشة الفنية — الترحيلات (migrations.js)
   =========================================================
   بيشتغل مرة واحدة بس لكل تعديل في شكل البيانات (schema)، بالمقارنة
   بين wf_schema_version المحفوظ والإصدار الحالي (CURRENT_SCHEMA_VERSION
   في shared-data.js). كل ترحيل بياخد رقم إصدار "من" و"لحد"، وبيتنفذوا
   بالترتيب. الملف ده لازم يتحمّل بعد shared-data.js وimage-store.js
   وقبل app.js، وrunMigrations() لازم تتنادى (وتتنتظر await) قبل أول
   رندر في الصفحة.
   ========================================================= */
(function (window) {
  "use strict";

  // ترحيل 1 → 2: نقل صور الأجهزة والقطع من base64 جوه localStorage
  // إلى IndexedDB (image-store.js)، والاستبدال بمرجع قصير بدل الصورة
  // نفسها. راجع شرح السبب في أعلى image-store.js.
  async function migrate1to2() {
    if (!window.ImageStore) return; // الصفحة لسه ما حمّلتش image-store.js
    let K = window.K;
    for (const key of [K.d, K.p]) {
      let list = arr(key);
      let changed = false;
      for (const rec of list) {
        if (rec.photo && String(rec.photo).startsWith("data:")) {
          try {
            rec.photo = await window.ImageStore.save(rec.photo);
            changed = true;
          } catch (e) {
            console.error("[migrations] تعذر ترحيل صورة سجل", rec.id, e);
          }
        }
      }
      if (changed) put(key, list);
    }
  }

  // ترحيل 2 → 3: اعتماد دورة حالات أمر الشغل الرسمية (جديد / جاري التنفيذ
  // / مكتمل / ملغي) وحالات الورشة الرسمية (غير مطلوب / تم السحب / تم
  // التسليم)، وإزالة حقل الأولوية اللي بقى غير مستخدم في أوامر الشغل.
  // راجع WORK_ORDER_LIFECYCLE_APPROVED.md لتفاصيل الدورة المعتمدة.
  function migrate2to3() {
    let K = window.K;
    const STATUS_MAP = {
      "جديد": "جديد",
      "تم التواصل": "جاري التنفيذ",
      "مجدول": "جاري التنفيذ",
      "جاري الفحص": "جاري التنفيذ",
      "انتظار موافقة العميل": "جاري التنفيذ",
      "تحت الإصلاح": "جاري التنفيذ",
      "جاري التنفيذ": "جاري التنفيذ",
      "مكتمل": "مكتمل",
      "ملغي": "ملغي"
    };
    const WORKSHOP_MAP = {
      "غير مطلوب": "غير مطلوب",
      "مطلوب السحب": "تم السحب",
      "تم السحب": "تم السحب",
      "استلام الورشة": "تم السحب",
      "تحت الإصلاح": "تم السحب",
      "جاهز للتسليم": "تم السحب",
      "تم التسليم": "تم التسليم"
    };
    let requests = arr(K.r);
    requests.forEach(r => {
      r.status = STATUS_MAP[r.status] || "جديد";
      if (r.workshopStatus) r.workshopStatus = WORKSHOP_MAP[r.workshopStatus] || "غير مطلوب";
      if ("priority" in r) delete r.priority;
      if (!Array.isArray(r.statusHistory)) {
        r.statusHistory = [{ from: "", to: r.status, at: r.createdAt || new Date().toISOString() }];
      }
    });
    put(K.r, requests);

    let s = get(K.s, null);
    if (s) {
      s.orderStatuses = ["جديد", "جاري التنفيذ", "مكتمل", "ملغي"];
      s.workshopStatuses = ["غير مطلوب", "تم السحب", "تم التسليم"];
      delete s.priorities;
      put(K.s, s);
    }
  }

  // ترحيل 3 → 4: إضافة محفظتي "فودافون كاش" و"أورنج كاش" الافتراضيتين
  // لأي حساب كان موجود قبل إضافتهم لقائمة الافتراضي، من غير ما نمسح أو
  // نعدّل أي محفظة موجودة بالفعل عند المستخدم (بنضيف بس لو مش موجودين
  // بنفس الاسم أصلاً).
  function migrate3to4() {
    let K = window.K;
    let s = get(K.s, null);
    if (!s) return; // مفيش إعدادات محفوظة أصلاً؛ default الجديد في shared-data.js هيتطبق عادي
    s.wallets = Array.isArray(s.wallets) ? s.wallets : [];
    ["محفظة فودافون كاش", "محفظة أورنج كاش"].forEach(w => {
      if (!s.wallets.includes(w)) s.wallets.push(w);
    });
    put(K.s, s);
  }

  // ترحيل 4 → 5: توحيد "مصاريف التشغيل" في مكان واحد. كان فيه قايمة
  // مصاريف منفصلة (K.e) بتظهر في كشف الحساب بس، وحركة محفظة بتصنيف
  // "مصروف تشغيل" بتقلل رصيد محفظة فعليًا. من دلوقتي حركة المحفظة هي
  // المصدر الوحيد، فبننقل أي سجل قديم من القايمة المنفصلة لحركة محفظة
  // بنفس التفاصيل (تصنيفه القديم بقى "تصنيف فرعي" على الحركة)، على
  // أول محفظة في الإعدادات كمحفظة افتراضية للترحيل. القايمة القديمة
  // (K.e) بتفضل في مكانها كنسخة احتياطية بس من غير ما يقرأها أي كود
  // تاني بعد كده.
  function migrate4to5() {
    let K = window.K;
    let oldExpenses = arr(K.e);
    if (!oldExpenses.length) return;
    let s = get(K.s, null) || {};
    let fallbackWallet = (Array.isArray(s.wallets) && s.wallets[0]) || "محفظتي الشخصية";
    let existing = arr(K.wtx);
    let migrated = oldExpenses.map(e => ({
      id: id(), refKey: null, manualOverride: true, deleted: false, type: "out",
      amount: +e.amount || 0, wallet: fallbackWallet, category: "مصروف تشغيل",
      subCategory: e.category || "أخرى",
      date: e.date || (e.createdAt || "").slice(0, 10) || localDateKey(new Date()),
      time: "00:00", reason: e.category || "مصروف تشغيل", note: e.note || "",
      source: "migrated-expense", createdAt: e.createdAt || new Date().toISOString()
    }));
    put(K.wtx, existing.concat(migrated));
  }

  // ترحيل 5 → 6: إصلاح خطأ قديم في شاشة الإعدادات كان بيسجّل أي عنصر
  // مُضاف لقوائم (الحسابات، التصنيف، نوع المصروف تشغيل/شخصي، أماكن
  // التنفيذ، حالات الدفع، وحدات القياس، أنواع العناوين) تحت اسم خاطئ
  // (نص العنوان العربي بدل مفتاح الإعداد الحقيقي بالإنجليزي)، فكانت
  // العناصر المُضافة من الإعدادات بتختفي ومتظهرش في باقي الشاشات. أي
  // عنصر اتسجل بالغلط قبل كده بينتقل هنا لمكانه الصحيح (بدون تكرار لو
  // موجود بالفعل)، ومفيش أي بيانات بتتمسح.
  function migrate5to6() {
    let K = window.K;
    let s = get(K.s, null);
    if (!s) return;
    const RECOVER = [
      ["executionPlaces", ["أماكن التنفيذ"]],
      ["paymentStatuses", ["حالات الدفع"]],
      ["units", ["وحدات القياس"]],
      ["addressTypes", ["أنواع العناوين"]],
      ["wallets", ["الحسابات (محفظتي الشخصية، فودافون كاش، أورنج كاش، إنستاباي... أضف أي حساب تحب)"]],
      ["walletCategories", [
        "تصنيفات حركة الحسابات (شخصي / تشغيل / تحصيل عميل...)",
        "التصنيف (شخصي / تشغيل / تحصيل عميل / سلفة تحويل / أخرى...)"
      ]],
      ["expenseCategories", [
        "تصنيفات مصاريف التشغيل (الفرعية)",
        "نوع المصروف — لما التصنيف \"مصروف تشغيل\" (وقود، صيانة عدة...)"
      ]],
      ["personalExpenseCategories", [
        "تصنيفات المصاريف الشخصية (الفرعية)",
        "نوع المصروف — لما التصنيف \"مصروف شخصي\" (مواصلات، أكل وشرب...)"
      ]]
    ];
    let changed = false;
    RECOVER.forEach(([realKey, badTitles]) => {
      s[realKey] = Array.isArray(s[realKey]) ? s[realKey] : [];
      badTitles.forEach(bad => {
        if (Array.isArray(s[bad]) && s[bad].length) {
          s[bad].forEach(v => { if (v && !s[realKey].includes(v)) s[realKey].push(v); });
          changed = true;
        }
        if (bad in s) { delete s[bad]; changed = true; }
      });
    });
    if (changed) put(K.s, s);
  }

  const MIGRATIONS = [
    { from: 1, to: 2, run: migrate1to2 },
    { from: 2, to: 3, run: migrate2to3 },
    { from: 3, to: 4, run: migrate3to4 },
    { from: 4, to: 5, run: migrate4to5 },
    { from: 5, to: 6, run: migrate5to6 }
  ];

  let migrationPromise = null;
  function runMigrations() {
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
      let v = window.getSchemaVersion ? window.getSchemaVersion() : 1;
      let target = window.CURRENT_SCHEMA_VERSION || 1;
      if (v >= target) return true;
      for (const m of MIGRATIONS) {
        if (v !== m.from) continue;
        try {
          await m.run();
          v = m.to;
          window.setSchemaVersion(v);
        } catch (e) {
          console.error(`[migrations] فشل الترحيل من ${m.from} إلى ${m.to}`, e);
          return false; // نوقف السلسلة عند أول فشل بدل ما نكمل على بيانات غير متسقة
        }
      }
      return v >= target;
    })();
    return migrationPromise;
  }

  window.runMigrations = runMigrations;
  // يبدأ الترحيل فور تحميل طبقة الترحيلات، وتعيد كل الصفحات نفس الـ Promise
  // بدل تشغيل ترحيلات متوازية أو عرض بيانات قديمة قبل انتهائها.
  window.workshopReady = runMigrations();
})(window);
