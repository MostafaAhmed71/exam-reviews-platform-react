import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { MaterialsSortBucket } from '@/components/MaterialsSortBucket';
import { getAllMaterials, updateMaterial, deleteMaterial } from '@/services/uploadService';
import { getSubjectsByStageAndGrade } from '@/services/subjectService';
import { getGradeName } from '@/utils/gradeUtils';
import { getVideoViewCounts } from '@/services/statisticsService';
import { sortUploadedMaterials } from '@/utils/materialOrder';
import type { UploadedMaterial } from '@/types/database.types';
import './MaterialsManagement.css';

type ManageTab = 'solved' | 'unsolved';

function normalizeUploadedRow(m: UploadedMaterial): UploadedMaterial {
    const raw = m.display_order as unknown;
    let display_order: number | undefined;
    if (raw === null || raw === undefined || raw === '') {
        display_order = undefined;
    } else {
        const n = typeof raw === 'number' ? raw : Number(raw);
        display_order = Number.isFinite(n) ? Math.floor(n) : undefined;
    }
    const grade =
        typeof m.grade === 'string' ? parseInt(String(m.grade), 10) : m.grade;
    return { ...m, display_order, grade: Number.isFinite(grade) ? grade : m.grade };
}

function isSolvedBucketMaterial(m: UploadedMaterial): boolean {
    return m.review_type === 'solved' || m.content_type === 'solved';
}

function bucketTitle(stage: UploadedMaterial['stage'], grade: number): string {
    const stageLabel = stage === 'middle' ? 'متوسط' : 'ثانوي';
    return `${getGradeName(grade)} — ${stageLabel}`;
}

