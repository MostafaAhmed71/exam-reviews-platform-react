-- ============================================
-- جدول مواعيد عرض المحتوى المجدول (صور وفيديوهات)
-- ============================================

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS live_stream_schedule (
    id BIGSERIAL PRIMARY KEY,
    
    -- المرحلة الدراسية (middle فقط)
    stage TEXT NOT NULL CHECK (stage = 'middle'),
    
    -- الصف الدراسي (7, 8, 9 فقط)
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 9),
    
    -- اسم المادة
    subject_name TEXT NOT NULL CHECK (subject_name IN ('رياضيات', 'علوم', 'لغة إنجليزية', 'لغتي')),
    
    -- اسم المعلم
    teacher_name TEXT NOT NULL,
    
    -- نوع المحتوى (image أو video)
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
    
    -- رابط الملف (صورة أو فيديو)
    file_url TEXT NOT NULL,
    
    -- اسم الملف
    file_name TEXT NOT NULL,
    
    -- حجم الملف (بالبايت)
    file_size BIGINT,
    
    -- عنوان المحتوى (اختياري)
    content_title TEXT,
    
    -- وصف المحتوى (اختياري)
    content_description TEXT,
    
    -- موعد بدء العرض (تاريخ ووقت)
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- موعد انتهاء العرض (تاريخ ووقت)
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- حالة الموعد (scheduled, active, completed, cancelled)
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- التحقق من أن موعد الانتهاء بعد موعد البدء
    CONSTRAINT check_datetime_order CHECK (end_datetime > start_datetime)
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_grade ON live_stream_schedule(grade);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_subject ON live_stream_schedule(subject_name);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_content_type ON live_stream_schedule(content_type);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_status ON live_stream_schedule(status);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_grade_subject ON live_stream_schedule(grade, subject_name);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_start_datetime ON live_stream_schedule(start_datetime);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_end_datetime ON live_stream_schedule(end_datetime);
CREATE INDEX IF NOT EXISTS idx_live_stream_schedule_datetime_range ON live_stream_schedule(start_datetime, end_datetime);

-- تعليقات
COMMENT ON TABLE live_stream_schedule IS 'جدول مواعيد عرض المحتوى المجدول (صور وفيديوهات) لكل مادة';
COMMENT ON COLUMN live_stream_schedule.content_type IS 'نوع المحتوى: image (صورة) أو video (فيديو)';
COMMENT ON COLUMN live_stream_schedule.file_url IS 'رابط الملف (صورة أو فيديو) على السيرفر';
COMMENT ON COLUMN live_stream_schedule.start_datetime IS 'موعد بدء عرض المحتوى (تاريخ ووقت)';
COMMENT ON COLUMN live_stream_schedule.end_datetime IS 'موعد انتهاء عرض المحتوى (تاريخ ووقت)';
COMMENT ON COLUMN live_stream_schedule.subject_name IS 'اسم المادة: رياضيات، علوم، لغة إنجليزية، لغتي';
COMMENT ON COLUMN live_stream_schedule.status IS 'حالة الموعد: scheduled (مجدول), active (نشط), completed (مكتمل), cancelled (ملغي)';

-- دالة لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS update_live_stream_schedule_updated_at ON live_stream_schedule;
CREATE TRIGGER update_live_stream_schedule_updated_at
    BEFORE UPDATE ON live_stream_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE live_stream_schedule ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة (جميع المستخدمين يمكنهم القراءة)
DROP POLICY IF EXISTS "Allow public read access to live stream schedule" ON live_stream_schedule;
CREATE POLICY "Allow public read access to live stream schedule"
    ON live_stream_schedule
    FOR SELECT
    USING (true);

-- سياسة للكتابة (فقط للمدير)
DROP POLICY IF EXISTS "Allow authenticated users to manage live stream schedule" ON live_stream_schedule;
CREATE POLICY "Allow authenticated users to manage live stream schedule"
    ON live_stream_schedule
    FOR ALL
    USING (true)
    WITH CHECK (true);
