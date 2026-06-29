-- ============================================
-- شغّل هذا الملف في Supabase → SQL Editor مرة واحدة.
-- بعد نجاح الترحيل يمكن إعادة تفعيل ترتيب قاعدة البيانات في الكود:
--   - .order('display_order') في reviewService.ts و uploadService.ts
--   - حقل display_order في insert داخل saveFileUrlToSupabase
--   - واجهة «ترتيب العرض» في MaterialsManagement.tsx
-- حتى ذلك الحين، التطبيق يستخدم ترتيباً على الواجهة فقط عند وجود القيم في JSON.
-- ============================================

-- ترتيب عرض المواد (1 = الأول، 2 = الثاني، …). القيمة 0 = غير محدد (يُعرض في النهاية حسب تاريخ الرفع).
ALTER TABLE uploaded_materials
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN uploaded_materials.display_order IS 'ترتيب العرض للطلاب: 1 أولاً، ثم 2، … 0 = تلقائي (آخر الترتيب)';

CREATE INDEX IF NOT EXISTS idx_uploaded_materials_display_order
ON uploaded_materials (stage, grade, content_type, display_order);