function groupMaterialsForTabs(
    list: UploadedMaterial[],
    tab: ManageTab,
): { bucketId: string; title: string; items: UploadedMaterial[] }[] {
    const filtered = list.filter((m) =>
        tab === 'solved' ? isSolvedBucketMaterial(m) : !isSolvedBucketMaterial(m),
    );
    const map = new Map<string, UploadedMaterial[]>();
    for (const m of filtered) {
        const key = `${m.stage}-${m.grade}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
    }
    const entries = [...map.entries()].sort(([ka], [kb]) => {
        const [sa, ga] = ka.split('-');
        const [sb, gb] = kb.split('-');
        if (sa !== sb) return sa === 'middle' ? -1 : 1;
        return Number(ga) - Number(gb);
    });
    return entries.map(([key, items]) => {
        const [, g] = key.split('-');
        const gradeNum = Number(g);
        const first = items[0];
        return {
            bucketId: `${tab}-${key}`,
            title: bucketTitle(first.stage, gradeNum),
            items: sortUploadedMaterials(items),
        };
    });
}

export function MaterialsManagement() {
    const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingMaterial, setEditingMaterial] = useState<UploadedMaterial | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [displayOrderDraft, setDisplayOrderDraft] = useState('0');
    const [manageTab, setManageTab] = useState<ManageTab>('solved');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null,
    );
    const [videoViewCounts, setVideoViewCounts] = useState<Map<number, number>>(new Map());

    const [subjects, setSubjects] = useState<string[]>([]);

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

    const loadMaterials = useCallback(async () => {
        setLoading(true);
        const data = await getAllMaterials();
        const normalized = data.map(normalizeUploadedRow);
        setMaterials(normalized);

        const videoIds = normalized
            .filter((m) => m.content_type === 'videos' && m.id)
            .map((m) => m.id!);

        if (videoIds.length > 0) {
            const viewCounts = await getVideoViewCounts(videoIds);
            setVideoViewCounts(viewCounts);
        } else {
            setVideoViewCounts(new Map());
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    useEffect(() => {
        const loadSubjectsForMaterial = async () => {
            if (editingMaterial) {
                const loadedSubjects = await getSubjectsByStageAndGrade(
                    editingMaterial.stage,
                    editingMaterial.grade,
                );
                setSubjects(loadedSubjects);
            }
        };
        loadSubjectsForMaterial();
    }, [editingMaterial]);

    useEffect(() => {
        if (!showEditModal || !editingMaterial) return;
        const o = editingMaterial.display_order;
        const n = o != null && Number(o) > 0 ? Math.floor(Number(o)) : 0;
        setDisplayOrderDraft(String(n));
    }, [showEditModal, editingMaterial?.id, editingMaterial?.display_order]);

    const buckets = useMemo(
        () => groupMaterialsForTabs(materials, manageTab),
        [materials, manageTab],
    );

    const persistReorder = useCallback(
        async (_bucketId: string, nextOrdered: UploadedMaterial[]) => {
            const withOrder = nextOrdered.map((m, i) => ({
                ...m,
                display_order: i + 1,
            }));
            setMaterials((prev) => {
                const byId = new Map(withOrder.map((m) => [m.id, m]));
                return prev.map((row) => {
                    const u = row.id != null ? byId.get(row.id) : undefined;
                    return u ?? row;
                });
            });

            const results = await Promise.all(
                withOrder.map((m) =>
                    m.id != null
                        ? updateMaterial(m.id, { display_order: m.display_order })
                        : Promise.resolve({ success: true as const }),
                ),
            );

            if (results.some((r) => !r.success)) {
                setMessage({ type: 'error', text: 'تعذّر حفظ ترتيب العرض بعد السحب' });
                await loadMaterials();
                return;
            }
            setMessage({ type: 'success', text: 'تم حفظ ترتيب العرض لهذا القسم' });
        },
        [loadMaterials],
    );

    const handleEdit = (material: UploadedMaterial) => {
        setEditingMaterial({ ...material });
        setShowEditModal(true);
        setMessage(null);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            return;
        }

        setMessage(null);
        const result = await deleteMaterial(id);
        if (result.success) {
            setMessage({ type: 'success', text: 'تم حذف المادة بنجاح' });
            setTimeout(() => {
                loadMaterials();
            }, 500);
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حذف المادة' });
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMaterial || !editingMaterial.id) return;

        const trimmed = displayOrderDraft.trim();
        let display_order = 0;
        if (trimmed !== '') {
            const parsed = parseInt(trimmed, 10);
            if (!Number.isFinite(parsed) || parsed < 0) {
                setMessage({ type: 'error', text: 'رقم ترتيب العرض غير صالح (استخدم 0 أو أعدادًا صحيحة)' });
                return;
            }
            display_order = Math.floor(parsed);
        }

        const result = await updateMaterial(editingMaterial.id, {
            stage: editingMaterial.stage,
            grade: editingMaterial.grade,
            subject_name: editingMaterial.subject_name,
            review_type: editingMaterial.review_type,
            display_order,
        });

        if (result.success) {
            setMessage({ type: 'success', text: 'تم تحديث المادة بنجاح' });
            setShowEditModal(false);
            setEditingMaterial(null);
            loadMaterials();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل تحديث المادة' });
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

    const getGradeLabel = (grade: number) => getGradeName(grade);

    if (loading) {
        return (
            <Layout showFooter>
                <div className="materials-management">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="materials-title">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="materials-management">
                <BackButton />
                <h1 className="materials-title">إدارة المواد المرفوعة</h1>
                <p className="materials-subtitle">
                    مراجعات محلولة وغير محلولة؛ اسحب ⠿ داخل كل صف لتغيير ترتيب العرض
                </p>

                {message && (
                    <div className={`materials-message ${message.type}`}>{message.text}</div>
                )}

                {materials.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">لا توجد مواد مرفوعة</p>
                    </div>
                ) : (
                    <>
                        <div className="mm-tabs" role="tablist" aria-label="نوع المراجعة">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={manageTab === 'solved'}
                                className={`mm-tab ${manageTab === 'solved' ? 'mm-tab-active' : ''}`}
                                onClick={() => setManageTab('solved')}
                            >
                                مراجعات محلولة
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={manageTab === 'unsolved'}
                                className={`mm-tab ${manageTab === 'unsolved' ? 'mm-tab-active' : ''}`}
                                onClick={() => setManageTab('unsolved')}
                            >
                                غير محلولة وجداول وفيديو وغيرها
                            </button>
                        </div>

                        <div className="mm-buckets">
                            {buckets.length === 0 ? (
                                <div className="empty-state">
                                    <p className="empty-text">لا مواد في هذا التبويب</p>
                                </div>
                            ) : (
                                buckets.map((b) => (
                                    <MaterialsSortBucket
                                        key={b.bucketId}
                                        bucketId={b.bucketId}
                                        title={b.title}
                                        hint="الترتيب هنا يخص المواد المعروضة في هذا الصف فقط."
                                        items={b.items}
                                        onPersistReorder={persistReorder}
                                        videoViewCounts={videoViewCounts}
                                        onView={(m) => window.open(m.file_url, '_blank')}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        formatFileSize={formatFileSize}
                                        formatDate={formatDate}
                                        getGradeLabel={getGradeLabel}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {showEditModal && editingMaterial && (
                    <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
                        <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                            <h2 className="edit-modal-title">تعديل المادة</h2>

                            <div className="edit-form">
                                <div className="form-group">
                                    <label className="form-label">المرحلة</label>
                                    <select
                                        className="form-select"
                                        value={editingMaterial.stage}
                                        onChange={(e) => {
                                            const newStage = e.target.value as 'middle' | 'high';
                                            setEditingMaterial({
                                                ...editingMaterial,
                                                stage: newStage,
                                                grade: newStage === 'middle' ? 7 : 10,
                                            });
                                        }}
                                    >
                                        <option value="middle">المرحلة المتوسطة</option>
                                        <option value="high">المرحلة الثانوية</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">الصف</label>
                                    <select
                                        className="form-select"
                                        value={editingMaterial.grade}
                                        onChange={(e) =>
                                            setEditingMaterial({
                                                ...editingMaterial,
                                                grade: parseInt(e.target.value, 10),
                                            })
                                        }
                                    >
                                        {(editingMaterial.stage === 'middle' ? middleGrades : highGrades).map(
                                            (grade) => (
                                                <option key={grade.id} value={grade.id}>
                                                    {grade.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">المادة</label>
                                    <select
                                        className="form-select"
                                        value={editingMaterial.subject_name}
                                        onChange={(e) =>
                                            setEditingMaterial({
                                                ...editingMaterial,
                                                subject_name: e.target.value,
                                            })
                                        }
                                    >
                                        {subjects.map((subject) => (
                                            <option key={subject} value={subject}>
                                                {subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">نوع المراجعة</label>
                                    <select
                                        className="form-select"
                                        value={editingMaterial.review_type ?? 'unsolved'}
                                        onChange={(e) =>
                                            setEditingMaterial({
                                                ...editingMaterial,
                                                review_type: e.target.value as 'solved' | 'unsolved',
                                            })
                                        }
                                    >
                                        <option value="solved">محلولة</option>
                                        <option value="unsolved">غير محلولة</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">رقم ترتيب العرض</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        dir="ltr"
                                        value={displayOrderDraft}
                                        onChange={(e) => setDisplayOrderDraft(e.target.value)}
                                    />
                                    <p className="form-hint">
                                        1 أولاً، 2 ثانية… اكتب <strong>0</strong> لترتيب تلقائي. عند الإدخال
                                        يمكنك كتابة الأرقام بحرية؛ يُحدَّث في قاعدة البيانات عند الضغط على حفظ.
                                        إذا فشل الحفظ، نفّذ ترحيل SQL لإضافة عمود{' '}
                                        <code>display_order</code> (ملف{' '}
                                        <code>database/migrate_uploaded_materials_display_order.sql</code>).
                                    </p>
                                </div>
                            </div>

                            <div className="edit-modal-actions">
                                <Button variant="primary" onClick={handleSaveEdit} fullWidth>
                                    حفظ التغييرات
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingMaterial(null);
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
