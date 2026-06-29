-- إضافة أنواع أسئلة جديدة
-- هذا السكريبت يحدث constraint في جدول test_questions

-- إزالة constraint القديم
ALTER TABLE test_questions DROP CONSTRAINT IF EXISTS test_questions_question_type_check;

-- إضافة constraint جديد مع جميع الأنواع
ALTER TABLE test_questions ADD CONSTRAINT test_questions_question_type_check 
    CHECK (question_type IN ('true_false', 'multiple_choice', 'essay', 'fill_in_blank', 'vocabulary', 'odd_word', 'matching', 'fill_from_box', 'do_as_shown', 'use_a_or_an', 'reading_comprehension'));

-- ملاحظات: 
-- fill_in_blank: لإكمال الجملة/تصحيح الخطأ/استخدام الصيغة المختصرة
--   - يستخدم question_text للسؤال
--   - يستخدم correct_answer للإجابة الصحيحة (نص)
-- vocabulary: لكتابة الكلمات تحت الصور
--   - يستخدم question_text لوصف السؤال (اختياري)
--   - يستخدم options لتخزين {words: [{word, imageUrl}]}
--   - يستخدم correct_answer للكلمات الصحيحة (مفصولة بفواصل)
-- odd_word: اختيار الكلمة الغريبة/المختلفة
--   - يستخدم question_text للعنوان (مثل: "School Supplies:")
--   - يستخدم options لتخزين {words: ["pen", "crayon", "food", "books"], correct: 2}
--   - يستخدم correct_answer لرقم الكلمة الصحيحة (0-based)
-- matching: مطابقة الكلمات مع عكسها/مرادفها
--   - يستخدم question_text للعنوان (اختياري)
--   - يستخدم options لتخزين {pairs: [{word: "single", match: "d", options: [{key: "a", value: "small"}, ...]}]}
--   - يستخدم correct_answer للإجابات (مثل: "d,b,a")
-- fill_from_box: إكمال الفراغات بكلمات من صندوق
--   - يستخدم question_text للجمل مع فراغات (مثل: "Amal is a new ...student... at our school.")
--   - يستخدم options لتخزين {words: ["student", "write", "cut"], sentences: ["Amal is a new ... at our school.", ...]}
--   - يستخدم correct_answer للإجابات (مثل: "student,write,cut")
-- do_as_shown: افعل كما هو موضح بين القوسين
--   - يستخدم question_text للسؤال مع التعليمات (مثل: "This is a car. (Change to the plural)")
--   - يستخدم options لتخزين {items: [{sentence: "This is a car.", instruction: "Change to the plural", answer: "These are cars"}, ...]}
--   - يستخدم correct_answer للإجابات (مثل: "These are cars,Those are oranges")
-- use_a_or_an: استخدم a أو an
--   - يستخدم question_text للعنوان (اختياري، مثل: "Use a or an")
--   - يستخدم options لتخزين {words: ["key", "car", "airplane", "egg", "mango", "ice cream"]}
--   - يستخدم correct_answer للإجابات (مثل: "a,a,an,an,a,an")
-- reading_comprehension: الرجراف (القطعة) مع أسئلة متعددة
--   - يستخدم question_text لنص القطعة (الرجراف)
--   - يستخدم options لتخزين {paragraph: "نص القطعة...", questions: [{question: "...", type: "multiple_choice|true_false|fill_in_blank", options: [...], correctAnswer: ...}, ...]}
--   - يستخدم correct_answer للإجابات الصحيحة (مفصولة بـ | مثل: "0|true|answer")

