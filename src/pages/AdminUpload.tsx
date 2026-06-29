import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { navigateTo, navigateToMaterials, navigateToSubjectsManagement } from '../lib/navigation';
import { uploadMaterial, getRecentUploads, formatBytes } from '../services/uploadService';
import { getGradeName } from '../utils/gradeUtils';
import { getSubjectsByStageAndGrade } from '../services/subjectService';
import type { UploadedMaterial, ContentType } from '../types/database.types';
import './AdminUpload.css';
import './AdminUpload_video_styles.css';

export function AdminUpload() {
    const [selectedStage, setSelectedStage] = useState<'middle' | 'high' | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
    const [_selectedReviewType, setSelectedReviewType] = useState<'solved' | 'unsolved' | null>(null);
    const [subjectName, setSubjectName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState(''); // For manual URL input
    const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload'); // Upload mode: upload file or enter URL
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadProgressInfo, setUploadProgressInfo] = useState<{ loaded: number; total: number } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [recentUploads, setRecentUploads] = useState<UploadedMaterial[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Additional fields for videos
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    // Teacher WhatsApp number
    const [teacherWhatsapp, setTeacherWhatsapp] = useState('');

    // Multiple videos support
    interface VideoItem {
        id: string;
        file: File | null;
        fileUrl?: string; // For YouTube links
        title: string;
        description: string;
    }
    const [videoItems, setVideoItems] = useState<VideoItem[]>([]);

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
    const [subjects, setSubjects] = useState<string[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // Load subjects when stage and grade are selected
    useEffect(() => {
        const loadSubjects = async () => {
            if (selectedStage && selectedGrade) {
                setLoadingSubjects(true);
                const loadedSubjects = await getSubjectsByStageAndGrade(selectedStage, selectedGrade);
                setSubjects(loadedSubjects);
                setLoadingSubjects(false);
            } else {
                setSubjects([]);
            }
        };
        loadSubjects();
    }, [selectedStage, selectedGrade]);

    const handleFileSelect = (file: File) => {
        if (selectedContentType === 'videos') {
            // Add to video items list
            const newVideoItem: VideoItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                file: file,
                title: '',
                description: ''
            };
            setVideoItems([...videoItems, newVideoItem]);
            setMessage(null);
        } else {
            setSelectedFile(file);
            setMessage(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (selectedContentType === 'videos') {
                // Handle multiple files for videos
                Array.from(files).forEach(file => {
                    handleFileSelect(file);
                });
            } else {
                const file = files[0];
                if (file) {
                    handleFileSelect(file);
                }
            }
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            if (selectedContentType === 'videos' && files.length > 0) {
                // Handle multiple files for videos
                Array.from(files).forEach(file => {
                    handleFileSelect(file);
                });
            } else {
                const file = files[0];
                if (file) {
                    handleFileSelect(file);
                }
            }
        }
        // Reset input to allow selecting same file again
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleUpload = async () => {
        // Validation based on content type
        if (!selectedStage || !selectedGrade || !selectedContentType) {
            setMessage({ type: 'error', text: 'الرجاء اختيار المرحلة والصف ونوع المحتوى' });
            return;
        }

        if (selectedContentType === 'solved' || selectedContentType === 'unsolved') {
            if (!subjectName.trim()) {
                setMessage({ type: 'error', text: 'الرجاء إدخال اسم المادة' });
                return;
            }
            if (uploadMode === 'upload' && !selectedFile) {
                setMessage({ type: 'error', text: 'الرجاء اختيار ملف أو إدخال رابط الملف' });
                return;
            }
            if (uploadMode === 'url' && !fileUrl.trim()) {
                setMessage({ type: 'error', text: 'الرجاء إدخال رابط الملف' });
                return;
            }
        } else if (selectedContentType === 'schedule') {
            if (uploadMode === 'upload' && !selectedFile) {
                setMessage({ type: 'error', text: 'الرجاء اختيار صورة الجدول أو إدخال رابط الصورة' });
                return;
            }
            if (uploadMode === 'url' && !fileUrl.trim()) {
                setMessage({ type: 'error', text: 'الرجاء إدخال رابط صورة الجدول' });
                return;
            }
        } else if (selectedContentType === 'videos') {
            if (!subjectName.trim()) {
                setMessage({ type: 'error', text: 'الرجاء إدخال اسم المادة' });
                return;
            }
            if (videoItems.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة فيديو واحد على الأقل' });
                return;
            }
            // Validate that each video has either a file or a URL
            const invalidVideos = videoItems.filter(item => !item.file && !item.fileUrl);
            if (invalidVideos.length > 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة ملف أو رابط لكل فيديو' });
                return;
            }
        }

        setUploading(true);
        setUploadProgress(0);
        setMessage(null);

        if (selectedContentType === 'videos' && videoItems.length > 0) {
            // Upload multiple videos
            let successCount = 0;
            let errorCount = 0;
            const totalVideos = videoItems.length;

            for (let i = 0; i < videoItems.length; i++) {
                const videoItem = videoItems[i];
                const progress = Math.round(((i + 1) / totalVideos) * 100);
                setUploadProgress(progress);

                const result = await uploadMaterial(
                    videoItem.file,
                    selectedStage!,
                    selectedGrade!,
                    subjectName.trim(),
                    selectedContentType,
                    undefined, // Progress handled manually
                    {
                        videoTitle: videoItem.title.trim() || undefined,
                        videoDescription: videoItem.description.trim() || undefined,
                        teacherWhatsapp: teacherWhatsapp.trim() || undefined,
                        videoUrl: videoItem.fileUrl || undefined,
                    }
                );

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            setUploading(false);

            if (successCount === totalVideos) {
                setMessage({ type: 'success', text: `تم رفع ${successCount} فيديو بنجاح!` });
                // Reset form
                setSelectedStage(null);
                setSelectedGrade(null);
                setSelectedContentType(null);
                setSelectedReviewType(null);
                setSubjectName('');
                setSelectedFile(null);
                setUploadProgress(0);
                setVideoTitle('');
                setVideoDescription('');
                setTeacherWhatsapp('');
                setVideoItems([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Refresh recent uploads
                loadRecentUploads();
            } else if (successCount > 0) {
                setMessage({ type: 'error', text: `تم رفع ${successCount} فيديو بنجاح، وفشل رفع ${errorCount} فيديو` });
            } else {
                setMessage({ type: 'error', text: 'فشل رفع جميع الفيديوهات' });
            }
        } else {
            // Single file upload (non-videos) or manual URL entry
            const result = await uploadMaterial(
                uploadMode === 'upload' ? selectedFile : null, // Pass file only if upload mode
                selectedStage!,
                selectedGrade!,
                subjectName.trim() || 'عام',
                selectedContentType,
                (progress) => {
                    if (typeof progress === 'number') {
                        setUploadProgress(progress);
                    } else {
                        setUploadProgress(progress.percentage);
                        setUploadProgressInfo({ loaded: progress.loaded, total: progress.total });
                    }
                },
                {
                    videoTitle: videoTitle.trim() || undefined,
                    videoDescription: videoDescription.trim() || undefined,
                    teacherWhatsapp: teacherWhatsapp.trim() || undefined,
                    fileUrl: uploadMode === 'url' ? fileUrl.trim() : undefined, // Pass URL if URL mode
                }
            );

            setUploading(false);

            if (result.success) {
                setMessage({ type: 'success', text: 'تم رفع المحتوى بنجاح!' });
                // Reset form
                setSelectedStage(null);
                setSelectedGrade(null);
                setSelectedContentType(null);
                setSelectedReviewType(null);
                setSubjectName('');
                setSelectedFile(null);
                setUploadProgress(0);
                setVideoTitle('');
                setVideoDescription('');
                setTeacherWhatsapp('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Refresh recent uploads
                loadRecentUploads();
            } else {
                setMessage({ type: 'error', text: result.error || 'فشل رفع المحتوى' });
            }
        }
    };

    const loadRecentUploads = async () => {
        const uploads = await getRecentUploads(5);
        setRecentUploads(uploads);
    };

    // Load recent uploads on mount
    useEffect(() => {
        loadRecentUploads();
    }, []);

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

    return (
        <Layout showFooter={false}>
            <div className="admin-upload">
                <div className="admin-header">
                    <div className="admin-title-container">
                        <h1 className="admin-title">رفع المواد الدراسية</h1>
                        <p className="admin-subtitle">لوحة تحكم المدير</p>
                    </div>
                    <div className="admin-header-actions">
                        <Button
                            variant="primary"
                            onClick={() => navigateToSubjectsManagement()}
                            className="admin-subjects-button"
                        >
                            إدارة المواد الدراسية
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateToMaterials()}
                            className="admin-materials-button"
                        >
                            إدارة الملفات المرفوعة
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('electronic-tests')}
                            className="admin-electronic-button"
                        >
                            إدارة الاختبارات
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('test-builder')}
                            className="admin-test-builder-button"
                        >
                            إنشاء اختبار جديد
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('my-tests')}
                            className="admin-my-tests-button"
                        >
                            الاختبارات المرفوعة
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('statistics')}
                            className="admin-statistics-button"
                        >
                            📊 الإحصائيات
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('live-stream-settings')}
                            className="admin-live-stream-button"
                        >
                            📺 إعدادات البث المباشر
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('question-review')}
                            className="admin-question-review-button"
                        >
                            مراجعة الأسئلة
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigateTo('student-management')}
                            className="admin-student-management-button"
                        >
                            👨‍🎓 إدارة الطلاب
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                window.location.hash = '';
                                navigateTo('welcome');
                            }}
                            className="admin-exit-button"
                        >
                            العودة للصفحة الرئيسية
                        </Button>
                    </div>
                </div>

                <div className="upload-form">
                    {/* Stage Selection */}
                    <div className="form-section">
                        <label className="form-label">اختر المرحلة</label>
                        <div className="review-type-grid">
                            <button
                                className={`review-type-btn ${selectedStage === 'middle' ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedStage('middle');
                                    setSelectedGrade(null); // Reset grade when stage changes
                                }}
                                disabled={uploading}
                            >
                                المرحلة المتوسطة
                            </button>
                            <button
                                className={`review-type-btn ${selectedStage === 'high' ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedStage('high');
                                    setSelectedGrade(null); // Reset grade when stage changes
                                }}
                                disabled={uploading}
                            >
                                المرحلة الثانوية
                            </button>
                        </div>
                    </div>

                    {/* Grade Selection */}
                    {selectedStage && (
                        <div className="form-section">
                            <label className="form-label">اختر الصف</label>
                            <div className="grade-grid">
                                {grades.map((grade) => (
                                    <button
                                        key={grade.id}
                                        className={`grade-btn ${selectedGrade === grade.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedGrade(grade.id)}
                                        disabled={uploading}
                                    >
                                        {grade.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content Type Selection */}
                    {selectedStage && selectedGrade && (
                        <div className="form-section">
                            <label className="form-label">نوع المحتوى</label>
                            <div className="review-type-grid">
                                <button
                                    className={`review-type-btn ${selectedContentType === 'schedule' ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedContentType('schedule');
                                        setSelectedReviewType(null);
                                    }}
                                    disabled={uploading}
                                >
                                    جدول اختبارات
                                </button>
                                <button
                                    className={`review-type-btn ${selectedContentType === 'solved' ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedContentType('solved');
                                        setSelectedReviewType('solved');
                                    }}
                                    disabled={uploading}
                                >
                                    مراجعات محلولة
                                </button>
                                <button
                                    className={`review-type-btn ${selectedContentType === 'unsolved' ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedContentType('unsolved');
                                        setSelectedReviewType('unsolved');
                                    }}
                                    disabled={uploading}
                                >
                                    مراجعات غير محلولة
                                </button>
                                {selectedStage === 'middle' && (
                                    <button
                                        className={`review-type-btn ${selectedContentType === 'videos' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedContentType('videos');
                                            setSelectedReviewType(null);
                                        }}
                                        disabled={uploading}
                                    >
                                        فيديوهات
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subject Name - Not required for schedule */}
                    {(selectedContentType === 'solved' || selectedContentType === 'unsolved' || selectedContentType === 'videos') && (
                        <div className="form-section">
                            <label className="form-label" htmlFor="subject-select">
                                اسم المادة
                            </label>
                            {loadingSubjects ? (
                                <div className="loading-subjects">جاري تحميل المواد...</div>
                            ) : subjects.length === 0 ? (
                                <div className="no-subjects-message">
                                    <p>لا توجد مواد متاحة لهذا الصف. يرجى إضافة المواد من صفحة إدارة المواد.</p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigateToMaterials()}
                                        className="manage-subjects-btn"
                                    >
                                        إدارة المواد
                                    </Button>
                                </div>
                            ) : (
                                <select
                                    id="subject-select"
                                    className="subject-select"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    disabled={uploading}
                                >
                                    <option value="">اختر المادة</option>
                                    {subjects.map((subject) => (
                                        <option key={subject} value={subject}>
                                            {subject}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Video Items List */}
                    {selectedContentType === 'videos' && videoItems.length > 0 && (
                        <div className="form-section">
                            <label className="form-label">الفيديوهات المضافة ({videoItems.length})</label>
                            <div className="video-items-list">
                                {videoItems.map((item, index) => (
                                    <div key={item.id} className="video-item-card">
                                        <div className="video-item-header">
                                            <h4 className="video-item-number">فيديو {index + 1}</h4>
                                            <button
                                                type="button"
                                                className="remove-video-btn"
                                                onClick={() => {
                                                    setVideoItems(videoItems.filter(v => v.id !== item.id));
                                                }}
                                                disabled={uploading}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="video-item-content">
                                            {item.file ? (
                                                <div className="video-file-info">
                                                    <p className="video-file-name">{item.file.name}</p>
                                                    <p className="video-file-size">{formatFileSize(item.file.size)}</p>
                                                </div>
                                            ) : (
                                                <div className="form-section">
                                                    <label className="form-label">رابط الفيديو</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                            http://northelite0.com/
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={item.fileUrl || ''}
                                                            onChange={(e) => {
                                                                const updated = videoItems.map(v =>
                                                                    v.id === item.id ? { ...v, fileUrl: e.target.value } : v
                                                                );
                                                                setVideoItems(updated);
                                                            }}
                                                            placeholder="uploads/materials/grade_7/video.mp4 أو youtube.com/watch?v=..."
                                                            disabled={uploading}
                                                            style={{ flex: 1 }}
                                                        />
                                                    </div>
                                                    <p className="form-hint">
                                                        أدخل مسار الملف فقط (سيتم إضافة http://northelite0.com/ تلقائياً) أو رابط YouTube كامل
                                                    </p>
                                                </div>
                                            )}
                                            <div className="form-section">
                                                <label className="form-label">عنوان الفيديو (اختياري)</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.title}
                                                    onChange={(e) => {
                                                        const updated = videoItems.map(v =>
                                                            v.id === item.id ? { ...v, title: e.target.value } : v
                                                        );
                                                        setVideoItems(updated);
                                                    }}
                                                    placeholder="مثال: شرح الدرس الأول - الوحدة الثالثة"
                                                    disabled={uploading}
                                                />
                                                <p className="form-hint">يمكنك إضافة عنوان واضح يميز هذا الفيديو عن باقي الفيديوهات</p>
                                            </div>
                                            <div className="form-section">
                                                <label className="form-label">وصف الفيديو (اختياري)</label>
                                                <textarea
                                                    className="form-textarea"
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const updated = videoItems.map(v =>
                                                            v.id === item.id ? { ...v, description: e.target.value } : v
                                                        );
                                                        setVideoItems(updated);
                                                    }}
                                                    placeholder="مثال: شرح مفصل لدرس الأسماء الخمسة مع أمثلة تطبيقية"
                                                    disabled={uploading}
                                                    rows={3}
                                                />
                                                <p className="form-hint">يمكنك إضافة وصف مختصر يوضح محتوى الفيديو</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Teacher WhatsApp - Show for solved, unsolved, and videos */}
                    {(selectedContentType === 'solved' || selectedContentType === 'unsolved' || selectedContentType === 'videos') && (
                        <div className="form-section">
                            <label className="form-label">رقم واتساب المعلم (اختياري)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={teacherWhatsapp}
                                onChange={(e) => setTeacherWhatsapp(e.target.value)}
                                placeholder="مثال: 966501234567 أو +966501234567"
                                disabled={uploading}
                            />
                            <p className="form-hint">يمكن إدخال الرقم مع أو بدون رمز الدولة (+966)</p>
                        </div>
                    )}


                    {/* File Upload - Required for schedule, solved, unsolved, optional for videos */}
                    {selectedContentType !== 'videos' && (
                        <div className="form-section">
                            <label className="form-label">
                                {selectedContentType === 'schedule' ? 'صورة جدول الاختبارات' : 'الملف'}
                            </label>

                            {/* Upload Mode Toggle */}
                            <div className="upload-mode-toggle" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className={`mode-button ${uploadMode === 'upload' ? 'active' : ''}`}
                                    onClick={() => {
                                        setUploadMode('upload');
                                        setFileUrl('');
                                    }}
                                    disabled={uploading}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: uploadMode === 'upload' ? 'var(--primary-color)' : 'transparent',
                                        color: 'var(--text-primary)',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        flex: 1
                                    }}
                                >
                                    📤 رفع ملف
                                </button>
                                <button
                                    type="button"
                                    className={`mode-button ${uploadMode === 'url' ? 'active' : ''}`}
                                    onClick={() => {
                                        setUploadMode('url');
                                        setSelectedFile(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                    disabled={uploading}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        background: uploadMode === 'url' ? 'var(--primary-color)' : 'transparent',
                                        color: 'var(--text-primary)',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        flex: 1
                                    }}
                                >
                                    🔗 إدخال رابط
                                </button>
                            </div>

                            {uploadMode === 'upload' ? (
                                <div
                                    className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="file-input-hidden"
                                        accept={selectedContentType === 'schedule' ? 'image/*' : '.pdf,.doc,.docx,.ppt,.pptx'}
                                        onChange={handleFileInputChange}
                                        disabled={uploading}
                                    />
                                    {selectedFile ? (
                                        <div className="file-preview">
                                            <div className="file-info">
                                                <p className="file-name">{selectedFile.name}</p>
                                                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="file-placeholder">
                                            <p className="upload-text">اسحب الملف هنا أو انقر للاختيار</p>
                                            <p className="upload-hint">PDF, Word, PowerPoint (حتى 50 ميجابايت)</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            http://northelite0.com/
                                        </span>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={fileUrl}
                                            onChange={(e) => setFileUrl(e.target.value)}
                                            placeholder="uploads/materials/grade_7/filename.pdf"
                                            disabled={uploading}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                                        أدخل مسار الملف فقط (سيتم إضافة http://northelite0.com/ تلقائياً)
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add Video Button - Only for videos */}
                    {selectedContentType === 'videos' && (
                        <div className="form-section">
                            <label className="form-label">إضافة فيديو</label>
                            <div
                                className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="file-input-hidden"
                                    accept="video/*,.mp4,.webm,.ogg"
                                    onChange={handleFileInputChange}
                                    disabled={uploading}
                                    multiple
                                />
                                <div className="file-placeholder">
                                    <p className="upload-text">اسحب ملفات الفيديو هنا أو انقر للاختيار</p>
                                    <p className="upload-hint">يمكنك اختيار عدة فيديوهات في نفس الوقت</p>
                                    <p className="upload-hint">أو يمكنك إضافة رابط YouTube في القائمة أعلاه</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="add-video-link-btn"
                                    onClick={() => {
                                        const newVideoItem: VideoItem = {
                                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                            file: null,
                                            fileUrl: '',
                                            title: '',
                                            description: ''
                                        };
                                        setVideoItems([...videoItems, newVideoItem]);
                                    }}
                                    disabled={uploading}
                                    style={{ flex: 1 }}
                                >
                                    + إضافة رابط فيديو (YouTube)
                                </button>
                                <button
                                    type="button"
                                    className="add-video-link-btn"
                                    onClick={() => {
                                        const newVideoItem: VideoItem = {
                                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                            file: null,
                                            fileUrl: '', // This will be used for direct video file URL from Hostinger
                                            title: '',
                                            description: ''
                                        };
                                        setVideoItems([...videoItems, newVideoItem]);
                                    }}
                                    disabled={uploading}
                                    style={{ flex: 1 }}
                                >
                                    + إضافة رابط ملف فيديو (Hostinger)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="progress-section">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <div className="progress-info">
                                <p className="progress-text">{uploadProgress}%</p>
                                {uploadProgressInfo && (
                                    <p className="progress-details">
                                        {formatBytes(uploadProgressInfo.loaded)} / {formatBytes(uploadProgressInfo.total)}
                                        {' '}(المتبقي: {formatBytes(uploadProgressInfo.total - uploadProgressInfo.loaded)})
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Upload Button */}
                    <Button
                        onClick={handleUpload}
                        disabled={uploading || !selectedStage || !selectedGrade || !selectedContentType}
                        className="upload-btn"
                    >
                        {uploading ? 'جاري الرفع...' : 'رفع المحتوى'}
                    </Button>
                </div>

                {/* Recent Uploads */}
                {recentUploads.length > 0 && (
                    <div className="recent-uploads">
                        <h2 className="section-title">آخر الملفات المرفوعة</h2>
                        <div className="uploads-list">
                            {recentUploads.map((upload) => (
                                <div key={upload.id} className="upload-item">
                                    <div className="upload-item-info">
                                        <p className="upload-item-subject">{upload.subject_name}</p>
                                        <p className="upload-item-details">
                                            {getGradeName(upload.grade)} • {formatFileSize(upload.file_size)}
                                        </p>
                                        {upload.uploaded_at && (
                                            <p className="upload-item-date">{formatDate(upload.uploaded_at)}</p>
                                        )}
                                    </div>
                                    <a
                                        href={upload.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="upload-item-link"
                                    >
                                        عرض
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
