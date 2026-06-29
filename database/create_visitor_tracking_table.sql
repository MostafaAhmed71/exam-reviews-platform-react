-- إنشاء جدول لتتبع الزوار
-- هذا السكريبت ينشئ جدول لتتبع الزوار ومشاهدات الفيديوهات

-- جدول تتبع الزوار
CREATE TABLE IF NOT EXISTS visitor_tracking (
    id BIGSERIAL PRIMARY KEY,
    session_token TEXT NOT NULL,
    page_type TEXT NOT NULL, -- 'welcome', 'videos', 'electronic', 'test', etc.
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT
);

-- جدول تتبع مشاهدات الفيديوهات
CREATE TABLE IF NOT EXISTS video_views (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL REFERENCES uploaded_materials(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session ON visitor_tracking(session_token);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_page_type ON visitor_tracking(page_type);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_visited_at ON visitor_tracking(visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_session ON video_views(session_token);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON video_views(viewed_at DESC);

-- ملاحظات:
-- visitor_tracking: لتتبع جميع الزوار عند دخولهم أي صفحة في المنصة
-- video_views: لتتبع مشاهدات كل فيديو
-- session_token: معرف فريد لكل جلسة (يمكن استخدام localStorage أو sessionStorage)

