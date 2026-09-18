# Work Order Lifecycle — Approved

## Main work-order statuses
- جديد
- جاري التنفيذ
- مجمد
- مكتمل
- ملغي

## Status transitions
- جديد -> جاري التنفيذ
- جديد -> مجمد
- جديد -> ملغي
- جاري التنفيذ -> مكتمل
- جاري التنفيذ -> مجمد
- جاري التنفيذ -> ملغي
- مجمد -> جاري التنفيذ (فك التجميد)
- مجمد -> ملغي
- ملغي -> جديد (إعادة فتح)
- مكتمل -> جاري التنفيذ (إعادة فتح عند الحاجة)

Every status change must be recorded with date/time. Cancellation keeps the order and records its cancellation reason.
A new independent maintenance job creates a new work order; the old completed order is not reused.

### "مجمد" (frozen)
Used when the customer is unreachable/unresponsive (e.g. waiting on their reply after a part arrived). While an order
is frozen, its age/overdue counter is paused (`frozenAt` + cumulative `frozenMs` on the record) — it does not count
against overdue-day thresholds or the "قديم" stale-order alert. It resumes counting from where it paused once moved
back to "جاري التنفيذ". An optional freeze note can be recorded and is shown on the order's profile.

## Workshop status
- غير مطلوب
- تم السحب
- تم التسليم

Priority is not used in the work-order flow.

Financial calculations are intentionally unchanged.
