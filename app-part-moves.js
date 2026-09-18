/* app-part-moves.js — سجل حركات المخزن الكامل لصنف واحد، قابل للتصفح والفلترة
   وقت ما القطعة تبقى مستهلكة كتير وعندها عشرات/مئات الحركات، صفحة الصنف
   نفسها بتعرض آخر 5 حركات بس مع لينك لهنا. هنا بنعرض السجل كامل مع فلاتر
   (تاريخ من/إلى + نوع الحركة) وتحميل تدريجي (20 حركة كل مرة) بدل ما نطبع
   السجل كله مرة واحدة لو كان طويل. */
(function () {
  "use strict";

  const state = { limit: 20, type: "", from: "", to: "" };

  function isOutType(t) { return /خروج/.test(t || ""); }
  function isInType(t) { return /إرجاع|دخول/.test(t || ""); }

  function inRange(atIso) {
    if (state.from) {
      const f = new Date(state.from + "T00:00:00");
      if (new Date(atIso) < f) return false;
    }
    if (state.to) {
      const t = new Date(state.to + "T23:59:59.999");
      if (new Date(atIso) > t) return false;
    }
    return true;
  }

  function moveTypeOptions(all) {
    return [...new Set(all.map(m => m.type || "").filter(Boolean))];
  }

  window.renderPartMoves = function () {
    const el = document.getElementById("partMovesProfile");
    if (!el) return;

    const pid = new URLSearchParams(location.search).get("id");
    const p = arr(K.p).find(x => x.id === pid);
    if (!p) {
      el.innerHTML = "<div class='item'>القطعة غير موجودة أو تم حذفها.</div>";
      return;
    }

    const allMoves = arr(K.m).filter(m => m.partId === pid);
    const types = moveTypeOptions(allMoves);

    let moves = allMoves.slice();
    if (state.type) moves = moves.filter(m => m.type === state.type);
    moves = moves.filter(m => inRange(m.at));
    moves.sort((a, b) => new Date(b.at) - new Date(a.at));

    const totalOut = moves.filter(m => isOutType(m.type)).reduce((a, m) => a + (+m.qty || 0), 0);
    const totalIn = moves.filter(m => isInType(m.type)).reduce((a, m) => a + (+m.qty || 0), 0);

    // لو رابط دخل الصفحة يشاور على حركة معيّنة (زي فحص سلامة البيانات
    // #move-<id>) بس هي أقدم من أول 20 حركة، نوسّع الحد اللي بيتعرض عشان
    // الحركة المطلوبة تبقى ضمن الصفوف المرسومة فعليًا وتقدر highlightHashTarget
    // (shared-data.js) توصل لها وتضيئها.
    const hashMoveId = (location.hash || "").startsWith("#move-") ? location.hash.slice(6) : null;
    if (hashMoveId) {
      const idx = moves.findIndex(m => m.id === hashMoveId);
      if (idx >= 0 && idx >= state.limit) state.limit = idx + 1;
    }

    const visible = moves.slice(0, state.limit);

    el.innerHTML = `
      <div class="profile">
        <div class="page-head">
          <h1 class="profile-title">🔄 حركات صنف: ${esc(p.name)}</h1>
          <div class="compact-actions"><a class="secondary" href="part.html?id=${p.id}">← ملف الصنف</a></div>
        </div>

        <div class="report-cards">
          <div class="report-card"><span>📦 الكمية الحالية</span><b>${+p.qty || 0}</b></div>
          <div class="report-card"><span>🔄 عدد الحركات المطابقة</span><b>${moves.length}</b></div>
          <div class="report-card"><span>⬇️ إجمالي الخارج</span><b>${totalOut}</b></div>
          <div class="report-card"><span>⬆️ إجمالي الداخل (إرجاع)</span><b>${totalIn}</b></div>
        </div>

        <div class="form-grid" style="margin-top:12px">
          <label>من تاريخ<input type="date" id="pmFrom" value="${state.from}" data-wf-event="change" data-wf-code="setPartMovesFilter('from', this.value)"></label>
          <label>إلى تاريخ<input type="date" id="pmTo" value="${state.to}" data-wf-event="change" data-wf-code="setPartMovesFilter('to', this.value)"></label>
          <label class="wide">نوع الحركة
            <select id="pmType" data-wf-event="change" data-wf-code="setPartMovesFilter('type', this.value)">
              <option value="">كل الأنواع (${allMoves.length})</option>
              ${types.map(t => `<option value="${esc(t)}" ${state.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
            </select>
          </label>
          ${(state.type || state.from || state.to) ? `<button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="clearPartMovesFilter()">✖️ إلغاء الفلاتر</button>` : ""}
        </div>

        <h2>📋 سجل الحركات (${moves.length})</h2>
        ${visible.length ? `<div class="report-table-wrap"><table class="report-table-full">
          <tr><th>التاريخ</th><th>النوع</th><th>الكمية</th><th>الأمر المرتبط</th><th>الفاتورة</th></tr>
          ${visible.map(m => {
            const req = m.requestId ? arr(K.r).find(r => r.id === m.requestId) : null;
            return `<tr id="move-${m.id}">
              <td>${new Date(m.at).toLocaleString("ar-EG")}</td>
              <td>${esc(m.type || "—")}</td>
              <td>${+m.qty || 0}</td>
              <td>${req ? `<a href="request.html?id=${req.id}">${esc(req.no || req.id)} — ${esc(customerName(req.customerId))}</a>` : (m.note ? esc(m.note) : "—")}</td>
              <td>${m.invoice ? `<button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="showImagePreview('${esc(m.invoice)}','📷 فاتورة توريد')">📷 عرض</button>` : "—"}</td>
            </tr>`;
          }).join("")}
        </table></div>` : `<div class="report-empty">لا توجد حركات مطابقة لهذا الفلتر.</div>`}

        ${moves.length > visible.length ? `<div class="actions" style="margin-top:10px"><button type="button" class="secondary" data-wf-event="click" data-wf-code="loadMorePartMoves()">⬇️ عرض المزيد (${moves.length - visible.length} متبقي)</button></div>` : ""}
      </div>`;
  };

  window.setPartMovesFilter = function (key, value) {
    state[key] = value;
    state.limit = 20;
    renderPartMoves();
  };

  window.clearPartMovesFilter = function () {
    state.type = "";
    state.from = "";
    state.to = "";
    state.limit = 20;
    renderPartMoves();
  };

  window.loadMorePartMoves = function () {
    state.limit += 20;
    renderPartMoves();
  };

  document.addEventListener("DOMContentLoaded", () => setTimeout(renderPartMoves, 0));
})();
