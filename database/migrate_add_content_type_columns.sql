-- ============================================
-- Migration: إضافة أعمدة المحتوى المجدول إلى جدول live_stream_schedule
-- ============================================
-- هذا الملف يضيف الأعمدة الجديدة للجدول الموجود
-- يمكن تشغيله بأمان حتى لو كانت بعض الأعمدة موجودة بالفعل

-- التحقق من وجود الجدول أولاً
DO $$
BEGIN
    -- إضافة الأعمدة الجديدة (IF NOT EXISTS لا يعمل مع ALTER TABLE ADD COLUMN في PostgreSQL القديم)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'content_type'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN content_type TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN file_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'file_name'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN file_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN file_size BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'content_title'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN content_title TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'content_description'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN content_description TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'start_datetime'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN start_datetime TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_stream_schedule' AND column_name = 'end_datetime'
    ) THEN
        ALTER TABLE live_stream_schedule ADD COLUMN end_datetime TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- تحويل البيانات القديمة (إذا كانت موجودة)
-- دمج stream_date و stream_time إلى start_datetime
UPDATE live_stream_schedule 
SET start_datetime = (stream_date::text || ' ' || stream_time::text)::timestamp WITH TIME ZONE
WHERE start_datetime IS NULL 
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_stream_schedule' AND column_name = 'stream_date')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_stream_schedule' AND column_name = 'stream_time')
  AND stream_date IS NOT NULL 
  AND stream_time IS NOT NULL;

-- تعيين end_datetime كـ start_datetime + ساعتين للبيانات القديمة
UPDATE live_stream_schedule 
SET end_datetime = start_datetime + INTERVAL '2 hours'
WHERE end_datetime IS NULL AND start_datetime IS NOT NULL;

-- نسخ stream_title إلى content_title
UPDATE live_stream_schedule 
SET content_title = stream_title
WHERE content_title IS NULL 
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_stream_schedule' AND column_name = 'stream_title')
  AND stream_title IS NOT NULL;

-- نسخ stream_description إلى content_description
UPDATE live_stream_schedule 
SET content_description = stream_description
WHERE content_description IS NULL 
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_stream_schedule' AND column_name = 'stream_description')
  AND stream_description IS NOT NULL;

-- تعيين content_type افتراضياً
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
DO $$
BEGIN
    -- حذف constraint القديم إذا كان موجوداً
    ALTER TABLE live_stream_schedule DROP CONSTRAINT IF EXISTS live_stream_schedule_content_type_check;
    
    -- إضافة constraint جديد
    ALTER TABLE live_stream_schedule 
        ADD CONSTRAINT live_stream_schedule_content_type_check 
        CHECK (content_type IN ('image', 'video'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- إضافة constraint للتحقق من أن end_datetime بعد start_datetime
DO $$
BEGIN
    ALTER TABLE live_stream_schedule DROP CONSTRAINT IF EXISTS check_datetime_order;
    ALTER TABLE live_stream_schedule 
        ADD CONSTRAINT check_datetime_order CHECK (end_datetime > start_datetime);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- تحديث حالة status لتشمل 'active'
DO $$
BEGIN
    ALTER TABLE live_stream_schedule DROP CONSTRAINT IF EXISTS live_stream_schedule_status_check;
    ALTER TABLE live_stream_schedule 
        ADD CONSTRAINT live_stream_schedule_status_check 
        CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- الآن يمكننا إضافة NOT NULL (بعد ملء البيانات)
DO $$
BEGIN
    -- التحقق من عدم وجود بيانات NULL قبل إضافة NOT NULL
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

