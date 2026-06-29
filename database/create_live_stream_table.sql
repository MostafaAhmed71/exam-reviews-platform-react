-- ============================================
-- جدول إعدادات البث المباشر
-- ============================================

CREATE TABLE IF NOT EXISTS live_stream_settings (
    id BIGSERIAL PRIMARY KEY,
    
    -- المرحلة الدراسية (middle فقط)
    stage TEXT NOT NULL CHECK (stage = 'middle'),
    
    -- الصف الدراسي (7, 8, 9 فقط)
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 9),
    
    -- رابط البث المباشر (YouTube Live URL أو Video ID)
    stream_url TEXT NOT NULL,
    
    -- عنوان البث (اختياري)
    stream_title TEXT,
    
    -- وصف البث (اختياري)
    stream_description TEXT,
    
    -- حالة البث (active/inactive)
    is_active BOOLEAN DEFAULT true,
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- منع التكرار: صف واحد = بث واحد
    UNIQUE(stage, grade)
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_live_stream_active ON live_stream_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_live_stream_stage_grade ON live_stream_settings(stage, grade);

-- تعليقات
COMMENT ON TABLE live_stream_settings IS 'جدول إعدادات البث المباشر (للمرحلة المتوسطة فقط)';
COMMENT ON COLUMN live_stream_settings.stage IS 'المرحلة الدراسية: middle فقط';
COMMENT ON COLUMN live_stream_settings.grade IS 'الصف الدراسي: 7, 8, أو 9';
COMMENT ON COLUMN live_stream_settings.stream_url IS 'رابط البث المباشر من YouTube';
COMMENT ON COLUMN live_stream_settings.is_active IS 'حالة البث: true (نشط) أو false (غير نشط)';

-- دالة لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS update_live_stream_updated_at ON live_stream_settings;
CREATE TRIGGER update_live_stream_updated_at
    BEFORE UPDATE ON live_stream_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE live_stream_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة (جميع المستخدمين يمكنهم القراءة)
CREATE POLICY "Allow public read access to live stream settings"
    ON live_stream_settings
    FOR SELECT
    USING (true);

-- سياسة للكتابة (فقط للمدير - يمكن تعديلها حسب الحاجة)
-- ملاحظة: يجب إضافة سياسة للكتابة حسب نظام المصادقة الخاص بك
CREATE POLICY "Allow authenticated users to manage live stream"
    ON live_stream_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- لا حاجة لسجل افتراضي - سيتم إنشاء سجل لكل صف عند الحاجة

