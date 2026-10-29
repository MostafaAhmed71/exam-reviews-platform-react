import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { navigateTo } from '@/lib/navigation';
import { addStudent, getStudents, deleteStudent, addStudentsBulk, deleteAllStudents } from '@/services/studentService';
import type { Student } from '@/types/database.types';
import ExcelJS from 'exceljs';
import './StudentManagement.css';

export function StudentManagement() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        national_id: '',
        grade: '',
        seat_number: '',
        committee_number: '',
        headquarters: ''
    });

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        setLoading(true);
        const result = await getStudents();
        if (result.success && result.data) {
            setStudents(result.data);
        } else {
            // Handle error if needed, but keeping it silent for now or just log
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        setMessage(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                setMessage({ type: 'error', text: 'الملف لا يحتوي على صفحات' });
                setUploadingFile(false);
                return;
            }

            // Convert Excel rows to JSON
            const data: any[] = [];
            const headers: string[] = [];
            
            // Get headers from first row
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
                headers[colNumber - 1] = cell.value?.toString() || '';
            });

            // Process data rows
            worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
                if (rowNumber === 1) return; // Skip header row
                
                const rowData: any = {};
                row.eachCell({ includeEmpty: false }, (cell: ExcelJS.Cell, colNumber: number) => {
                    const header = headers[colNumber - 1];
                    if (header) {
                        rowData[header] = cell.value;
                    }
                });
                
                // Only add row if it has at least one non-empty value
                if (Object.keys(rowData).length > 0) {
                    data.push(rowData);
                }
            });

                if (!data || data.length === 0) {
                    setMessage({ type: 'error', text: 'الملف فارغ أو لا يحتوي على بيانات' });
                    setUploadingFile(false);
                    return;
                }

                // Map Excel columns to Student interface
                // Extremely robust mapping with Arabic normalization and priority
                const mappedData: Omit<Student, 'id' | 'created_at'>[] = data.map((row: any, index) => {
                    const normalize = (text: string) => {
                        if (!text) return '';
                        return String(text)
                            .replace(/[أإآا]/g, 'ا')
                            .replace(/[ةه]/g, 'ه')
                            .replace(/[ىي]/g, 'ي')
                            .replace(/[\s_\-\.]/g, '')
                            .trim()
                            .toLowerCase();
                    };

                    const normalizedRow: any = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[normalize(key)] = row[key];
                    });

                    const getValue = (searchTerms: string[], excludeSubstring: string = '') => {
                        const normalizedTerms = searchTerms.map(normalize);
                        const normalizedExclude = normalize(excludeSubstring);

                        // 1. Try exact normalized match first
                        for (const term of normalizedTerms) {
                            if (normalizedRow[term] !== undefined && normalizedRow[term] !== null) {
                                return String(normalizedRow[term]).trim();
                            }
                        }

                        // 2. Try partial normalized match, but avoid specified exclusions
                        for (const term of normalizedTerms) {
                            if (term.length < 2) continue;
                            for (const rowKey of Object.keys(normalizedRow)) {
                                if (rowKey.includes(term)) {
                                    // If we have an exclusion (like "مقر" for "لجنة"), check for it
                                    if (normalizedExclude && rowKey.includes(normalizedExclude)) continue;

                                    if (normalizedRow[rowKey] !== undefined && normalizedRow[rowKey] !== null) {
                                        return String(normalizedRow[rowKey]).trim();
                                    }
                                }
                            }
                        }
                        return '';
                    };

                    const mapped = {
                        name: getValue(['الاسم', 'اسم الطالب', 'name', 'الطالب']),
                        national_id: getValue(['رقم الهوية', 'الهوية', 'السجل', 'national_id', 'id']),
                        grade: getValue(['الصف', 'المرحلة', 'المستوى', 'grade', 'السنة']),
                        seat_number: getValue(['رقم الجلوس', 'رقم جلوس', 'جلوس', 'seat_number']),
                        // For committee, we search for 'لجنة' but exclude 'مقر' to avoid picking up 'مقر اللجنة'
                        committee_number: getValue(['رقم اللجنة', 'اللجنة', 'اللجنه', 'لجنة', 'committee'], 'مقر'),
                        headquarters: getValue(['مقر اللجنة', 'المقر', 'المكان', 'القاعة', 'مقر', 'headquarters'])
                    };

                    if (index === 0) {
                        console.log('DEBUG Row:', row);
                        console.log('DEBUG Mapped:', mapped);
                    }
                    return mapped;
                }).filter(s => s.name && (s.seat_number || s.national_id));

                if (mappedData.length === 0) {
                    setMessage({ type: 'error', text: 'لم يتم العثور على بيانات صالحة. تأكد من عناوين الأعمدة: الاسم، رقم الهوية، الصف، رقم الجلوس، رقم اللجنة، المقر' });
                    setUploadingFile(false);
                    return;
                }

                const result = await addStudentsBulk(mappedData);

                if (result.success) {
                    setMessage({ type: 'success', text: `تم رفع ${result.count} طالب بنجاح. تأكد من مراجعة البيانات في الجدول.` });
                    loadStudents();
                } else {
                    setMessage({ type: 'error', text: result.error || 'فشل رفع الملف' });
                }
            } catch (err) {
                console.error('Excel parse error:', err);
                setMessage({ type: 'error', text: 'حدث خطأ أثناء قراءة الملف' });
            }
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        // Basic validation
        if (!formData.name || !formData.national_id || !formData.seat_number) {
            setMessage({ type: 'error', text: 'الرجاء تعبئة الحقول الأساسية' });
            setSubmitting(false);
            return;
        }

        const result = await addStudent(formData);

        if (result.success) {
            setMessage({ type: 'success', text: 'تم إضافة الطالب بنجاح' });
            setFormData({
                name: '',
                national_id: '',
                grade: '',
                seat_number: '',
                committee_number: '',
                headquarters: ''
            });
            loadStudents();
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل إضافة الطالب' });
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

        const result = await deleteStudent(id);
        if (result.success) {
            setStudents(students.filter(s => s.id !== id));
            setMessage({ type: 'success', text: 'تم حذف الطالب بنجاح' });
        } else {
            setMessage({ type: 'error', text: 'فشل حذف الطالب' });
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع الطلاب؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        setLoading(true);
        const result = await deleteAllStudents();
        if (result.success) {
            setStudents([]);
            setMessage({ type: 'success', text: 'تم مسح جميع بيانات الطلاب بنجاح' });
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل مسح البيانات' });
        }
        setLoading(false);
    };

    return (
        <Layout showFooter={false}>
            <div className="student-management">
                <div className="student-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>إدارة الطلاب وأرقام الجلوس</h1>
                    <Button variant="secondary" onClick={() => navigateTo('admin')}>
                        العودة للوحة التحكم
                    </Button>
                </div>

                {message && (
                    <div className={`message ${message.type}`} style={{
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <div className="student-form-card">
                    <div className="student-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>إضافة طالب جديد</h2>
                        <div className="upload-section">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                            />
                            <button
                                className="add-btn"
                                style={{ background: '#10b981', marginLeft: '1rem' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                            >
                                {uploadingFile ? 'جاري الرفع...' : '📤 رفع ملف Excel'}
                            </button>
                            <a
                                href="/template.xlsx"
                                download
                                style={{ color: '#fbbf24', textDecoration: 'underline', fontSize: '0.9rem' }}
                                onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                        // Create a dummy template with EXACT headers
                                        const workbook = new ExcelJS.Workbook();
                                        const worksheet = workbook.addWorksheet("Students");
                                        
                                        // Add headers
                                        worksheet.addRow(['الاسم', 'رقم الهوية', 'الصف', 'رقم الجلوس', 'رقم اللجنة', 'المقر']);
                                        
                                        // Add sample data
                                        worksheet.addRow(['محمد أحمد', '1234567890', 'الأول ثانوي', '101', '1', 'الصالة الرياضية']);
                                        
                                        // Generate file
                                        const buffer = await workbook.xlsx.writeBuffer();
                                        const blob = new Blob([buffer], { 
                                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                                        });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = "نموذج_الطلاب.xlsx";
                                        link.click();
                                        URL.revokeObjectURL(url);
                                    } catch (err) {
                                        console.error('Error creating template:', err);
                                        setMessage({ type: 'error', text: 'حدث خطأ أثناء إنشاء النموذج' });
                                    }
                                }}
                            >
                                تحميل نموذج
                            </a>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">اسم الطالب</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">رقم الهوية</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.national_id}
                                    onChange={e => setFormData({ ...formData, national_id: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">الصف الدراسي</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.grade}
                                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                    placeholder="مثال: الأول متوسط"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">رقم الجلوس</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.seat_number}
                                    onChange={e => setFormData({ ...formData, seat_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">رقم اللجنة</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.committee_number}
                                    onChange={e => setFormData({ ...formData, committee_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">المقر</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.headquarters}
                                    onChange={e => setFormData({ ...formData, headquarters: e.target.value })}
                                    placeholder="مثال: الصالة الرياضية"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="add-btn" disabled={submitting}>
                            {submitting ? 'جاري الإضافة...' : 'إضافة الطالب'}
                        </button>
                    </form>
                </div>

                <div className="student-list-card">
                    <div className="student-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>قائمة الطلاب ({students.length})</h2>
                        {students.length > 0 && (
                            <button
                                className="delete-btn"
                                onClick={handleDeleteAll}
                                style={{ background: 'rgba(239, 68, 68, 0.4)', color: 'white' }}
                            >
                                🗑️ حذف الكل
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <p>جاري التحميل...</p>
                    ) : (
                        <div className="student-table-scroll" role="region" aria-label="جدول الطلاب — يمكن تمريره أفقيًا" tabIndex={0} style={{ overflowX: 'auto' }}>
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>رقم الهوية</th>
                                        <th>الصف</th>
                                        <th>رقم الجلوس</th>
                                        <th>اللجنة</th>
                                        <th>المقر</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student.id}>
                                            <td>{student.name}</td>
                                            <td>{student.national_id}</td>
                                            <td>{student.grade}</td>
                                            <td>{student.seat_number}</td>
                                            <td>{student.committee_number}</td>
                                            <td>{student.headquarters}</td>
                                            <td>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDelete(student.id)}
                                                >
                                                    حذف
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                                لا يوجد طلاب مضافين حالياً
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
