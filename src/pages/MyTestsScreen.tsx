import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { navigateTo } from '../lib/navigation';
import { getAllElectronicTests, deleteElectronicTest, generateShareLink, getTestWithQuestions } from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import type { ElectronicTest } from '../types/database.types';
import './MyTestsScreen.css';

export function MyTestsScreen() {
    const [tests, setTests] = useState<ElectronicTest[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedTest, setSelectedTest] = useState<ElectronicTest | null>(null);
    const [questionCount, setQuestionCount] = useState<number>(0);

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = async () => {
        setLoading(true);
        const allTests = await getAllElectronicTests();
        setTests(allTests);
        setLoading(false);
    };

    const handleDelete = async (testId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع الأسئلة المرتبطة به.')) {
            return;
        }

        setLoading(true);
        const result = await deleteElectronicTest(testId);
        setLoading(false);

        if (result.success) {
            setMessage({ type: 'success', text: 'تم حذف الاختبار بنجاح' });
            loadTests();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف الاختبار' });
        }
    };

    const handleShare = (test: ElectronicTest) => {
        const shareLink = generateShareLink(test.share_token);
        navigator.clipboard.writeText(shareLink);
        setMessage({ type: 'success', text: 'تم نسخ رابط الاختبار إلى الحافظة' });
    };

    const handleEdit = async (test: ElectronicTest) => {
        if (!test.id) return;
        
        // Load test with questions to edit
        const testData = await getTestWithQuestions(test.id);
        if (testData) {
            // Navigate to test builder - you might want to pass the test ID via navigation state
            navigateTo('test-builder');
        }
    };

    const handleViewDetails = async (test: ElectronicTest) => {
        if (!test.id) return;
        
        setLoading(true);
        const testData = await getTestWithQuestions(test.id);
        setLoading(false);
        
        if (testData) {
            setSelectedTest(test);
            setQuestionCount(testData.questions.length);
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filterTests = (stage?: 'middle' | 'high', grade?: number) => {
        if (!stage && !grade) return tests;
        return tests.filter(test => {
            if (stage && test.stage !== stage) return false;
            if (grade && test.grade !== grade) return false;
            return true;
        });
    };

    const [filterStage, setFilterStage] = useState<'middle' | 'high' | null>(null);
    const [filterGrade, setFilterGrade] = useState<number | null>(null);
    const filteredTests = filterTests(filterStage || undefined, filterGrade || undefined);

    return (
        <Layout showFooter={false}>
            <div className="my-tests-screen">
                <div className="admin-header">
                    <div className="admin-title-container">
                        <h1 className="admin-title">الاختبارات المرفوعة</h1>
                        <p className="admin-subtitle">عرض وإدارة جميع الاختبارات التي قمت برفعها</p>
                    </div>
                    <div className="admin-header-actions">
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('test-builder')}
                            className="admin-create-test-button"
                        >
                            إنشاء اختبار جديد
                        </Button>
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

                {/* Filters */}
                <div className="filters-section">
                    <div className="form-section">
                        <label className="form-label">تصفية حسب المرحلة</label>
                        <div className="review-type-grid">
                            <button
                                className={`review-type-btn ${filterStage === null ? 'selected' : ''}`}
                                onClick={() => setFilterStage(null)}
                            >
                                الكل
                            </button>
                            <button
                                className={`review-type-btn ${filterStage === 'middle' ? 'selected' : ''}`}
                                onClick={() => {
                                    setFilterStage('middle');
                                    setFilterGrade(null);
                                }}
                            >
                                المرحلة المتوسطة
                            </button>
                            <button
                                className={`review-type-btn ${filterStage === 'high' ? 'selected' : ''}`}
                                onClick={() => {
                                    setFilterStage('high');
                                    setFilterGrade(null);
                                }}
                            >
                                المرحلة الثانوية
                            </button>
                        </div>
                    </div>

                    {filterStage && (
                        <div className="form-section">
                            <label className="form-label">تصفية حسب الصف</label>
                            <div className="grade-grid">
                                <button
                                    className={`grade-btn ${filterGrade === null ? 'selected' : ''}`}
                                    onClick={() => setFilterGrade(null)}
                                >
                                    الكل
                                </button>
                                {filterStage === 'middle' ? (
                                    <>
                                        <button
                                            className={`grade-btn ${filterGrade === 7 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(7)}
                                        >
                                            الصف الأول متوسط
                                        </button>
                                        <button
                                            className={`grade-btn ${filterGrade === 8 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(8)}
                                        >
                                            الصف الثاني متوسط
                                        </button>
                                        <button
                                            className={`grade-btn ${filterGrade === 9 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(9)}
                                        >
                                            الصف الثالث متوسط
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className={`grade-btn ${filterGrade === 10 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(10)}
                                        >
                                            الصف الأول ثانوي
                                        </button>
                                        <button
                                            className={`grade-btn ${filterGrade === 11 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(11)}
                                        >
                                            الصف الثاني ثانوي
                                        </button>
                                        <button
                                            className={`grade-btn ${filterGrade === 12 ? 'selected' : ''}`}
                                            onClick={() => setFilterGrade(12)}
                                        >
                                            الصف الثالث ثانوي
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tests List */}
                <div className="tests-list-section">
                    <h2 className="section-title">
                        جميع الاختبارات ({filteredTests.length})
                    </h2>
                    
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>جاري التحميل...</p>
                        </div>
                    ) : filteredTests.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-text">لا توجد اختبارات {filterStage || filterGrade ? 'مطابقة للفلتر' : ''}</p>
                        </div>
                    ) : (
                        <div className="tests-list">
                            {filteredTests.map((test) => (
                                <div key={test.id} className="test-item">
                                    <div className="test-info">
                                        <h3 className="test-subject">{test.subject_name}</h3>
                                        <h4 className="test-title">{test.test_title}</h4>
                                        {test.test_description && (
                                            <p className="test-description">{test.test_description}</p>
                                        )}
                                        <p className="test-meta">
                                            {test.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'} • 
                                            {getGradeName(test.grade)}
                                        </p>
                                        {test.created_at && (
                                            <p className="test-date">
                                                تاريخ الإنشاء: {formatDate(test.created_at)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="test-actions">
                                        <Button
                                            variant="primary"
                                            onClick={() => test.id && handleViewDetails(test)}
                                            className="test-view-btn"
                                        >
                                            عرض التفاصيل
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={() => handleShare(test)}
                                            className="test-share-btn"
                                        >
                                            نسخ رابط المشاركة
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => test.id && handleEdit(test)}
                                            className="test-edit-btn"
                                        >
                                            تعديل
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => test.id && handleDelete(test.id)}
                                            className="test-delete-btn"
                                        >
                                            حذف
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Test Details Modal */}
                {selectedTest && (
                    <div className="test-details-modal-overlay" onClick={() => setSelectedTest(null)}>
                        <div className="test-details-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>تفاصيل الاختبار</h2>
                                <button className="modal-close" onClick={() => setSelectedTest(null)}>×</button>
                            </div>
                            <div className="modal-content">
                                <div className="test-details-info">
                                    <p><strong>المادة:</strong> {selectedTest.subject_name}</p>
                                    <p><strong>العنوان:</strong> {selectedTest.test_title}</p>
                                    {selectedTest.test_description && (
                                        <p><strong>الوصف:</strong> {selectedTest.test_description}</p>
                                    )}
                                    <p><strong>المرحلة:</strong> {selectedTest.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}</p>
                                    <p><strong>الصف:</strong> {getGradeName(selectedTest.grade)}</p>
                                    <p><strong>عدد الأسئلة:</strong> {questionCount}</p>
                                    {selectedTest.created_at && (
                                        <p><strong>تاريخ الإنشاء:</strong> {formatDate(selectedTest.created_at)}</p>
                                    )}
                                    <div className="share-link-section">
                                        <p><strong>رابط المشاركة:</strong></p>
                                        <div className="share-link-container">
                                            <input
                                                type="text"
                                                readOnly
                                                value={generateShareLink(selectedTest.share_token)}
                                                className="share-link-input"
                                            />
                                            <Button
                                                variant="primary"
                                                onClick={() => handleShare(selectedTest)}
                                                className="copy-link-btn"
                                            >
                                                نسخ
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        if (selectedTest.id) {
                                            handleEdit(selectedTest);
                                        }
                                    }}
                                >
                                    تعديل الاختبار
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setSelectedTest(null)}
                                >
                                    إغلاق
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
