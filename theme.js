/* theme.js — تبديل الوضع الفاتح/الداكن لكل صفحات النظام.
   الافتراضي: يتبع مظهر الهاتف (فاتح/داكن) تلقائيًا لحظيًا عبر prefers-color-scheme.
   لو المستخدم دوس على زرار 🌙/☀️، الاختيار ده بيتحفظ في localStorage كتفضيل يدوي
   ويكسر التتبع التلقائي من هذا المتصفح (لحد ما يمسح بيانات الموقع)، عشان يقدر
   يغيّر المظهر براحته في أي وقت من غير ما يرجع تلقائي على طول.

   ملاحظة: أول تحديد للمظهر (قبل تحميل style.css) بيحصل في سكريبت صغير جوه <head>
   كل صفحة (نفس منطق wfSystemPrefersDark تحت، مكرر عمدًا هناك) عشان يطبّق المظهر
   قبل أي رسم للصفحة فمفيش وميض (Flash) من الفاتح للداكن أو العكس. */

function wfSystemPrefersDark() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch (e) {
    return false;
  }
}

function wfSavedThemePref() {
  try {
    return localStorage.getItem("wf_theme"); // "dark" | "light" | null (تلقائي)
  } catch (e) {
    return null;
  }
}

function wfApplyDark(isDark) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

(function () {
  var saved = wfSavedThemePref();
  if (saved === "dark") wfApplyDark(true);
  else if (saved === "light") wfApplyDark(false);
  else wfApplyDark(wfSystemPrefersDark()); // تلقائي: زي مظهر الهاتف دلوقتي
})();

/* زرار 🌙/☀️: تفضيل يدوي صريح يتحفظ ويبقى ثابت لحد ما المستخدم يدوس تاني. */
function toggleTheme() {
  try {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = isDark ? "light" : "dark";
    wfApplyDark(next === "dark");
    localStorage.setItem("wf_theme", next);
    updateThemeToggleIcons();
  } catch (e) {}
}

function updateThemeToggleIcons() {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var btns = document.querySelectorAll(".theme-toggle-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].textContent = isDark ? "☀️" : "🌙";
    btns[i].setAttribute("aria-label", isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن");
    btns[i].setAttribute("title", isDark ? "الوضع الفاتح" : "الوضع الداكن");
  }
}

/* لو المستخدم ما دوسش على الزرار خالص (يعني لسه على "تلقائي")، وغيّر مظهر
   الهاتف نفسه وهو فاتح الصفحة (مثلاً الوضع الليلي بدأ لحظيًا)، نتابع ونحدّث
   المظهر على طول من غير ما يحتاج يعمل تحديث للصفحة. */
try {
  if (window.matchMedia) {
    var wfMq = window.matchMedia("(prefers-color-scheme: dark)");
    var wfOnSystemChange = function () {
      if (wfSavedThemePref() === null) {
        wfApplyDark(wfMq.matches);
        updateThemeToggleIcons();
      }
    };
    if (wfMq.addEventListener) wfMq.addEventListener("change", wfOnSystemChange);
    else if (wfMq.addListener) wfMq.addListener(wfOnSystemChange); // متصفحات قديمة
  }
} catch (e) {}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateThemeToggleIcons);
} else {
  updateThemeToggleIcons();
}
