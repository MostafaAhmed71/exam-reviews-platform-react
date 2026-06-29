-- ============================================
-- إصلاح قيد UNIQUE في جدول subjects
-- السماح بنفس اسم المادة في مراحل مختلفة
-- ============================================

-- 1. إزالة القيد UNIQUE القديم من name_ar
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_name_ar_key;

-- 2. إضافة قيد UNIQUE جديد على (name_ar, stage)
-- هذا يسمح بنفس الاسم في مراحل مختلفة، لكن يمنع التكرار في نفس المرحلة
ALTER TABLE subjects ADD CONSTRAINT subjects_name_ar_stage_unique UNIQUE (name_ar, stage);

-- 3. إنشاء فهرس مركب لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_subjects_name_stage ON subjects(name_ar, stage);

-- ملاحظة: بعد تنفيذ هذا السكريبت، يمكنك إضافة نفس المادة في المرحلة المتوسطة والثانوية

