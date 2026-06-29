-- ============================================
-- Migration: إضافة stage و grade لجدول البث المباشر
-- ============================================
-- هذا الملف يضيف الأعمدة stage و grade للجدول الموجود

-- إضافة الأعمدة الجديدة
ALTER TABLE live_stream_settings
ADD COLUMN IF NOT EXISTS stage TEXT CHECK (stage = 'middle'),
ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade >= 7 AND grade <= 9);

-- تحديث السجلات الموجودة (إن وجدت) - تعيين قيم افتراضية
-- إذا كان هناك سجلات موجودة، سنقوم بتعيينها للمرحلة المتوسطة والصف 7
-- ملاحظة: إذا كان هناك أكثر من سجل، سيتم تعيينهم جميعاً للصف 7
-- يمكنك تعديلهم لاحقاً من لوحة المدير
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM live_stream_settings WHERE stage IS NULL OR grade IS NULL;
    
    IF record_count > 0 THEN
        -- تعيين جميع السجلات الموجودة للصف 7
        UPDATE live_stream_settings
        SET 
            stage = 'middle',
            grade = 7
        WHERE stage IS NULL OR grade IS NULL;
        
        -- إذا كان هناك أكثر من سجل، نحذف المكررات ونبقي على الأحدث
        IF record_count > 1 THEN
            DELETE FROM live_stream_settings a
            USING live_stream_settings b
            WHERE a.id < b.id
            AND a.stage = b.stage
            AND a.grade = b.grade;
        END IF;
    END IF;
END $$;

-- إضافة القيد UNIQUE لمنع التكرار
-- ملاحظة: قد نحتاج لحذف السجلات المكررة أولاً
DO $$
BEGIN
    -- حذف السجلات المكررة (الاحتفاظ بأحدث سجل لكل صف)
    DELETE FROM live_stream_settings a
    USING live_stream_settings b
    WHERE a.id < b.id
    AND a.stage = b.stage
    AND a.grade = b.grade;
    
    -- إضافة القيد UNIQUE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'live_stream_settings_stage_grade_key'
    ) THEN
        ALTER TABLE live_stream_settings
        ADD CONSTRAINT live_stream_settings_stage_grade_key UNIQUE(stage, grade);
    END IF;
END $$;

-- جعل الأعمدة إلزامية (NOT NULL)
ALTER TABLE live_stream_settings
ALTER COLUMN stage SET NOT NULL,
ALTER COLUMN grade SET NOT NULL;

-- تحديث الفهارس
DROP INDEX IF EXISTS idx_live_stream_stage_grade;
CREATE INDEX IF NOT EXISTS idx_live_stream_stage_grade ON live_stream_settings(stage, grade);

-- تحديث التعليقات
COMMENT ON COLUMN live_stream_settings.stage IS 'المرحلة الدراسية: middle فقط';
COMMENT ON COLUMN live_stream_settings.grade IS 'الصف الدراسي: 7, 8, أو 9';

