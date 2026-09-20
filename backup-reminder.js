/* backup-reminder.js — بانر في الصفحة الرئيسية بس، بيفكّر المستخدم لو
   فات على آخر نسخة احتياطية أكتر من 14 يوم (أو معملش نسخة أبدًا).
   بيعتمد على daysSinceLastBackup() الموجودة في app-data-management.js
   (لازم يتحمّل بعده). ممكن "يأجّل" التذكير 3 أيام من غير ما يعمل نسخة،
   محفوظ في wf_backup_reminder_snoozed_until (localStorage). */
(function () {
  "use strict";

  var REMINDER_AFTER_DAYS = 14;
  var SNOOZE_DAYS = 3;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function isSnoozed() {
    try {
      var until = localStorage.getItem("wf_backup_reminder_snoozed_until");
      if (!until) return false;
      return new Date(until).getTime() > Date.now();
    } catch (e) {
      return false;
    }
  }

  function snooze() {
    try {
      var d = new Date();
      d.setDate(d.getDate() + SNOOZE_DAYS);
      localStorage.setItem("wf_backup_reminder_snoozed_until", d.toISOString());
    } catch (e) {}
    var el = document.getElementById("backupReminder");
    if (el) el.innerHTML = "";
  }

  function renderBackupReminder() {
    var host = document.getElementById("backupReminder");
    if (!host) return;
    if (document.getElementById("automaticBackupPermission")) return;
    if (typeof daysSinceLastBackup !== "function") return;
    if (isSnoozed()) {
      host.innerHTML = "";
      return;
    }
    var days = daysSinceLastBackup();
    var overdue = days === null || days >= REMINDER_AFTER_DAYS;
    if (!overdue) {
      host.innerHTML = "";
      return;
    }
    var msg = days === null
      ? "لسه معملتش أي نسخة احتياطية من بيانات الورشة أبدًا."
      : `فات ${days} يوم من غير نسخة احتياطية جديدة.`;
    host.innerHTML =
      '<div class="notice backup-reminder-banner">' +
      "⚠️ " + msg + " لو الجهاز ضاع أو اتعطّل من غير نسخة، البيانات كلها بتضيع." +
      '<div class="backup-reminder-actions">' +
      '<a class="primary small-btn" href="settings.html#backup-restore">💾 اعمل نسخة دلوقتي</a>' +
      '<button class="secondary small-btn" type="button" data-wf-event="click" data-wf-code="snoozeBackupReminder()">تذكير بعد 3 أيام</button>' +
      "</div></div>";
  }

  window.renderBackupReminder = renderBackupReminder;
  window.snoozeBackupReminder = snooze;

  ready(renderBackupReminder);
})();
