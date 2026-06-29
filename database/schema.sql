-- ============================================
-- قاعدة بيانات منصة المراجعات النهائية
-- ============================================

-- إنشاء جدول المواد المرفوعة
CREATE TABLE IF NOT EXISTS uploaded_materials (
    id BIGSERIAL PRIMARY KEY,
    
    -- معلومات المرحلة والصف
    stage TEXT NOT NULL CHECK (stage IN ('middle', 'high')),
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 12),
    
    -- نوع المحتوى
    content_type TEXT NOT NULL CHECK (content_type IN ('schedule', 'solved', 'unsolved', 'videos', 'electronic')),
    
    -- معلومات المادة
    subject_name TEXT NOT NULL,
    
    -- نوع المراجعة (للتوافق مع الإصدارات القديمة)
    review_type TEXT CHECK (review_type IN ('solved', 'unsolved')),
    
    -- معلومات الملف
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- معلومات الفيديو (اختياري)
    video_title TEXT,
    video_description TEXT,
    
    -- معلومات الاختبار الإلكتروني (اختياري)
    quiz_title TEXT,
    quiz_description TEXT,
    quiz_url TEXT,
    
    -- ترتيب العرض للطلاب (1 = الأول، 0 = غير محدد)
    display_order INTEGER NOT NULL DEFAULT 0,

    -- معلومات التاريخ
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_stage ON uploaded_materials(stage);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_grade ON uploaded_materials(grade);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_content_type ON uploaded_materials(content_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_review_type ON uploaded_materials(review_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_subject ON uploaded_materials(subject_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_uploaded_at ON uploaded_materials(uploaded_at DESC);

-- فهرس مركب للبحث السريع
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_stage_grade_type ON uploaded_materials(stage, grade, content_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_materials_stage_grade_review ON uploaded_materials(stage, grade, review_type);

-- تعليقات على الجدول والأعمدة
COMMENT ON TABLE uploaded_materials IS 'جدول المواد الدراسية المرفوعة (مراجعات، جداول، فيديوهات، اختبارات إلكترونية)';
COMMENT ON COLUMN uploaded_materials.stage IS 'المرحلة الدراسية: middle (متوسط) أو high (ثانوي)';
COMMENT ON COLUMN uploaded_materials.grade IS 'الصف الدراسي: 7-9 للمتوسط، 10-12 للثانوي';
COMMENT ON COLUMN uploaded_materials.content_type IS 'نوع المحتوى: schedule, solved, unsolved, videos, electronic';
COMMENT ON COLUMN uploaded_materials.review_type IS 'نوع المراجعة (للتوافق مع الإصدارات القديمة): solved أو unsolved';
COMMENT ON COLUMN uploaded_materials.file_url IS 'رابط الملف على السيرفر';
COMMENT ON COLUMN uploaded_materials.video_title IS 'عنوان الفيديو (لنوع videos)';
COMMENT ON COLUMN uploaded_materials.quiz_url IS 'رابط الاختبار الإلكتروني (لنوع electronic)';

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS update_uploaded_materials_updated_at ON uploaded_materials;
CREATE TRIGGER update_uploaded_materials_updated_at
    BEFORE UPDATE ON uploaded_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- تفعيل RLS
ALTER TABLE uploaded_materials ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: السماح للجميع بقراءة البيانات
DROP POLICY IF EXISTS "Allow public read access" ON uploaded_materials;
CREATE POLICY "Allow public read access" ON uploaded_materials
    FOR SELECT
    USING (true);

-- سياسة للإدراج: السماح للمستخدمين المصرح لهم (يمكن تعديلها لاحقاً)
DROP POLICY IF EXISTS "Allow authenticated insert" ON uploaded_materials;
CREATE POLICY "Allow authenticated insert" ON uploaded_materials
    FOR INSERT
    WITH CHECK (true); -- يمكن تغييرها لتفعيل المصادقة

-- سياسة للتحديث: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated update" ON uploaded_materials;
CREATE POLICY "Allow authenticated update" ON uploaded_materials
    FOR UPDATE
    USING (true) -- يمكن تغييرها لتفعيل المصادقة
    WITH CHECK (true);

-- سياسة للحذف: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated delete" ON uploaded_materials;
CREATE POLICY "Allow authenticated delete" ON uploaded_materials
    FOR DELETE
    USING (true); -- يمكن تغييرها لتفعيل المصادقة

-- ============================================
-- بيانات تجريبية (اختياري - يمكن حذفها)
-- ============================================

-- إدراج بيانات تجريبية للاختبار
-- INSERT INTO uploaded_materials (stage, grade, content_type, subject_name, review_type, file_name, file_url, file_size)
-- VALUES 
--     ('middle', 7, 'schedule', 'عام', NULL, 'جدول_الاختبارات_الصف_7.png', 'https://example.com/schedule.png', 1024000),
--     ('middle', 7, 'solved', 'الرياضيات', 'solved', 'مراجعة_رياضيات_محلولة.pdf', 'https://example.com/math.pdf', 2048000),
--     ('high', 10, 'electronic', 'العلوم', NULL, 'اختبار_علوم_إلكتروني', 'https://example.com/quiz', 0);

-- ============================================
-- جدول الاختبارات الإلكترونية
-- ============================================

CREATE TABLE IF NOT EXISTS electronic_tests (
    id BIGSERIAL PRIMARY KEY,
    
    -- معلومات المرحلة والصف
    stage TEXT NOT NULL CHECK (stage IN ('middle', 'high')),
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 12),
    
    -- معلومات المادة
    subject_name TEXT NOT NULL,
    
    -- معلومات الاختبار
    test_title TEXT NOT NULL,
    test_description TEXT,
    
    -- رابط المشاركة (يتم إنشاؤه تلقائياً)
    share_token TEXT UNIQUE NOT NULL,
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- حالة الاختبار
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- جدول أسئلة الاختبارات
-- ============================================

CREATE TABLE IF NOT EXISTS test_questions (
    id BIGSERIAL PRIMARY KEY,
    
    -- ربط بالاختبار
    test_id BIGINT NOT NULL REFERENCES electronic_tests(id) ON DELETE CASCADE,
    
    -- نص السؤال
    question_text TEXT NOT NULL,
    
    -- نوع السؤال: true_false, multiple_choice, essay
    question_type TEXT NOT NULL CHECK (question_type IN ('true_false', 'multiple_choice', 'essay')),
    
    -- ترتيب السؤال
    question_order INTEGER NOT NULL DEFAULT 0,
    
    -- نقاط السؤال
    points INTEGER DEFAULT 1,
    
    -- خيارات الإجابة (للسؤال الاختياري)
    options JSONB, -- مثال: {"options": ["الخيار 1", "الخيار 2", "الخيار 3"], "correct_answer": 0}
    
    -- الإجابة الصحيحة (لصح/خطأ والاختياري)
    correct_answer TEXT, -- "true", "false", أو رقم الخيار الصحيح (0, 1, 2...)
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول إجابات الطلاب
-- ============================================

CREATE TABLE IF NOT EXISTS test_answers (
    id BIGSERIAL PRIMARY KEY,
    
    -- ربط بالسؤال
    question_id BIGINT NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    
    -- ربط بالاختبار
    test_id BIGINT NOT NULL REFERENCES electronic_tests(id) ON DELETE CASCADE,
    
    -- معرف الجلسة (لربط الإجابات بنفس الطالب)
    session_token TEXT NOT NULL,
    
    -- اسم الطالب (اختياري)
    student_name TEXT,
    
    -- الإجابة
    answer_text TEXT,
    
    -- هل الإجابة صحيحة (للسؤال الموضوعي)
    is_correct BOOLEAN,
    
    -- النقاط المحصلة
    points_earned INTEGER DEFAULT 0,
    
    -- معلومات التاريخ
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- فهارس للاختبارات
-- ============================================

CREATE INDEX IF NOT EXISTS idx_electronic_tests_stage ON electronic_tests(stage);
CREATE INDEX IF NOT EXISTS idx_electronic_tests_grade ON electronic_tests(grade);
CREATE INDEX IF NOT EXISTS idx_electronic_tests_subject ON electronic_tests(subject_name);
CREATE INDEX IF NOT EXISTS idx_electronic_tests_share_token ON electronic_tests(share_token);
CREATE INDEX IF NOT EXISTS idx_electronic_tests_created_at ON electronic_tests(created_at DESC);

-- ============================================
-- فهارس للأسئلة
-- ============================================

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_order ON test_questions(test_id, question_order);

-- ============================================
-- فهارس للإجابات
-- ============================================

CREATE INDEX IF NOT EXISTS idx_test_answers_question_id ON test_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_test_id ON test_answers(test_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_session ON test_answers(session_token);

-- ============================================
-- دالة لتحديث updated_at تلقائياً
-- ============================================

-- دالة لتحديث updated_at للاختبارات
DROP TRIGGER IF EXISTS update_electronic_tests_updated_at ON electronic_tests;
CREATE TRIGGER update_electronic_tests_updated_at
    BEFORE UPDATE ON electronic_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- دالة لتحديث updated_at للأسئلة
DROP TRIGGER IF EXISTS update_test_questions_updated_at ON test_questions;
CREATE TRIGGER update_test_questions_updated_at
    BEFORE UPDATE ON test_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- دالة لإنشاء share_token تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
    RETURN 'test_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies للاختبارات
-- ============================================

ALTER TABLE electronic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: السماح للجميع بقراءة الاختبارات النشطة
DROP POLICY IF EXISTS "Allow public read active tests" ON electronic_tests;
CREATE POLICY "Allow public read active tests" ON electronic_tests
    FOR SELECT
    USING (is_active = true);

-- سياسة للإدراج: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated insert tests" ON electronic_tests;
CREATE POLICY "Allow authenticated insert tests" ON electronic_tests
    FOR INSERT
    WITH CHECK (true);

-- سياسة للتحديث: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated update tests" ON electronic_tests;
CREATE POLICY "Allow authenticated update tests" ON electronic_tests
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- سياسة للحذف: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated delete tests" ON electronic_tests;
CREATE POLICY "Allow authenticated delete tests" ON electronic_tests
    FOR DELETE
    USING (true);

-- سياسات للأسئلة
DROP POLICY IF EXISTS "Allow public read questions" ON test_questions;
CREATE POLICY "Allow public read questions" ON test_questions
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage questions" ON test_questions;
CREATE POLICY "Allow authenticated manage questions" ON test_questions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- سياسات للإجابات
DROP POLICY IF EXISTS "Allow public insert answers" ON test_answers;
CREATE POLICY "Allow public insert answers" ON test_answers
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read own answers" ON test_answers;
CREATE POLICY "Allow public read own answers" ON test_answers
    FOR SELECT
    USING (true);

-- ============================================
-- جدول المواد الدراسية
-- ============================================

CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    
    -- اسم المادة
    name_ar TEXT NOT NULL UNIQUE,
    
    -- المرحلة (middle أو high)
    stage TEXT NOT NULL CHECK (stage IN ('middle', 'high')),
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول ربط المواد بالصفوف (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS subject_grades (
    id BIGSERIAL PRIMARY KEY,
    
    -- ربط بالمادة
    subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- الصف الدراسي
    grade INTEGER NOT NULL CHECK (grade >= 7 AND grade <= 12),
    
    -- معلومات التاريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- منع التكرار
    UNIQUE(subject_id, grade)
);

-- ============================================
-- فهارس للمواد
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subjects_stage ON subjects(stage);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name_ar);
CREATE INDEX IF NOT EXISTS idx_subject_grades_subject_id ON subject_grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_grades_grade ON subject_grades(grade);

-- ============================================
-- دالة لتحديث updated_at للمواد
-- ============================================

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies للمواد
-- ============================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_grades ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: السماح للجميع بقراءة المواد
DROP POLICY IF EXISTS "Allow public read subjects" ON subjects;
CREATE POLICY "Allow public read subjects" ON subjects
    FOR SELECT
    USING (true);

-- سياسة للإدراج: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated insert subjects" ON subjects;
CREATE POLICY "Allow authenticated insert subjects" ON subjects
    FOR INSERT
    WITH CHECK (true);

-- سياسة للتحديث: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated update subjects" ON subjects;
CREATE POLICY "Allow authenticated update subjects" ON subjects
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- سياسة للحذف: السماح للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Allow authenticated delete subjects" ON subjects;
CREATE POLICY "Allow authenticated delete subjects" ON subjects
    FOR DELETE
    USING (true);

-- سياسات لجدول ربط المواد بالصفوف
DROP POLICY IF EXISTS "Allow public read subject_grades" ON subject_grades;
CREATE POLICY "Allow public read subject_grades" ON subject_grades
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage subject_grades" ON subject_grades;
CREATE POLICY "Allow authenticated manage subject_grades" ON subject_grades
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ملاحظات مهمة
-- ============================================
-- 1. تأكد من تحديث RLS policies حسب متطلبات الأمان
-- 2. يمكن إضافة جدول للمستخدمين والمصادقة لاحقاً
-- 3. يمكن إضافة جدول للسجلات (logs) لتتبع العمليات
-- 4. يمكن إضافة جدول للتصنيفات (categories) إذا لزم الأمر
-- 5. share_token يستخدم لإنشاء رابط مشاركة فريد لكل اختبار
-- 6. جدول subjects يسمح بإدارة المواد حسب المرحلة والصف
-- 7. جدول subject_grades يسمح بربط مادة واحدة بأكثر من صف

