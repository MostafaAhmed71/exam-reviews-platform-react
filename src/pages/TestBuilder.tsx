import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { navigateTo, currentTestId, editingQuestionId, currentScreen } from '../lib/navigation';
import { 
    createElectronicTest, 
    getTestWithQuestions, 
    addMultipleQuestionsToTest, 
    deleteQuestion,
    deleteMultipleQuestions,
    getAllElectronicTests,
} from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import type { ElectronicTest, TestQuestion, QuestionType } from '../types/database.types';
import './TestBuilder.css';

export function TestBuilder() {
    const [selectedStage, setSelectedStage] = useState<'middle' | 'high' | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [subjectName, setSubjectName] = useState('');
    const [testTitle, setTestTitle] = useState('');
    const [testDescription, setTestDescription] = useState('');
    const [currentTest, setCurrentTest] = useState<ElectronicTest | null>(null);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLoadTestModal, setShowLoadTestModal] = useState(false);
    const [availableTests, setAvailableTests] = useState<ElectronicTest[]>([]);
    const [loadingTests, setLoadingTests] = useState(false);

    const subjects = [
        'إسلاميات',
        'الدراسات الاجتماعية',
        'الرياضيات',
        'العلوم',
        'اللغة الإنجليزية',
        'اللغة العربية',
        'المهارات الحياتية',
        'تنمية المهارات',
        'توحيد',
        'فقة',
        'قرآن'
    ];

    const getGrades = () => {
        if (selectedStage === 'middle') {
            return [
                { id: 7, name: 'الصف الأول متوسط' },
                { id: 8, name: 'الصف الثاني متوسط' },
                { id: 9, name: 'الصف الثالث متوسط' },
            ];
        } else if (selectedStage === 'high') {
            return [
                { id: 10, name: 'الصف الأول ثانوي' },
                { id: 11, name: 'الصف الثاني ثانوي' },
                { id: 12, name: 'الصف الثالث ثانوي' },
            ];
        }
        return [];
    };

    const grades = getGrades();

    const handleCreateTest = async () => {
        if (!selectedStage || !selectedGrade || !subjectName.trim() || !testTitle.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إكمال جميع الحقول المطلوبة' });
            return;
        }

        setLoading(true);
        setMessage(null);

        const result = await createElectronicTest(
            selectedStage,
            selectedGrade,
            subjectName.trim(),
            testTitle.trim(),
            testDescription.trim() || undefined
        );

        setLoading(false);

        if (result.success && result.testId) {
            setMessage({ type: 'success', text: 'تم إنشاء الاختبار بنجاح! يمكنك الآن إضافة الأسئلة' });
            // Load the test
            const testData = await getTestWithQuestions(result.testId);
            if (testData) {
                setCurrentTest(testData.test);
                setQuestions(testData.questions);
            }
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل إنشاء الاختبار' });
        }
    };

    const handleLoadTest = async (testId: number) => {
        setLoading(true);
        setMessage(null);
        const testData = await getTestWithQuestions(testId);
        setLoading(false);

        if (testData) {
            setCurrentTest(testData.test);
            setQuestions(testData.questions);
            setSelectedStage(testData.test.stage);
            setSelectedGrade(testData.test.grade);
            setSubjectName(testData.test.subject_name);
            setTestTitle(testData.test.test_title);
            setTestDescription(testData.test.test_description || '');
            setShowLoadTestModal(false);
            setMessage({ type: 'success', text: 'تم تحميل الاختبار بنجاح! يمكنك الآن إضافة المزيد من الأسئلة' });
        } else {
            setMessage({ type: 'error', text: 'فشل تحميل الاختبار' });
        }
    };

    const handleOpenLoadTestModal = async () => {
        setShowLoadTestModal(true);
        setLoadingTests(true);
        const tests = await getAllElectronicTests();
        setAvailableTests(tests);
        setLoadingTests(false);
    };

    const handleAddQuestion = () => {
        if (!currentTest || !currentTest.id) {
            setMessage({ type: 'error', text: 'الرجاء إنشاء أو تحميل اختبار أولاً' });
            return;
        }
        currentTestId.set(currentTest.id);
        editingQuestionId.set(null);
        navigateTo('add-question');
    };

    const handleEditQuestion = (question: TestQuestion) => {
        if (!currentTest || !currentTest.id || !question.id) {
            return;
        }
        currentTestId.set(currentTest.id);
        editingQuestionId.set(question.id);
        navigateTo('add-question');
    };

    const handleDeleteQuestion = async (questionId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            return;
        }

        const result = await deleteQuestion(questionId);
        if (result.success) {
            setQuestions(questions.filter(q => q.id !== questionId));
            setMessage({ type: 'success', text: 'تم حذف السؤال بنجاح' });
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف السؤال' });
        }
    };

    const handleToggleQuestionSelection = (questionId: number) => {
        const newSelected = new Set(selectedQuestions);
        if (newSelected.has(questionId)) {
            newSelected.delete(questionId);
        } else {
            newSelected.add(questionId);
        }
        setSelectedQuestions(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedQuestions.size === questions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(new Set(questions.map(q => q.id!)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedQuestions.size === 0) {
            setMessage({ type: 'error', text: 'يرجى تحديد الأسئلة المراد حذفها' });
            return;
        }

        if (!window.confirm(`هل أنت متأكد من حذف ${selectedQuestions.size} سؤال؟`)) {
            return;
        }

        setLoading(true);
        const questionIds = Array.from(selectedQuestions);
        const result = await deleteMultipleQuestions(questionIds);
        setLoading(false);

        if (result.success) {
            setQuestions(questions.filter(q => !selectedQuestions.has(q.id!)));
            setSelectedQuestions(new Set());
            setMessage({ type: 'success', text: `تم حذف ${result.deletedCount} سؤال بنجاح` });
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف الأسئلة' });
        }
    };

    const screen = useStore(currentScreen);
    
    // Reload questions when returning from add-question screen
    useEffect(() => {
        const reloadQuestions = async () => {
            if (currentTest && currentTest.id && screen === 'test-builder') {
                const testData = await getTestWithQuestions(currentTest.id);
                if (testData) {
                    setQuestions(testData.questions);
                }
            }
        };

        reloadQuestions();
    }, [screen, currentTest]);

    const handleBulkAddQuestions = async (questionsData: Array<{
        question_text: string;
        question_type: QuestionType;
        points: number;
        options?: string[];
        correct_answer?: string;
    }>) => {
        if (!currentTest || !currentTest.id) return;

        if (questionsData.length === 0) {
            setMessage({ type: 'error', text: 'يرجى إدخال أسئلة' });
            return;
        }

        setLoading(true);
        const result = await addMultipleQuestionsToTest(currentTest.id, questionsData);
        setLoading(false);

        if (result.success) {
            setMessage({ type: 'success', text: `تم إضافة ${result.addedCount} سؤال بنجاح` });
            setShowBulkAddModal(false);
            // Reload questions
            if (currentTest.id) {
                const testData = await getTestWithQuestions(currentTest.id);
                if (testData) {
                    setQuestions(testData.questions);
                }
            }
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل إضافة الأسئلة' });
        }
    };

    return (
        <Layout showFooter={false}>
            <div className="test-builder">
                <div className="admin-header">
                    <div className="admin-title-container">
                        <h1 className="admin-title">إنشاء اختبار إلكتروني</h1>
                        <p className="admin-subtitle">أضف الأسئلة وأنشئ اختباراً تفاعلياً</p>
                    </div>
                    <div className="admin-header-actions">
                        <Button
                            variant="secondary"
                            onClick={() => navigateTo('admin')}
                            className="admin-exit-button"
                        >
                            العودة لرفع المواد
                        </Button>
                    </div>
                </div>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {!currentTest ? (
                    // Create Test Form or Load Existing Test
                    <div className="upload-form">
                        <div className="form-section">
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                <Button
                                    variant="primary"
                                    onClick={handleOpenLoadTestModal}
                                    className="load-test-btn"
                                >
                                    تحميل اختبار موجود
                                </Button>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem' }}>
                                <p style={{ margin: 0, color: '#64748b' }}>أو</p>
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">اختر المرحلة</label>
                            <div className="review-type-grid">
                                <button
                                    className={`review-type-btn ${selectedStage === 'middle' ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedStage('middle');
                                        setSelectedGrade(null);
                                    }}
                                    disabled={loading}
                                >
                                    المرحلة المتوسطة
                                </button>
                                <button
                                    className={`review-type-btn ${selectedStage === 'high' ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedStage('high');
                                        setSelectedGrade(null);
                                    }}
                                    disabled={loading}
                                >
                                    المرحلة الثانوية
                                </button>
                            </div>
                        </div>

                        {selectedStage && (
                            <div className="form-section">
                                <label className="form-label">اختر الصف</label>
                                <div className="grade-grid">
                                    {grades.map((grade) => (
                                        <button
                                            key={grade.id}
                                            className={`grade-btn ${selectedGrade === grade.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedGrade(grade.id)}
                                            disabled={loading}
                                        >
                                            {grade.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedGrade && (
                            <>
                                <div className="form-section">
                                    <label className="form-label">اسم المادة</label>
                                    <select
                                        className="subject-select"
                                        value={subjectName}
                                        onChange={(e) => setSubjectName(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="">اختر المادة</option>
                                        {subjects.map((subject) => (
                                            <option key={subject} value={subject}>
                                                {subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-section">
                                    <label className="form-label">عنوان الاختبار</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={testTitle}
                                        onChange={(e) => setTestTitle(e.target.value)}
                                        placeholder="مثال: اختبار الرياضيات - الفصل الأول"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="form-section">
                                    <label className="form-label">وصف الاختبار (اختياري)</label>
                                    <textarea
                                        className="form-textarea"
                                        value={testDescription}
                                        onChange={(e) => setTestDescription(e.target.value)}
                                        placeholder="وصف مختصر للاختبار"
                                        disabled={loading}
                                        rows={3}
                                    />
                                </div>

                                <Button
                                    onClick={handleCreateTest}
                                    disabled={loading || !selectedStage || !selectedGrade || !subjectName.trim() || !testTitle.trim()}
                                    className="upload-btn"
                                >
                                    {loading ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    // Test Builder Interface
                    <div className="test-builder-content">
                        <div className="test-info-card">
                            <h2>{currentTest.test_title}</h2>
                            <p>{currentTest.test_description || 'لا يوجد وصف'}</p>
                            <p className="test-meta">
                                {currentTest.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'} • 
                                {getGradeName(currentTest.grade)} • 
                                {currentTest.subject_name}
                            </p>
                            <div className="test-actions">
                                <Button
                                    variant="primary"
                                    onClick={handleAddQuestion}
                                >
                                    إضافة سؤال جديد
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowBulkAddModal(true)}
                                >
                                    إضافة أسئلة متعددة
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setCurrentTest(null);
                                        setQuestions([]);
                                        setTestTitle('');
                                        setTestDescription('');
                                    }}
                                >
                                    اختبار جديد
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigateTo('my-tests')}
                                    className="button-enhanced ripple-effect"
                                >
                                    الاختبارات المرفوعة
                                </Button>
                            </div>
                        </div>

                        <div className="questions-list">
                            <div className="questions-header">
                                <h3 className="questions-title">الأسئلة ({questions.length})</h3>
                                {questions.length > 0 && (
                                    <div className="bulk-actions">
                                        <Button
                                            variant="secondary"
                                            onClick={handleSelectAll}
                                            className="select-all-btn"
                                        >
                                            {selectedQuestions.size === questions.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                                        </Button>
                                        {selectedQuestions.size > 0 && (
                                            <Button
                                                variant="secondary"
                                                onClick={handleDeleteSelected}
                                                disabled={loading}
                                                className="delete-selected-btn"
                                            >
                                                حذف المحدد ({selectedQuestions.size})
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {questions.length === 0 ? (
                                <div className="empty-state">
                                    <p>لا توجد أسئلة بعد. ابدأ بإضافة سؤال جديد</p>
                                </div>
                            ) : (
                                <div className="questions-grid">
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="question-card">
                                            <div className="question-checkbox-wrapper">
                                                <input
                                                    type="checkbox"
                                                    className="question-checkbox"
                                                    checked={selectedQuestions.has(question.id!)}
                                                    onChange={() => handleToggleQuestionSelection(question.id!)}
                                                />
                                            </div>
                                            <div className="question-content">
                                                <div className="question-header">
                                                    <span className="question-number">سؤال {index + 1}</span>
                                                    <span className="question-type-badge">
                                                        {question.question_type === 'true_false' ? 'صح/خطأ' :
                                                         question.question_type === 'multiple_choice' ? 'اختياري' :
                                                         question.question_type === 'fill_in_blank' ? 'إكمال/تصحيح' :
                                                         question.question_type === 'vocabulary' ? 'مفردات' :
                                                        question.question_type === 'odd_word' ? 'كلمة غريبة' :
                                                        question.question_type === 'matching' ? 'مطابقة' :
                                                        question.question_type === 'fill_from_box' ? 'إكمال من صندوق' :
                                                        question.question_type === 'do_as_shown' ? 'افعل كما هو موضح' :
                                                        question.question_type === 'use_a_or_an' ? 'استخدم a أو an' :
                                                        question.question_type === 'reading_comprehension' ? 'الرجراف (القطعة)' : 'مقالي'}
                                                    </span>
                                                    <span className="question-points">{question.points} نقطة</span>
                                                </div>
                                                {(() => {
                                                    const questionText = question.question_text;
                                                    const isImageUrl = questionText.startsWith('http://') || 
                                                                     questionText.startsWith('https://') ||
                                                                     questionText.startsWith('uploads/');
                                                    
                                                    if (isImageUrl) {
                                                        return (
                                                            <div className="question-image-container" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                                                <img 
                                                                    src={questionText} 
                                                                    alt="صورة السؤال" 
                                                                    style={{ 
                                                                        maxWidth: '100%', 
                                                                        height: 'auto', 
                                                                        maxHeight: '200px',
                                                                        borderRadius: '0.5rem',
                                                                        border: '2px solid rgba(255, 255, 255, 0.1)'
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    } else {
                                                        return <p className="question-text">{questionText}</p>;
                                                    }
                                                })()}
                                                
                                                {question.question_type === 'multiple_choice' && question.options && (
                                                    <div className="question-options">
                                                        {(Array.isArray(question.options) ? question.options : []).map((opt, idx) => (
                                                            <div key={idx} className="option-item">
                                                                {typeof opt === 'string' ? opt : opt.text}
                                                                {question.correct_answer === idx.toString() && (
                                                                    <span className="correct-mark">✓</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {question.question_type === 'odd_word' && question.options && (() => {
                                                    const optionsData = typeof question.options === 'object' && !Array.isArray(question.options) ? question.options : null;
                                                    const words = optionsData && 'words' in optionsData && Array.isArray(optionsData.words) ? optionsData.words : [];
                                                    const correctIndex = question.correct_answer ? parseInt(question.correct_answer) : -1;
                                                    return (
                                                        <div className="question-options">
                                                            {words.map((word, idx) => (
                                                                <div key={idx} className="option-item">
                                                                    {word}
                                                                    {idx === correctIndex && (
                                                                        <span className="correct-mark">✓ (الكلمة الغريبة)</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                                
                                                {question.question_type === 'matching' && question.options && (() => {
                                                    const optionsData = typeof question.options === 'object' && !Array.isArray(question.options) ? question.options : null;
                                                    const pairs = optionsData && 'pairs' in optionsData && Array.isArray(optionsData.pairs) ? optionsData.pairs : [];
                                                    const correctAnswers = (question.correct_answer || '').split(',');
                                                    return (
                                                        <div className="question-options">
                                                            {pairs.map((pair: any, idx: number) => (
                                                                <div key={idx} className="option-item">
                                                                    {pair.word} → {pair.options?.find((opt: any) => opt.key === correctAnswers[idx])?.value || correctAnswers[idx] || 'غير محدد'}
                                                                    <span className="correct-mark">✓</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                                
                                                {question.question_type === 'fill_from_box' && question.options && (() => {
                                                    const optionsData = typeof question.options === 'object' && !Array.isArray(question.options) ? question.options : null;
                                                    const words = optionsData && 'words' in optionsData && Array.isArray(optionsData.words) ? optionsData.words : [];
                                                    const sentences = optionsData && 'sentences' in optionsData && Array.isArray(optionsData.sentences) ? optionsData.sentences : [];
                                                    const correctAnswers = (question.correct_answer || '').split(',');
                                                    return (
                                                        <div className="question-options">
                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <strong>الكلمات المتاحة:</strong> {words.join(', ')}
                                                            </div>
                                                            {sentences.map((sentence: string, idx: number) => (
                                                                <div key={idx} className="option-item" style={{ marginBottom: '0.5rem' }}>
                                                                    {sentence.replace(/\.{3,}/g, `[${correctAnswers[idx] || '...'}]`)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                                
                                                {question.question_type === 'true_false' && (
                                                    <div className="question-answer">
                                                        الإجابة الصحيحة: {question.correct_answer === 'true' ? 'صح' : 'خطأ'}
                                                    </div>
                                                )}
                                                
                                                {question.question_type === 'fill_in_blank' && (
                                                    <div className="question-answer">
                                                        الإجابة الصحيحة: {question.correct_answer || 'غير محدد'}
                                                    </div>
                                                )}
                                                <div className="question-actions">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleEditQuestion(question)}
                                                        className="question-edit-btn"
                                                    >
                                                        تعديل
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => question.id && handleDeleteQuestion(question.id)}
                                                        className="question-delete-btn"
                                                    >
                                                        حذف
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* Bulk Add Questions Modal */}
                {showBulkAddModal && (
                    <BulkAddQuestionsModal
                        onSave={handleBulkAddQuestions}
                        onClose={() => setShowBulkAddModal(false)}
                    />
                )}

                {/* Load Test Modal */}
                {showLoadTestModal && (
                    <LoadTestModal
                        tests={availableTests}
                        loading={loadingTests}
                        onLoad={handleLoadTest}
                        onClose={() => setShowLoadTestModal(false)}
                    />
                )}
            </div>
        </Layout>
    );
}

// Bulk Add Questions Modal Component
function BulkAddQuestionsModal({
    onSave,
    onClose
}: {
    onSave: (questionsData: Array<{
        question_text: string;
        question_type: QuestionType;
        points: number;
        options?: string[];
        correct_answer?: string;
    }>) => void;
    onClose: () => void;
}) {
    const [questionsText, setQuestionsText] = useState('');
    const [questionType, setQuestionType] = useState<QuestionType>('essay');
    const [points, setPoints] = useState(1);
    const [importMode, setImportMode] = useState<'text' | 'csv'>('text');
    const [parsedQuestions, setParsedQuestions] = useState<Array<{
        question_text: string;
        question_type: QuestionType;
        points: number;
        options?: string[];
        correct_answer?: string;
    }>>([]);

    const handleSave = () => {
        if (parsedQuestions.length === 0 && !questionsText.trim()) {
            alert('يرجى إدخال الأسئلة');
            return;
        }

        let questionsToSave: Array<{
            question_text: string;
            question_type: QuestionType;
            points: number;
            options?: string[];
            correct_answer?: string;
        }> = [];

        if (importMode === 'csv' && parsedQuestions.length > 0) {
            // Use parsed questions from CSV
            questionsToSave = parsedQuestions;
        } else {
            // Parse from text input
            const lines = questionsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            if (questionType === 'essay') {
                questionsToSave = lines.map(questionText => ({
                    question_text: questionText,
                    question_type: questionType,
                    points: points,
                }));
            } else if (questionType === 'true_false') {
                // Format: السؤال|الإجابة (صح/خطأ)
                questionsToSave = lines.map(line => {
                    const parts = line.split('|').map(p => p.trim());
                    const questionText = parts[0] || line;
                    const answer = parts[1]?.toLowerCase();
                    let correctAnswer = 'true';
                    
                    if (answer === 'خطأ' || answer === 'false' || answer === '0') {
                        correctAnswer = 'false';
                    }
                    
                    return {
                        question_text: questionText,
                        question_type: questionType,
                        points: points,
                        correct_answer: correctAnswer,
                    };
                });
            } else if (questionType === 'multiple_choice') {
                // Format: السؤال|الخيار1|الخيار2|الخيار3|الخيار4|الإجابة
                questionsToSave = lines.map(line => {
                    const parts = line.split('|').map(p => p.trim());
                    const questionText = parts[0] || line;
                    const options = parts.slice(1, -1).filter(opt => opt.length > 0);
                    const correctAnswerIndex = parts[parts.length - 1];
                    
                    return {
                        question_text: questionText,
                        question_type: questionType,
                        points: points,
                        options: options.length > 0 ? options : undefined,
                        correct_answer: correctAnswerIndex || '0',
                    };
                });
            }
        }

        onSave(questionsToSave);
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (importMode === 'csv') {
                parseCSVFile(content);
            } else {
                setQuestionsText(content);
                setParsedQuestions([]);
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    const parseCSVFile = (content: string) => {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const questions: Array<{
            question_text: string;
            question_type: QuestionType;
            points: number;
            options?: string[];
            correct_answer?: string;
        }> = [];
        
        // Skip header if exists
        const headerLine = lines[0]?.toLowerCase() || '';
        const hasHeader = headerLine.includes('السؤال') || headerLine.includes('question');
        const startIndex = hasHeader ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line (handle quoted fields)
            const fields = parseCSVLine(line);
            if (fields.length === 0) continue;

            const questionText = fields[0];
            
            if (questionType === 'essay') {
                // مقالي: السؤال فقط
                questions.push({
                    question_text: questionText,
                    question_type: questionType,
                    points: points,
                });
            } else if (questionType === 'true_false') {
                // صح/خطأ: السؤال, الإجابة (صح/خطأ أو true/false)
                const answer = fields[1]?.toLowerCase().trim() || '';
                let correctAnswer = 'true';
                
                if (answer === 'خطأ' || answer === 'false' || answer === '0' || answer === 'no') {
                    correctAnswer = 'false';
                }
                
                questions.push({
                    question_text: questionText,
                    question_type: questionType,
                    points: points,
                    correct_answer: correctAnswer,
                });
            } else if (questionType === 'multiple_choice') {
                // اختياري: السؤال, الخيار1, الخيار2, الخيار3, الخيار4, الإجابة (رقم)
                const options = fields.slice(1, -1).filter(opt => opt.trim().length > 0);
                const correctAnswerIndex = fields[fields.length - 1]?.trim() || '0';
                
                questions.push({
                    question_text: questionText,
                    question_type: questionType,
                    points: points,
                    options: options.length > 0 ? options : undefined,
                    correct_answer: correctAnswerIndex,
                });
            }
        }
        
        setParsedQuestions(questions);
        // Also set text for display
        setQuestionsText(questions.map(q => q.question_text).join('\n'));
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const questionCount = questionsText.split('\n').filter(l => l.trim().length > 0).length;

    return (
        <div className="question-modal-overlay" onClick={onClose}>
            <div className="question-modal bulk-add-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>إضافة أسئلة متعددة</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-content">
                    <div className="form-group">
                        <label className="form-label">طريقة الإدخال</label>
                        <div className="import-mode-toggle">
                            <button
                                type="button"
                                className={`mode-btn ${importMode === 'text' ? 'active' : ''}`}
                                onClick={() => setImportMode('text')}
                            >
                                إدخال نصي
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${importMode === 'csv' ? 'active' : ''}`}
                                onClick={() => setImportMode('csv')}
                            >
                                استيراد CSV
                            </button>
                        </div>
                    </div>

                    {importMode === 'csv' && (
                        <div className="form-group">
                            <label className="form-label">استيراد ملف CSV</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileImport}
                                className="file-input"
                                id="csv-file-input"
                            />
                            <label htmlFor="csv-file-input" className="file-input-label">
                                <span>📁 اختر ملف CSV</span>
                            </label>
                            <p className="form-hint">
                                {questionType === 'essay' ? (
                                    <>
                                        💡 تنسيق CSV: السؤال في العمود الأول. يمكن أن يحتوي الملف على رأس (header).
                                        <br />
                                        <strong>مثال:</strong>
                                        <br />
                                        <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            السؤال<br />
                                            ما هي عاصمة المملكة؟<br />
                                            كم عدد محافظات المملكة؟
                                        </code>
                                    </>
                                ) : questionType === 'true_false' ? (
                                    <>
                                        💡 تنسيق CSV: العمود الأول = السؤال، العمود الثاني = الإجابة (صح/خطأ أو true/false).
                                        <br />
                                        <strong>مثال:</strong>
                                        <br />
                                        <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            السؤال,الإجابة<br />
                                            المملكة العربية السعودية في آسيا,صح<br />
                                            جدة هي عاصمة المملكة,خطأ
                                        </code>
                                    </>
                                ) : (
                                    <>
                                        💡 تنسيق CSV: العمود الأول = السؤال، الأعمدة التالية = الخيارات، العمود الأخير = رقم الإجابة الصحيحة (0, 1, 2...).
                                        <br />
                                        <strong>مثال:</strong>
                                        <br />
                                        <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            السؤال,الخيار1,الخيار2,الخيار3,الخيار4,الإجابة<br />
                                            ما هي عاصمة المملكة؟,الرياض,جدة,الدمام,مكة,0<br />
                                            كم عدد محافظات المملكة؟,10,13,15,20,1
                                        </code>
                                    </>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">نوع الأسئلة</label>
                        <select
                            className="form-select"
                            value={questionType}
                            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                        >
                            <option value="true_false">صح/خطأ</option>
                            <option value="multiple_choice">اختياري</option>
                            <option value="fill_in_blank">إكمال الجملة/تصحيح الخطأ</option>
                            <option value="vocabulary">المفردات (كتابة الكلمات)</option>
                            <option value="essay">مقالي</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">النقاط لكل سؤال</label>
                        <input
                            type="number"
                            className="form-input"
                            value={points}
                            onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                            min="1"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            الأسئلة ({importMode === 'csv' ? parsedQuestions.length : questionCount} سؤال)
                        </label>
                        {importMode === 'text' && (
                            <textarea
                                className="form-textarea"
                                value={questionsText}
                                onChange={(e) => {
                                    setQuestionsText(e.target.value);
                                    setParsedQuestions([]);
                                }}
                                placeholder={questionType === 'essay' 
                                    ? "اكتب الأسئلة هنا، سؤال واحد في كل سطر...\n\nمثال:\nما هي عاصمة المملكة العربية السعودية؟\nكم عدد محافظات المملكة؟"
                                    : questionType === 'true_false'
                                    ? "اكتب الأسئلة هنا، سؤال واحد في كل سطر مع الإجابة مفصولة ب |\n\nمثال:\nالمملكة العربية السعودية في آسيا|صح\nالرياض هي عاصمة المملكة|صح\nجدة هي عاصمة المملكة|خطأ"
                                    : "اكتب الأسئلة هنا، سؤال واحد في كل سطر مع الخيارات والإجابة مفصولة ب |\n\nمثال:\nما هي عاصمة المملكة؟|الرياض|جدة|الدمام|مكة|0\nكم عدد محافظات المملكة؟|10|13|15|20|1"
                                }
                                rows={12}
                                style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
                            />
                        )}
                        {importMode === 'csv' && parsedQuestions.length > 0 && (
                            <div className="parsed-questions-preview">
                                <p className="preview-title">تم تحليل {parsedQuestions.length} سؤال:</p>
                                <div className="preview-list">
                                    {parsedQuestions.slice(0, 5).map((q, idx) => (
                                        <div key={idx} className="preview-item">
                                            <strong>{idx + 1}.</strong> {q.question_text}
                                            {q.correct_answer && (
                                                <span className="preview-answer">
                                                    {' '}(الإجابة: {q.correct_answer === 'true' ? 'صح' : q.correct_answer === 'false' ? 'خطأ' : `الخيار ${parseInt(q.correct_answer) + 1}`})
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {parsedQuestions.length > 5 && (
                                        <p className="preview-more">... و {parsedQuestions.length - 5} سؤال آخر</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <p className="form-hint">
                            {importMode === 'text' ? (
                                questionType === 'essay' 
                                    ? '💡 اكتب كل سؤال في سطر منفصل. سيتم إضافة جميع الأسئلة بنفس النوع والنقاط المحددة.'
                                    : questionType === 'true_false'
                                    ? '💡 اكتب السؤال ثم | ثم الإجابة (صح/خطأ). مثال: السؤال|صح'
                                    : '💡 اكتب السؤال ثم | ثم الخيارات ثم | ثم رقم الإجابة الصحيحة (0, 1, 2...). مثال: السؤال|خيار1|خيار2|خيار3|خيار4|0'
                            ) : (
                                questionType === 'essay'
                                    ? '💡 تنسيق CSV: السؤال في العمود الأول. يمكن أن يحتوي الملف على رأس (header).'
                                    : questionType === 'true_false'
                                    ? '💡 تنسيق CSV: العمود الأول = السؤال، العمود الثاني = الإجابة (صح/خطأ أو true/false).'
                                    : '💡 تنسيق CSV: العمود الأول = السؤال، الأعمدة التالية = الخيارات، العمود الأخير = رقم الإجابة الصحيحة (0, 1, 2...).'
                            )}
                        </p>
                    </div>

                    <div className="modal-actions">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            fullWidth
                            disabled={questionCount === 0}
                        >
                            إضافة {questionCount} سؤال
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            fullWidth
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Load Test Modal Component
function LoadTestModal({
    tests,
    loading,
    onLoad,
    onClose
}: {
    tests: ElectronicTest[];
    loading: boolean;
    onLoad: (testId: number) => void;
    onClose: () => void;
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTests = tests.filter(test =>
        test.test_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="question-modal-overlay" onClick={onClose}>
            <div className="question-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2>تحميل اختبار موجود</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-content">
                    <div className="form-group">
                        <label className="form-label">البحث في الاختبارات</label>
                        <input
                            type="text"
                            className="form-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ابحث بالعنوان أو المادة..."
                        />
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                            <p>جاري تحميل الاختبارات...</p>
                        </div>
                    ) : filteredTests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>لا توجد اختبارات {searchTerm ? 'مطابقة للبحث' : ''}</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {filteredTests.map((test) => (
                                <div
                                    key={test.id}
                                    style={{
                                        padding: '1rem',
                                        marginBottom: '0.75rem',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => test.id && onLoad(test.id)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#eff6ff';
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{test.test_title}</h3>
                                    <p style={{ margin: '0 0 0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                                        {test.subject_name} • {getGradeName(test.grade)} • {test.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
                                    </p>
                                    {test.test_description && (
                                        <p style={{ margin: '0.5rem 0 0 0', color: '#475569', fontSize: '0.85rem' }}>
                                            {test.test_description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose} fullWidth>
                        إلغاء
                    </Button>
                </div>
            </div>
        </div>
    );
}

