-- ============================================
-- Migration: تحويل جدول البث المباشر إلى جدول المحتوى المجدول
-- ============================================

-- إضافة الأعمدة الجديدة (بدون NOT NULL أولاً)
ALTER TABLE live_stream_schedule 
    ADD COLUMN IF NOT EXISTS content_type TEXT,
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS content_title TEXT,
    ADD COLUMN IF NOT EXISTS content_description TEXT,
    ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE;

-- تحويل البيانات القديمة (إذا كانت موجودة)
-- دمج stream_date و stream_time إلى start_datetime
UPDATE live_stream_schedule 
SET start_datetime = (stream_date::text || ' ' || stream_time::text)::timestamp WITH TIME ZONE
WHERE start_datetime IS NULL AND stream_date IS NOT NULL AND stream_time IS NOT NULL;

-- تعيين end_datetime كـ start_datetime + ساعتين للبيانات القديمة
UPDATE live_stream_schedule 
SET end_datetime = start_datetime + INTERVAL '2 hours'
WHERE end_datetime IS NULL AND start_datetime IS NOT NULL;

-- نسخ stream_title إلى content_title
UPDATE live_stream_schedule 
SET content_title = stream_title
WHERE content_title IS NULL AND stream_title IS NOT NULL;

-- نسخ stream_description إلى content_description
UPDATE live_stream_schedule 
SET content_description = stream_description
WHERE content_description IS NULL AND stream_description IS NOT NULL;

-- تعيين content_type افتراضياً (يمكن تعديله لاحقاً)
UPDATE live_stream_schedule 
SET content_type = 'video'
WHERE content_type IS NULL;

-- تعيين قيم افتراضية للأعمدة المطلوبة
UPDATE live_stream_schedule 
SET file_url = COALESCE(file_url, ''),
    file_name = COALESCE(file_name, 'محتوى'),
    start_datetime = COALESCE(start_datetime, CURRENT_TIMESTAMP),
    end_datetime = COALESCE(end_datetime, CURRENT_TIMESTAMP + INTERVAL '2 hours')
WHERE file_url IS NULL OR file_name IS NULL OR start_datetime IS NULL OR end_datetime IS NULL;

-- إضافة constraint للتحقق من القيم
ALTER TABLE live_stream_schedule 
    DROP CONSTRAINT IF EXISTS live_stream_schedule_content_type_check;
ALTER TABLE live_stream_schedule 
    ADD CONSTRAINT live_stream_schedule_content_type_check 
    CHECK (content_type IN ('image', 'video'));

-- الآن يمكننا إضافة NOT NULL (بعد ملء البيانات)
DO $$
BEGIN
    -- التحقق من وجود بيانات NULL قبل إضافة NOT NULL
    IF NOT EXISTS (
        SELECT 1 FROM live_stream_schedule 
        WHERE content_type IS NULL OR file_url IS NULL OR file_name IS NULL 
        OR start_datetime IS NULL OR end_datetime IS NULL
    ) THEN
        ALTER TABLE live_stream_schedule 
            ALTER COLUMN content_type SET NOT NULL,
            ALTER COLUMN file_url SET NOT NULL,
            ALTER COLUMN file_name SET NOT NULL,
            ALTER COLUMN start_datetime SET NOT NULL,
            ALTER COLUMN end_datetime SET NOT NULL;
    END IF;
END $$;

-- إضافة constraint للتحقق من أن end_datetime بعد start_datetime
ALTER TABLE live_stream_schedule 
    DROP CONSTRAINT IF EXISTS check_datetime_order;
ALTER TABLE live_stream_schedule 
    ADD CONSTRAINT check_datetime_order CHECK (end_datetime > start_datetime);

-- إضافة حالة 'active' إلى status
ALTER TABLE live_stream_schedule 
    DROP CONSTRAINT IF EXISTS live_stream_schedule_status_check;
ALTER TABLE live_stream_schedule 
    ADD CONSTRAINT live_stream_schedule_status_check 
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));

-- حذف الأعمدة القديمة (اختياري - يمكن الاحتفاظ بها للتوافق مع الإصدارات القديمة)
-- ALTER TABLE live_stream_schedule 
--     DROP COLUMN IF EXISTS stream_id,
--     DROP COLUMN IF EXISTS stream_date,
--     DROP COLUMN IF EXISTS stream_time,
--     DROP COLUMN IF EXISTS stream_title,
--     DROP COLUMN IF EXISTS stream_description;

-- إضافة فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_content_type ON live_stream_schedule(content_type);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_start_datetime ON live_stream_schedule(start_datetime);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_end_datetime ON live_stream_schedule(end_datetime);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_datetime_range ON live_stream_schedule(start_datetime, end_datetime);

-- تحديث التعليقات
COMMENT ON COLUMN live_stream_schedule.content_type IS 'نوع المحتوى: image (صورة) أو video (فيديو)';
COMMENT ON COLUMN live_stream_schedule.file_url IS 'رابط الملف (صورة أو فيديو) على السيرفر';
COMMENT ON COLUMN live_stream_schedule.start_datetime IS 'موعد بدء عرض المحتوى (تاريخ ووقت)';
COMMENT ON COLUMN live_stream_schedule.end_datetime IS 'موعد انتهاء عرض المحتوى (تاريخ ووقت)';
COMMENT ON COLUMN live_stream_schedule.status IS 'حالة الموعد: scheduled (مجدول), active (نشط), completed (مكتمل), cancelled (ملغي)';

