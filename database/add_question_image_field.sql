-- إضافة حقل صورة السؤال
-- هذا السكريبت يضيف حقل question_image إلى جدول test_questions

-- إضافة حقل question_image (اختياري)
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS question_image TEXT;

-- ملاحظات:
-- question_image: رابط الصورة التوضيحية للسؤال (اختياري)
-- يمكن أن يحتوي السؤال على نص (question_text) وصورة (question_image) معاً
-- إذا كان question_image موجوداً، سيتم عرضه مع نص السؤال

