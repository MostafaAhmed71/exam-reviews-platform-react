-- ============================================
-- جدول حفظ الفيديوهات للمشاهدة لاحقاً
-- ============================================

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS saved_videos (
    id BIGSERIAL PRIMARY KEY,
    
    -- معرف المستخدم (session token)
    session_token TEXT NOT NULL,
    
    -- معلومات الفيديو من live_stream_schedule
    schedule_id BIGINT, -- معرف الفيديو من جدول live_stream_schedule
    
    -- معلومات الفيديو (للاحتفاظ بها حتى لو تم حذف الفيديو من الجدول)
    video_title TEXT,
    video_description TEXT,
    video_url TEXT NOT NULL,
    teacher_name TEXT,
    subject_name TEXT,
    grade INTEGER,
    stage TEXT,
    
    -- معلومات إضافية
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- حالة الحفظ (saved, watched, removed)
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'watched', 'removed')),
    
    -- ملاحظات المستخدم (اختياري)
    notes TEXT,
    
    -- منع حفظ نفس الفيديو مرتين لنفس المستخدم
    UNIQUE(session_token, schedule_id)
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_saved_videos_session_token ON saved_videos(session_token);
CREATE INDEX IF NOT EXISTS idx_saved_videos_status ON saved_videos(status);
CREATE INDEX IF NOT EXISTS idx_saved_videos_saved_at ON saved_videos(saved_at DESC);

-- تعليقات على الجدول
COMMENT ON TABLE saved_videos IS 'جدول حفظ الفيديوهات للمشاهدة لاحقاً';
COMMENT ON COLUMN saved_videos.session_token IS 'معرف جلسة المستخدم (يستخدم لتحديد المستخدم)';
COMMENT ON COLUMN saved_videos.schedule_id IS 'معرف الفيديو من جدول live_stream_schedule';
COMMENT ON COLUMN saved_videos.status IS 'حالة الحفظ: saved (محفوظ), watched (تمت المشاهدة), removed (تم الحذف)';

