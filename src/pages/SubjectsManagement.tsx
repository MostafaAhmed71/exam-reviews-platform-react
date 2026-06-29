import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import {
    getSubjectsWithGrades,
    createSubject,
    updateSubject,
    deleteSubject,
} from '@/services/subjectService';
import type { SubjectWithGrades } from '@/types/database.types';
import './SubjectsManagement.css';

export function SubjectsManagement() {
    const [selectedStage, setSelectedStage] = useState<'middle' | 'high'>('middle');
    const [subjects, setSubjects] = useState<SubjectWithGrades[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSubject, setEditingSubject] = useState<SubjectWithGrades | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null
    );

    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectGrades, setNewSubjectGrades] = useState<number[]>([]);

    const middleGrades = [
        { id: 7, name: 'الصف الأول متوسط' },
        { id: 8, name: 'الصف الثاني متوسط' },
        { id: 9, name: 'الصف الثالث متوسط' },
    ];

    const highGrades = [
        { id: 10, name: 'الصف الأول ثانوي' },
        { id: 11, name: 'الصف الثاني ثانوي' },
        { id: 12, name: 'الصف الثالث ثانوي' },
    ];

    const currentGrades = selectedStage === 'middle' ? middleGrades : highGrades;

    useEffect(() => {
        loadSubjects();
    }, [selectedStage]);

    const loadSubjects = async () => {
        setLoading(true);
        const data = await getSubjectsWithGrades(selectedStage);
        setSubjects(data);
        setLoading(false);
    };

    const handleAddSubject = () => {
        setNewSubjectName('');
        setNewSubjectGrades([]);
        setShowAddModal(true);
        setMessage(null);
    };

    const handleEditSubject = (subject: SubjectWithGrades) => {
        setEditingSubject({ ...subject });
        setNewSubjectName(subject.name_ar);
        setNewSubjectGrades([...subject.grades]);
        setShowEditModal(true);
        setMessage(null);
    };

    const handleDeleteSubject = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            return;
        }

        setMessage(null);
        const result = await deleteSubject(id);
        if (result.success) {
            setMessage({ type: 'success', text: 'تم حذف المادة بنجاح' });
            loadSubjects();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف المادة' });
        }
    };

    const handleSaveAdd = async () => {
        if (!newSubjectName.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إدخال اسم المادة' });
            return;
        }

        if (newSubjectGrades.length === 0) {
            setMessage({ type: 'error', text: 'الرجاء اختيار صف واحد على الأقل' });
            return;
        }

        setMessage(null);
        const result = await createSubject(newSubjectName.trim(), selectedStage, newSubjectGrades);
        if (result.success) {
            setMessage({ type: 'success', text: 'تم إضافة المادة بنجاح' });
            setShowAddModal(false);
            setNewSubjectName('');
            setNewSubjectGrades([]);
            loadSubjects();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل إضافة المادة' });
        }
    };

    const handleSaveEdit = async () => {
        if (!editingSubject || !editingSubject.id) return;

        if (!newSubjectName.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إدخال اسم المادة' });
            return;
        }

        if (newSubjectGrades.length === 0) {
            setMessage({ type: 'error', text: 'الرجاء اختيار صف واحد على الأقل' });
            return;
        }

        setMessage(null);
        const result = await updateSubject(editingSubject.id, newSubjectName.trim(), newSubjectGrades);
        if (result.success) {
            setMessage({ type: 'success', text: 'تم تحديث المادة بنجاح' });
            setShowEditModal(false);
            setEditingSubject(null);
            setNewSubjectName('');
            setNewSubjectGrades([]);
            loadSubjects();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل تحديث المادة' });
        }
    };

    const toggleGrade = (gradeId: number) => {
        if (newSubjectGrades.includes(gradeId)) {
            setNewSubjectGrades(newSubjectGrades.filter((id) => id !== gradeId));
        } else {
            setNewSubjectGrades([...newSubjectGrades, gradeId]);
        }
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="subjects-management">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="subjects-title">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="subjects-management">
                <BackButton />
                <h1 className="subjects-title">إدارة المواد الدراسية</h1>
                <p className="subjects-subtitle">إضافة وتعديل وحذف المواد حسب المرحلة والصف</p>

                {/* Stage Selection */}
                <div className="stage-selection">
                    <button
                        className={`stage-btn ${selectedStage === 'middle' ? 'active' : ''}`}
                        onClick={() => setSelectedStage('middle')}
                    >
                        المرحلة المتوسطة
                    </button>
                    <button
                        className={`stage-btn ${selectedStage === 'high' ? 'active' : ''}`}
                        onClick={() => setSelectedStage('high')}
                    >
                        المرحلة الثانوية
                    </button>
                </div>

                {message && (
                    <div className={`subjects-message ${message.type}`}>{message.text}</div>
                )}

                <div className="subjects-header">
                    <Button variant="primary" onClick={handleAddSubject} className="add-subject-btn">
                        + إضافة مادة جديدة
                    </Button>
                </div>

                {subjects.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">لا توجد مواد مضافة لهذه المرحلة</p>
                    </div>
                ) : (
                    <div className="subjects-list">
                        {subjects.map((subject) => (
                            <div key={subject.id} className="subject-item">
                                <div className="subject-info">
                                    <h3 className="subject-name">{subject.name_ar}</h3>
                                    <div className="subject-grades">
                                        <span className="grades-label">الصفوف:</span>
                                        {subject.grades.map((grade) => {
                                            const gradeName =
                                                selectedStage === 'middle'
                                                    ? middleGrades.find((g) => g.id === grade)?.name
                                                    : highGrades.find((g) => g.id === grade)?.name;
                                            return (
                                                <span key={grade} className="grade-badge">
                                                    {gradeName || `الصف ${grade}`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="subject-actions">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleEditSubject(subject)}
                                        className="subject-edit-btn"
                                    >
                                        تعديل
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => subject.id && handleDeleteSubject(subject.id)}
                                        className="subject-delete-btn"
                                    >
                                        حذف
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div
                        className="subject-modal-overlay"
                        onClick={() => setShowAddModal(false)}
                    >
                        <div className="subject-modal" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">إضافة مادة جديدة</h2>

                            <div className="modal-form">
                                <div className="form-group">
                                    <label className="form-label">اسم المادة</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newSubjectName}
                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                        placeholder="مثال: الرياضيات"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">اختر الصفوف</label>
                                    <div className="grades-checkboxes">
                                        {currentGrades.map((grade) => (
                                            <label key={grade.id} className="grade-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={newSubjectGrades.includes(grade.id)}
                                                    onChange={() => toggleGrade(grade.id)}
                                                />
                                                <span>{grade.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <Button variant="primary" onClick={handleSaveAdd} fullWidth>
                                    حفظ
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewSubjectName('');
                                        setNewSubjectGrades([]);
                                    }}
                                    fullWidth
                                >
                                    إلغاء
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingSubject && (
                    <div
                        className="subject-modal-overlay"
                        onClick={() => setShowEditModal(false)}
                    >
                        <div className="subject-modal" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">تعديل المادة</h2>

                            <div className="modal-form">
                                <div className="form-group">
                                    <label className="form-label">اسم المادة</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newSubjectName}
                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                        placeholder="مثال: الرياضيات"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">اختر الصفوف</label>
                                    <div className="grades-checkboxes">
                                        {currentGrades.map((grade) => (
                                            <label key={grade.id} className="grade-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={newSubjectGrades.includes(grade.id)}
                                                    onChange={() => toggleGrade(grade.id)}
                                                />
                                                <span>{grade.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <Button variant="primary" onClick={handleSaveEdit} fullWidth>
                                    حفظ التغييرات
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingSubject(null);
                                        setNewSubjectName('');
                                        setNewSubjectGrades([]);
                                    }}
                                    fullWidth
                                >
                                    إلغاء
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

