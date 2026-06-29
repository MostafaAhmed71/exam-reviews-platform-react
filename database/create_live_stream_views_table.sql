-- ============================================
-- جدول تتبع مشاهدات البث المباشر
-- ============================================

CREATE TABLE IF NOT EXISTS live_stream_views (
    id BIGSERIAL PRIMARY KEY,
    
    -- ربط بإعدادات البث المباشر
    stream_id BIGINT NOT NULL REFERENCES live_stream_settings(id) ON DELETE CASCADE,
    
    -- الصف الدراسي (للاحتفاظ به حتى بعد حذف البث)
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 9),
    
    -- معرف الجلسة
    session_token TEXT NOT NULL,
    
    -- وقت المشاهدة
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- معلومات إضافية
    user_agent TEXT,
    ip_address TEXT
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_live_stream_views_stream_id ON live_stream_views(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_views_grade ON live_stream_views(grade);
CREATE INDEX IF NOT EXISTS idx_live_stream_views_session ON live_stream_views(session_token);
CREATE INDEX IF NOT EXISTS idx_live_stream_views_viewed_at ON live_stream_views(viewed_at DESC);

-- تعليقات
COMMENT ON TABLE live_stream_views IS 'جدول تتبع مشاهدات البث المباشر';
COMMENT ON COLUMN live_stream_views.stream_id IS 'رابط بإعدادات البث المباشر';
COMMENT ON COLUMN live_stream_views.grade IS 'الصف الدراسي';

-- RLS Policies
ALTER TABLE live_stream_views ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة (جميع المستخدمين يمكنهم القراءة)
CREATE POLICY "Allow public read access to live stream views"
    ON live_stream_views
    FOR SELECT
    USING (true);

-- سياسة للكتابة (جميع المستخدمين يمكنهم الكتابة)
CREATE POLICY "Allow public write access to live stream views"
    ON live_stream_views
    FOR INSERT
    WITH CHECK (true);

