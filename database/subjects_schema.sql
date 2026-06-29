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

