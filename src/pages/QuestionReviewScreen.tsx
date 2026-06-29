import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { getElectronicTestsByGradeForAdmin, getTestWithQuestions, deleteQuestion } from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import { getSubjectsByStageAndGrade } from '../services/subjectService';
import type { ElectronicTest, TestQuestion } from '../types/database.types';
import { navigateTo, currentTestId, editingQuestionId, questionReviewStage, questionReviewGrade, questionReviewSubject, questionReviewTestId } from '../lib/navigation';
import './QuestionReviewScreen.css';

export function QuestionReviewScreen() {
    // استخدام atoms للحفظ والاستعادة
    const savedStage = useStore(questionReviewStage);
    const savedGrade = useStore(questionReviewGrade);
    const savedSubject = useStore(questionReviewSubject);
    const savedTestId = useStore(questionReviewTestId);
    
    const [selectedStage, setSelectedStage] = useState<'middle' | 'high' | null>(savedStage);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(savedGrade);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(savedSubject);
    const [selectedTest, setSelectedTest] = useState<ElectronicTest | null>(null);
    const [tests, setTests] = useState<ElectronicTest[]>([]);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [subjects, setSubjects] = useState<string[]>([]);

    // تحديد الصفوف حسب المرحلة
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

    // تحميل المواد عند اختيار المرحلة والصف
    useEffect(() => {
        const loadSubjects = async () => {
            if (selectedStage && selectedGrade) {
                // جلب المواد من الاختبارات مباشرة (هذا يضمن أننا نعرض فقط المواد التي لديها اختبارات)
                const allTests = await getElectronicTestsByGradeForAdmin(selectedGrade);
                const uniqueSubjects = [...new Set(allTests.map(test => test.subject_name).filter(Boolean))];
                console.log('All tests for grade:', selectedGrade, allTests.length);
                console.log('Unique subjects from tests:', uniqueSubjects);
                
                if (uniqueSubjects.length > 0) {
                    // عرض المواد من الاختبارات مباشرة (هذا يضمن تطابق الأسماء)
                    setSubjects(uniqueSubjects.sort());
                    console.log('Setting subjects to:', uniqueSubjects.sort());
                } else {
                    // إذا لم توجد اختبارات، نجلب من جدول subjects
                    const loadedSubjects = await getSubjectsByStageAndGrade(selectedStage, selectedGrade);
                    console.log('No tests found, loading from subjects table:', loadedSubjects);
                    setSubjects(loadedSubjects);
                }
            } else {
                setSubjects([]);
            }
        };
        loadSubjects();
    }, [selectedStage, selectedGrade]);

    // تحميل الاختبارات عند اختيار الصف والمادة
    useEffect(() => {
        const loadTests = async () => {
            if (selectedGrade && selectedSubject) {
                setLoading(true);
                try {
                    const allTests = await getElectronicTestsByGradeForAdmin(selectedGrade);
                    console.log('All tests loaded:', allTests.length);
                    console.log('All test subjects:', allTests.map(t => t.subject_name));
                    console.log('Selected subject:', selectedSubject);
                    
                    const subjectTests = allTests.filter(test => {
                        // مقارنة دقيقة مع تجاهل المسافات
                        const testSubject = (test.subject_name || '').trim();
                        const selectedSubjectTrimmed = selectedSubject.trim();
                        
                        // مقارنة مباشرة
                        if (testSubject === selectedSubjectTrimmed) {
                            return true;
                        }
                        
                        // مقارنة مع أسماء بديلة شائعة
                        const subjectAliases: { [key: string]: string[] } = {
                            'لغتي': ['اللغة العربية', 'لغة عربية', 'عربي', 'عربية'],
                            'اللغة العربية': ['لغتي', 'لغة عربية', 'عربي', 'عربية'],
                            'لغة عربية': ['لغتي', 'اللغة العربية', 'عربي', 'عربية'],
                            'رياضيات': ['الرياضيات'],
                            'الرياضيات': ['رياضيات'],
                            'علوم': ['العلوم'],
                            'العلوم': ['علوم'],
                            'احياء': ['العلوم', 'أحياء'],
                            'أحياء': ['العلوم', 'احياء'],
                            'انجليزي': ['اللغة الإنجليزية', 'لغة إنجليزية', 'إنجليزي'],
                            'اللغة الإنجليزية': ['انجليزي', 'لغة إنجليزية', 'إنجليزي'],
                            'لغة إنجليزية': ['انجليزي', 'اللغة الإنجليزية', 'إنجليزي'],
                        };
                        
                        // التحقق من الأسماء البديلة
                        if (subjectAliases[selectedSubjectTrimmed]) {
                            return subjectAliases[selectedSubjectTrimmed].includes(testSubject);
                        }
                        if (subjectAliases[testSubject]) {
                            return subjectAliases[testSubject].includes(selectedSubjectTrimmed);
                        }
                        
                        return false;
                    });
                    
                    console.log('Filtered tests:', subjectTests.length);
                    console.log('Filtered test subjects:', subjectTests.map(t => t.subject_name));
                    
                    setTests(subjectTests);
                    
                    if (subjectTests.length === 0 && allTests.length > 0) {
                        setMessage({ 
                            type: 'error', 
                            text: `لا توجد اختبارات للمادة "${selectedSubject}". المواد المتاحة: ${[...new Set(allTests.map(t => t.subject_name))].join(', ')}` 
                        });
                    } else if (subjectTests.length === 0) {
                        setMessage({ 
                            type: 'error', 
                            text: 'لا توجد اختبارات متاحة لهذا الصف' 
                        });
                    } else {
                        setMessage(null);
                    }
                } catch (error) {
                    console.error('Error loading tests:', error);
                    setMessage({ type: 'error', text: 'حدث خطأ في تحميل الاختبارات' });
                } finally {
                    setLoading(false);
                }
            } else {
                setTests([]);
            }
            // لا نعيد تعيين selectedTest إذا كان هناك savedTestId (عند العودة من التعديل)
            if (!savedTestId) {
                setSelectedTest(null);
            }
            setQuestions([]);
        };
        loadTests();
    }, [selectedGrade, selectedSubject]);

    // حفظ الحالة في atoms عند التغيير
    useEffect(() => {
        questionReviewStage.set(selectedStage);
    }, [selectedStage]);
    
    useEffect(() => {
        questionReviewGrade.set(selectedGrade);
    }, [selectedGrade]);
    
    useEffect(() => {
        questionReviewSubject.set(selectedSubject);
    }, [selectedSubject]);
    
    useEffect(() => {
        if (selectedTest && selectedTest.id) {
            questionReviewTestId.set(selectedTest.id);
        }
    }, [selectedTest]);

    // تحميل الأسئلة عند اختيار الاختبار
    useEffect(() => {
        const loadQuestions = async () => {
            if (selectedTest && selectedTest.id) {
                setLoading(true);
                const testData = await getTestWithQuestions(selectedTest.id);
                if (testData) {
                    // معالجة options إذا كانت string (JSON)
                    const processedQuestions = testData.questions.map(q => {
                        if (q.options && typeof q.options === 'string') {
                            try {
                                q.options = JSON.parse(q.options);
                            } catch (e) {
                                console.error('Error parsing options:', e);
                            }
                        }
                        return q;
                    });
                    setQuestions(processedQuestions);
                }
                setLoading(false);
            } else {
                setQuestions([]);
            }
        };
        loadQuestions();
    }, [selectedTest]);
    
    // استعادة الاختبار المحدد عند العودة
    useEffect(() => {
        const restoreTest = async () => {
            if (savedTestId && selectedGrade && selectedSubject && !selectedTest && tests.length > 0) {
                const test = tests.find(t => t.id === savedTestId);
                if (test) {
                    setSelectedTest(test);
                }
            }
        };
        if (savedTestId && selectedGrade && selectedSubject && tests.length > 0) {
            restoreTest();
        }
    }, [savedTestId, selectedGrade, selectedSubject, tests, selectedTest]);

    const handleDeleteQuestion = async (questionId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            return;
        }

        setLoading(true);
        const result = await deleteQuestion(questionId);
        setLoading(false);

        if (result.success) {
            setQuestions(questions.filter(q => q.id !== questionId));
            setMessage({ type: 'success', text: 'تم حذف السؤال بنجاح' });
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف السؤال' });
        }
    };

    const handleEditQuestion = (question: TestQuestion) => {
        // حفظ الحالة قبل الانتقال
        if (selectedStage) questionReviewStage.set(selectedStage);
        if (selectedGrade) questionReviewGrade.set(selectedGrade);
        if (selectedSubject) questionReviewSubject.set(selectedSubject);
        if (selectedTest && selectedTest.id) {
            questionReviewTestId.set(selectedTest.id);
            currentTestId.set(selectedTest.id);
        }
        editingQuestionId.set(question.id);
        // Navigate to AddQuestionScreen with editing mode
        navigateTo('add-question');
    };

    const renderQuestionContent = (question: TestQuestion) => {
        if (question.question_image) {
            return (
                <div className="question-content-with-image">
                    <div 
                        className="question-text-content"
                        dangerouslySetInnerHTML={{ __html: question.question_text }}
                    />
                    <img 
                        src={question.question_image} 
                        alt="صورة السؤال" 
                        className="question-image-preview"
                    />
                </div>
            );
        }
        return (
            <div 
                className="question-text-content"
                dangerouslySetInnerHTML={{ __html: question.question_text }}
            />
        );
    };

    return (
        <Layout showFooter={false}>
            <div className="question-review-screen">
                <BackButton />
                <h1 className="review-title">مراجعة الأسئلة</h1>

                {/* Stage Selection */}
                {!selectedStage && (
                    <div className="selection-section">
                        <h2 className="section-title">اختر المرحلة</h2>
                        <div className="stage-buttons">
                            <button
                                className="stage-btn"
                                onClick={() => setSelectedStage('middle')}
                            >
                                المرحلة المتوسطة
                            </button>
                            <button
                                className="stage-btn"
                                onClick={() => setSelectedStage('high')}
                            >
                                المرحلة الثانوية
                            </button>
                        </div>
                    </div>
                )}

                {/* Grade Selection */}
                {selectedStage && !selectedGrade && (
                    <div className="selection-section">
                        <h2 className="section-title">اختر الصف</h2>
                        <div className="grade-buttons">
                            {grades.map((grade) => (
                                <button
                                    key={grade.id}
                                    className="grade-btn"
                                    onClick={() => setSelectedGrade(grade.id)}
                                >
                                    {grade.name}
                                </button>
                            ))}
                        </div>
                        <button
                            className="back-btn"
                            onClick={() => setSelectedStage(null)}
                        >
                            ← العودة
                        </button>
                    </div>
                )}

                {/* Subject Selection */}
                {selectedStage && selectedGrade && !selectedSubject && (
                    <div className="selection-section">
                        <h2 className="section-title">اختر المادة</h2>
                        <div className="subject-buttons">
                            {subjects.map((subject) => (
                                <button
                                    key={subject}
                                    className="subject-btn"
                                    onClick={() => setSelectedSubject(subject)}
                                >
                                    {subject}
                                </button>
                            ))}
                        </div>
                        <button
                            className="back-btn"
                            onClick={() => setSelectedGrade(null)}
                        >
                            ← العودة
                        </button>
                    </div>
                )}

                {/* Tests Selection */}
                {selectedStage && selectedGrade && selectedSubject && !selectedTest && (
                    <div className="selection-section">
                        <h2 className="section-title">اختر الاختبار</h2>
                        {loading ? (
                            <div className="loading-text">جاري التحميل...</div>
                        ) : tests.length === 0 ? (
                            <div className="empty-state">
                                <p>لا توجد اختبارات متاحة لهذه المادة</p>
                            </div>
                        ) : (
                            <div className="tests-list">
                                {tests.map((test) => (
                                    <div
                                        key={test.id}
                                        className="test-card"
                                        onClick={() => setSelectedTest(test)}
                                    >
                                        <h3 className="test-card-title">{test.test_title}</h3>
                                        {test.test_description && (
                                            <p className="test-card-description">{test.test_description}</p>
                                        )}
                                        <div className="test-card-meta">
                                            <span>{getGradeName(test.grade)}</span>
                                            <span>{test.subject_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            className="back-btn"
                            onClick={() => setSelectedSubject(null)}
                        >
                            ← العودة
                        </button>
                    </div>
                )}

                {/* Questions Display */}
                {selectedTest && (
                    <div className="questions-section">
                        <div className="questions-header">
                            <h2 className="section-title">
                                أسئلة اختبار: {selectedTest.test_title}
                            </h2>
                            <button
                                className="back-btn"
                                onClick={() => setSelectedTest(null)}
                            >
                                ← العودة
                            </button>
                        </div>

                        {message && (
                            <div className={`message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {loading ? (
                            <div className="loading-text">جاري التحميل...</div>
                        ) : questions.length === 0 ? (
                            <div className="empty-state">
                                <p>لا توجد أسئلة في هذا الاختبار</p>
                            </div>
                        ) : (
                            <div className="questions-list">
                                {questions.map((question, index) => (
                                    <div key={question.id} className="question-card">
                                        <div className="question-header">
                                            <span className="question-number">سؤال {index + 1}</span>
                                            <span className="question-type">{question.question_type}</span>
                                            <span className="question-points">{question.points} نقطة</span>
                                        </div>
                                        <div className="question-body">
                                            {renderQuestionContent(question)}
                                        </div>
                                        {(() => {
                                            // معالجة options - قد تكون object مع property options أو array مباشرة
                                            let optionsArray: string[] = [];
                                            let correctAnswerIndex: number | undefined = undefined;
                                            
                                            if (question.options) {
                                                if (Array.isArray(question.options)) {
                                                    // إذا كانت array مباشرة
                                                    optionsArray = question.options;
                                                } else if (typeof question.options === 'object' && question.options.options) {
                                                    // إذا كانت object مع property options
                                                    optionsArray = question.options.options || [];
                                                    correctAnswerIndex = question.options.correct_answer;
                                                }
                                            }
                                            
                                            return optionsArray.length > 0 ? (
                                                <div className="question-options">
                                                    <h4>الخيارات:</h4>
                                                    <ul>
                                                        {optionsArray.map((option, optIndex) => (
                                                            <li key={optIndex}>
                                                                {optIndex + 1}. {option}
                                                                {correctAnswerIndex === optIndex && (
                                                                    <span className="correct-answer-badge">✓ صحيح</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null;
                                        })()}
                                        {question.correct_answer && (
                                            <div className="question-correct-answer">
                                                <strong>الإجابة الصحيحة:</strong>{' '}
                                                {question.question_type === 'true_false' ? (
                                                    question.correct_answer === 'true' ? 'صحيح' : 
                                                    question.correct_answer === 'false' ? 'خطأ' : 
                                                    question.correct_answer
                                                ) : question.question_type === 'multiple_choice' && question.options?.options ? (
                                                    (() => {
                                                        const correctIndex = parseInt(question.correct_answer);
                                                        if (!isNaN(correctIndex) && question.options.options[correctIndex]) {
                                                            return `${correctIndex + 1}. ${question.options.options[correctIndex]}`;
                                                        }
                                                        return question.correct_answer;
                                                    })()
                                                ) : (
                                                    question.correct_answer
                                                )}
                                            </div>
                                        )}
                                        <div className="question-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditQuestion(question)}
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteQuestion(question.id)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

