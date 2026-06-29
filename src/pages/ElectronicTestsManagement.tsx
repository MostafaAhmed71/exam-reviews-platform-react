import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { navigateTo } from '../lib/navigation';
import { getElectronicTestsByGrade, deleteElectronicTest, generateShareLink } from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import type { ElectronicTest } from '../types/database.types';
import './ElectronicTestsManagement.css';

export function ElectronicTestsManagement() {
    const [selectedStage, setSelectedStage] = useState<'middle' | 'high' | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [electronicTests, setElectronicTests] = useState<ElectronicTest[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    useEffect(() => {
        loadElectronicTests();
    }, [selectedStage, selectedGrade]);

    const loadElectronicTests = async () => {
        if (!selectedGrade) {
            setElectronicTests([]);
            return;
        }

        setLoading(true);
        const tests = await getElectronicTestsByGrade(selectedGrade);
        setElectronicTests(tests);
        setLoading(false);
    };

    const handleDelete = async (testId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع الأسئلة المرتبطة به.')) {
            return;
        }

        const result = await deleteElectronicTest(testId);
        if (result.success) {
            setMessage({ type: 'success', text: 'تم حذف الاختبار بنجاح' });
            loadElectronicTests();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف الاختبار' });
        }
    };

    const handleShare = (test: ElectronicTest) => {
        const shareLink = generateShareLink(test.share_token);
        navigator.clipboard.writeText(shareLink);
        setMessage({ type: 'success', text: 'تم نسخ رابط الاختبار إلى الحافظة' });
    };

    const handleEdit = () => {
        // Navigate to test builder with test ID
        navigateTo('test-builder');
        // You might want to pass the test ID via navigation state or URL
        // For now, we'll just navigate and let the user select the test
    };

    return (
        <Layout showFooter={false}>
            <div className="electronic-tests-management">
                <div className="admin-header">
                    <div className="admin-title-container">
                        <h1 className="admin-title">إدارة الاختبارات الإلكترونية</h1>
                        <p className="admin-subtitle">عرض وإدارة الاختبارات الإلكترونية</p>
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

                <div className="upload-form">
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
                </div>

                {selectedGrade && (
                    <div className="tests-list-section">
                        <h2 className="section-title">الاختبارات الإلكترونية - الصف {selectedGrade}</h2>
                        
                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>جاري التحميل...</p>
                            </div>
                        ) : electronicTests.length === 0 ? (
                            <div className="empty-state">
                                <p className="empty-text">لا توجد اختبارات إلكترونية لهذا الصف</p>
                            </div>
                        ) : (
                            <div className="tests-list">
                                {electronicTests.map((test) => (
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
                                                    تاريخ الإنشاء: {new Date(test.created_at).toLocaleDateString('ar-SA')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="test-actions">
                                            <Button
                                                variant="primary"
                                                onClick={() => handleShare(test)}
                                                className="test-share-btn"
                                            >
                                                نسخ رابط المشاركة
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={handleEdit}
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
                )}
            </div>
        </Layout>
    );
}
