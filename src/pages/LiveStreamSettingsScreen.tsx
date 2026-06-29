import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { uploadFileToHostinger, validateFile, formatBytes } from '../services/uploadService';
import { saveLiveStreamSchedule, getAllLiveStreamSchedules, deleteLiveStreamSchedule, type LiveStreamSchedule } from '../services/liveStreamService';
import { getSubjectsByStageAndGrade } from '../services/subjectService';
import './LiveStreamSettingsScreen.css';

const BASE_VIDEO_URL = 'https://northelite0.com/';

export function LiveStreamSettingsScreen() {
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [subjectName, setSubjectName] = useState<string>('');
    const [teacherName, setTeacherName] = useState<string>('');
    
    // Image 1 fields (الصورة الأولى)
    const [selectedImage1, setSelectedImage1] = useState<File | null>(null);
    const [image1StartDate, setImage1StartDate] = useState<string>('');
    const [image1StartTime, setImage1StartTime] = useState<string>('');
    const [image1EndDate, setImage1EndDate] = useState<string>('');
    const [image1EndTime, setImage1EndTime] = useState<string>('');
    const fileInputRef1 = useRef<HTMLInputElement>(null);
    
    // Image 2 fields (الصورة الثانية - قبل الفيديو)
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imageStartDate, setImageStartDate] = useState<string>('');
    const [imageStartTime, setImageStartTime] = useState<string>('');
    const [imageEndDate, setImageEndDate] = useState<string>('');
    const [imageEndTime, setImageEndTime] = useState<string>('');
    
    // Video fields
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [videoDuration, setVideoDuration] = useState<number | null>(null); // مدة الفيديو بالثواني
    const [videoDurationLoading, setVideoDurationLoading] = useState(false);
    
    // Image 3 fields (الصورة الثالثة - بعد الفيديو)
    const [selectedImageAfter, setSelectedImageAfter] = useState<File | null>(null);
    const [imageAfterStartDate, setImageAfterStartDate] = useState<string>('');
    const [imageAfterStartTime, setImageAfterStartTime] = useState<string>('');
    const [imageAfterEndDate, setImageAfterEndDate] = useState<string>('');
    const [imageAfterEndTime, setImageAfterEndTime] = useState<string>('');
    const fileInputRefAfter = useRef<HTMLInputElement>(null);
    
    // Image 4 fields (الصورة الرابعة - بعد صورة 3)
    const [selectedImage4, setSelectedImage4] = useState<File | null>(null);
    const [image4StartDate, setImage4StartDate] = useState<string>('');
    const [image4StartTime, setImage4StartTime] = useState<string>('');
    const [image4EndDate, setImage4EndDate] = useState<string>('');
    const [image4EndTime, setImage4EndTime] = useState<string>('');
    const fileInputRef4 = useRef<HTMLInputElement>(null);
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Existing schedules
    const [schedules, setSchedules] = useState<LiveStreamSchedule[]>([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<LiveStreamSchedule | null>(null);
    const [showForm, setShowForm] = useState(true);

    const grades = [
        { id: 7, name: 'الصف الأول متوسط' },
        { id: 8, name: 'الصف الثاني متوسط' },
        { id: 9, name: 'الصف الثالث متوسط' },
    ];

    // Load subjects when grade is selected
    useEffect(() => {
        const loadSubjects = async () => {
            if (selectedGrade) {
                setLoadingSubjects(true);
                const loadedSubjects = await getSubjectsByStageAndGrade('middle', selectedGrade);
                setSubjects(loadedSubjects);
                setLoadingSubjects(false);
            } else {
                setSubjects([]);
            }
        };
        loadSubjects();
    }, [selectedGrade]);

    // Load existing schedules
    useEffect(() => {
        const loadSchedules = async () => {
            setLoadingSchedules(true);
            const allSchedules = await getAllLiveStreamSchedules();
            setSchedules(allSchedules);
            setLoadingSchedules(false);
        };
        loadSchedules();
    }, []);

    // Get video duration when video URL changes
    useEffect(() => {
        const getVideoDuration = async () => {
            if (!videoUrl.trim()) {
                setVideoDuration(null);
                return;
            }

            let finalVideoUrl = videoUrl.trim();
            
            // Remove public_html from path if present
            finalVideoUrl = finalVideoUrl.replace(/\/?public_html\//g, '/');
            finalVideoUrl = finalVideoUrl.replace(/\/\/+/g, '/'); // Remove double slashes
            
            if (!finalVideoUrl.match(/^https?:\/\//i)) {
                if (finalVideoUrl.startsWith('/')) {
                    finalVideoUrl = finalVideoUrl.substring(1);
                }
                finalVideoUrl = BASE_VIDEO_URL + finalVideoUrl;
            } else {
                // If it's a full URL, also remove public_html from it
                finalVideoUrl = finalVideoUrl.replace(/\/\/?public_html\//g, '/');
                finalVideoUrl = finalVideoUrl.replace(/\/\/+/g, '/'); // Remove double slashes
                // Fix protocol double slashes
                finalVideoUrl = finalVideoUrl.replace(/^(https?:\/)(\/+)/, '$1/');
            }

            setVideoDurationLoading(true);
            try {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.crossOrigin = 'anonymous';
                
                const cleanup = () => {
                    if (video.src) {
                        window.URL.revokeObjectURL(video.src);
                    }
                    video.onloadedmetadata = null;
                    video.onerror = null;
                };

                video.onloadedmetadata = () => {
                    cleanup();
                    const duration = Math.ceil(video.duration); // مدة الفيديو بالثواني (مقربة للأعلى)
                    setVideoDuration(duration);
                    setVideoDurationLoading(false);
                    console.log('📹 مدة الفيديو:', duration, 'ثانية');
                };

                video.onerror = () => {
                    cleanup();
                    setVideoDuration(null);
                    setVideoDurationLoading(false);
                    console.error('❌ فشل تحميل الفيديو للحصول على المدة');
                };

                video.src = finalVideoUrl + '?t=0';
            } catch (error) {
                console.error('Error getting video duration:', error);
                setVideoDuration(null);
                setVideoDurationLoading(false);
            }
        };

        getVideoDuration();
    }, [videoUrl]);

    // Auto-calculate all times when any time changes
    // التسلسل: صورة 1 → صورة 2 → فيديو → صورة 3 → صورة 4
    useEffect(() => {
        if (image1EndDate && image1EndTime) {
            // صورة 2 تبدأ عند انتهاء صورة 1
            const image1EndDateTime = new Date(`${image1EndDate}T${image1EndTime}`);
            setImageStartDate(image1EndDateTime.toISOString().split('T')[0]);
            setImageStartTime(image1EndDateTime.toTimeString().slice(0, 5));
        }
    }, [image1EndDate, image1EndTime]);

    useEffect(() => {
        if (imageEndDate && imageEndTime && videoDuration) {
            const imageEndDateTime = new Date(`${imageEndDate}T${imageEndTime}`);
            const videoStartDateTime = imageEndDateTime; // الفيديو يبدأ عند انتهاء صورة 2
            
            // موعد انتهاء الفيديو = موعد بدء الفيديو + مدة الفيديو
            const videoEndDateTime = new Date(videoStartDateTime.getTime() + videoDuration * 1000);
            
            // موعد بدء صورة 3 = موعد انتهاء الفيديو
            const imageAfterStartDateTime = videoEndDateTime;
            const imageAfterEndDateTime = new Date(imageAfterStartDateTime.getTime() + 60 * 1000); // افتراضياً دقيقة واحدة
            
            setImageAfterStartDate(imageAfterStartDateTime.toISOString().split('T')[0]);
            setImageAfterStartTime(imageAfterStartDateTime.toTimeString().slice(0, 5));
            setImageAfterEndDate(imageAfterEndDateTime.toISOString().split('T')[0]);
            setImageAfterEndTime(imageAfterEndDateTime.toTimeString().slice(0, 5));
        }
    }, [imageEndDate, imageEndTime, videoDuration]);

    useEffect(() => {
        if (imageAfterEndDate && imageAfterEndTime) {
            // صورة 4 تبدأ عند انتهاء صورة 3
            const imageAfterEndDateTime = new Date(`${imageAfterEndDate}T${imageAfterEndTime}`);
            setImage4StartDate(imageAfterEndDateTime.toISOString().split('T')[0]);
            setImage4StartTime(imageAfterEndDateTime.toTimeString().slice(0, 5));
        }
    }, [imageAfterEndDate, imageAfterEndTime]);

    const handleFileSelect = (file: File) => {
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            return;
        }
        setSelectedImage(file);
        setMessage(null);
    };

    const handleFileSelect1 = (file: File) => {
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            return;
        }
        setSelectedImage1(file);
        setMessage(null);
    };

    const handleFileSelectAfter = (file: File) => {
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            return;
        }
        setSelectedImageAfter(file);
        setMessage(null);
    };

    const handleFileSelect4 = (file: File) => {
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            return;
        }
        setSelectedImage4(file);
        setMessage(null);
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
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const formatFileSize = (bytes: number): string => {
        return formatBytes(bytes);
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedGrade) {
            setMessage({ type: 'error', text: 'الرجاء اختيار الصف' });
            return;
        }

        if (!subjectName.trim()) {
            setMessage({ type: 'error', text: 'الرجاء اختيار المادة' });
            return;
        }

        if (!teacherName.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إدخال اسم المعلم' });
            return;
        }

        // Validate all images
        if (!editingSchedule && !selectedImage1) {
            setMessage({ type: 'error', text: 'الرجاء اختيار الصورة الأولى' });
            return;
        }

        if (!editingSchedule && !selectedImage) {
            setMessage({ type: 'error', text: 'الرجاء اختيار الصورة الثانية' });
            return;
        }
        
        // If editing, images are optional (use existing if not changed)
        if (editingSchedule && !selectedImage1 && !selectedImage) {
            // Will use existing image URLs
        }

        if (!image1StartDate || !image1StartTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد موعد بدء الصورة الأولى' });
            return;
        }

        if (!image1EndDate || !image1EndTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد موعد انتهاء الصورة الأولى' });
            return;
        }

        if (!imageStartDate || !imageStartTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد موعد بدء الصورة الثانية' });
            return;
        }

        if (!imageEndDate || !imageEndTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد موعد انتهاء الصورة الثانية' });
            return;
        }

        if (!videoUrl.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إدخال رابط الفيديو' });
            return;
        }

        if (!videoDuration || videoDuration <= 0) {
            setMessage({ type: 'error', text: 'الرجاء الانتظار حتى يتم تحديد مدة الفيديو تلقائياً' });
            return;
        }

        if (!selectedImageAfter) {
            setMessage({ type: 'error', text: 'الرجاء اختيار الصورة الثالثة (بعد الفيديو)' });
            return;
        }

        if (!imageAfterStartDate || !imageAfterStartTime || !imageAfterEndDate || !imageAfterEndTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد مواعيد الصورة الثالثة' });
            return;
        }

        if (!selectedImage4) {
            setMessage({ type: 'error', text: 'الرجاء اختيار الصورة الرابعة' });
            return;
        }

        if (!image4StartDate || !image4StartTime || !image4EndDate || !image4EndTime) {
            setMessage({ type: 'error', text: 'الرجاء تحديد مواعيد الصورة الرابعة' });
            return;
        }

        // Validate all dates
        const image1StartDateTime = new Date(`${image1StartDate}T${image1StartTime}`);
        const image1EndDateTime = new Date(`${image1EndDate}T${image1EndTime}`);
        
        if (image1EndDateTime <= image1StartDateTime) {
            setMessage({ type: 'error', text: 'موعد انتهاء الصورة الأولى يجب أن يكون بعد موعد البدء' });
            return;
        }

        const imageStartDateTime = new Date(`${imageStartDate}T${imageStartTime}`);
        const imageEndDateTime = new Date(`${imageEndDate}T${imageEndTime}`);
        
        if (imageEndDateTime <= imageStartDateTime) {
            setMessage({ type: 'error', text: 'موعد انتهاء الصورة الثانية يجب أن يكون بعد موعد البدء' });
            return;
        }

        // Video starts when image 2 ends
        const videoStartDateTime = imageEndDateTime;
        // موعد انتهاء الفيديو = موعد بدء الفيديو + مدة الفيديو
        const videoEndDateTime = new Date(videoStartDateTime.getTime() + videoDuration * 1000);

        // استخدام المواعيد المحسوبة تلقائياً للصور
        const imageAfterStartDateTime = videoEndDateTime; // صورة 3 تبدأ عند انتهاء الفيديو
        const imageAfterEndDateTime = new Date(`${imageAfterEndDate}T${imageAfterEndTime}`);
        
        if (imageAfterEndDateTime <= imageAfterStartDateTime) {
            setMessage({ type: 'error', text: 'موعد انتهاء الصورة الثالثة يجب أن يكون بعد موعد البدء' });
            return;
        }

        const image4StartDateTime = new Date(`${image4StartDate}T${image4StartTime}`);
        const image4EndDateTime = new Date(`${image4EndDate}T${image4EndTime}`);
        
        if (image4EndDateTime <= image4StartDateTime) {
            setMessage({ type: 'error', text: 'موعد انتهاء الصورة الرابعة يجب أن يكون بعد موعد البدء' });
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setMessage(null);

        try {
            // Prepare video URL
            let finalVideoUrl = videoUrl.trim();
            
            // Remove public_html from path if present
            finalVideoUrl = finalVideoUrl.replace(/\/?public_html\//g, '/');
            finalVideoUrl = finalVideoUrl.replace(/\/\/+/g, '/'); // Remove double slashes
            
            if (!finalVideoUrl.match(/^https?:\/\//i)) {
                if (finalVideoUrl.startsWith('/')) {
                    finalVideoUrl = finalVideoUrl.substring(1);
                }
                finalVideoUrl = BASE_VIDEO_URL + finalVideoUrl;
            } else {
                // If it's a full URL, also remove public_html from it
                finalVideoUrl = finalVideoUrl.replace(/\/\/?public_html\//g, '/');
                finalVideoUrl = finalVideoUrl.replace(/\/\/+/g, '/'); // Remove double slashes
                // Fix protocol double slashes
                finalVideoUrl = finalVideoUrl.replace(/^(https?:\/)(\/+)/, '$1/');
            }

            // Upload and save Image 1
            setUploadProgress(5);
            let image1FileUrl = editingSchedule?.file_url || '';
            let image1FileName = editingSchedule?.file_name || '';
            let image1FileSize = editingSchedule?.file_size || 0;
            
            if (selectedImage1) {
                const image1UploadResponse = await uploadFileToHostinger(
                    selectedImage1,
                    selectedGrade!,
                    subjectName.trim(),
                    'schedule',
                    (progress) => {
                        const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                        setUploadProgress(5 + Math.round(progressValue * 0.15)); // 15% for image 1
                    }
                );

                if (!image1UploadResponse.success || !image1UploadResponse.fileUrl) {
                    setUploading(false);
                    setMessage({ type: 'error', text: image1UploadResponse.error || 'فشل رفع الصورة الأولى' });
                    return;
                }

                image1FileUrl = image1UploadResponse.fileUrl;
                image1FileName = selectedImage1.name;
                image1FileSize = selectedImage1.size;
            }

            setUploadProgress(20);

            // Save Image 1 schedule
            const image1Schedule = await saveLiveStreamSchedule({
                    stage: 'middle',
                    grade: selectedGrade!,
                    subject_name: subjectName.trim() as 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي',
                    teacher_name: teacherName.trim(),
                    content_type: 'image',
                file_url: image1FileUrl,
                file_name: image1FileName,
                file_size: image1FileSize,
                start_datetime: image1StartDateTime.toISOString(),
                end_datetime: image1EndDateTime.toISOString(),
                    status: 'scheduled',
                });

            if (!image1Schedule) {
                setUploading(false);
                setMessage({ type: 'error', text: 'فشل حفظ موعد الصورة الأولى' });
                return;
            }

            setUploadProgress(25);

            // Upload and save Image 2
            let image2FileUrl = editingSchedule?.file_url || '';
            let image2FileName = editingSchedule?.file_name || '';
            let image2FileSize = editingSchedule?.file_size || 0;
            
            if (selectedImage) {
                const image2UploadResponse = await uploadFileToHostinger(
                    selectedImage,
                selectedGrade!,
                subjectName.trim(),
                'schedule',
                (progress) => {
                    const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                        setUploadProgress(25 + Math.round(progressValue * 0.15)); // 15% for image 2
                }
            );

                if (!image2UploadResponse.success || !image2UploadResponse.fileUrl) {
                setUploading(false);
                    setMessage({ type: 'error', text: image2UploadResponse.error || 'فشل رفع الصورة الثانية' });
                return;
            }

                image2FileUrl = image2UploadResponse.fileUrl;
                image2FileName = selectedImage.name;
                image2FileSize = selectedImage.size;
            }

            setUploadProgress(40);

            // Save Image 2 schedule
            const image2Schedule = await saveLiveStreamSchedule({
                stage: 'middle',
                grade: selectedGrade!,
                subject_name: subjectName.trim() as 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي',
                    teacher_name: teacherName.trim(),
                content_type: 'image',
                file_url: image2FileUrl,
                file_name: image2FileName,
                file_size: image2FileSize,
                start_datetime: imageStartDateTime.toISOString(),
                end_datetime: imageEndDateTime.toISOString(),
                status: 'scheduled',
            });

            if (!image2Schedule) {
                setUploading(false);
                setMessage({ type: 'error', text: 'فشل حفظ موعد الصورة الثانية' });
                return;
            }

            setUploadProgress(50);

            // Save Video schedule
            const videoSchedule = await saveLiveStreamSchedule({
                    stage: 'middle',
                    grade: selectedGrade!,
                    subject_name: subjectName.trim() as 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي',
                    teacher_name: teacherName.trim(),
                    content_type: 'video',
                    file_url: finalVideoUrl,
                    file_name: 'فيديو مباشر',
                    start_datetime: videoStartDateTime.toISOString(),
                    end_datetime: videoEndDateTime.toISOString(),
                    status: 'scheduled',
                });

            if (!videoSchedule) {
                setUploading(false);
                setMessage({ type: 'error', text: 'فشل حفظ موعد الفيديو' });
                return;
            }

            setUploadProgress(60);

            // Upload and save Image 3
            const image3UploadResponse = await uploadFileToHostinger(
                selectedImageAfter,
                selectedGrade!,
                subjectName.trim(),
                'schedule',
                (progress) => {
                    const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                    setUploadProgress(60 + Math.round(progressValue * 0.15)); // 15% for image 3
                }
            );

            if (!image3UploadResponse.success || !image3UploadResponse.fileUrl) {
                setUploading(false);
                setMessage({ type: 'error', text: image3UploadResponse.error || 'فشل رفع الصورة الثالثة' });
                return;
            }

            setUploadProgress(75);

            // Save Image 3 schedule
            const image3Schedule = await saveLiveStreamSchedule({
                stage: 'middle',
                grade: selectedGrade!,
                subject_name: subjectName.trim() as 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي',
                teacher_name: teacherName.trim(),
                content_type: 'image',
                file_url: image3UploadResponse.fileUrl,
                file_name: selectedImageAfter.name,
                file_size: selectedImageAfter.size,
                start_datetime: imageAfterStartDateTime.toISOString(),
                end_datetime: imageAfterEndDateTime.toISOString(),
                status: 'scheduled',
            });

            if (!image3Schedule) {
                setUploading(false);
                setMessage({ type: 'error', text: 'فشل حفظ موعد الصورة الثالثة' });
                return;
            }

            setUploadProgress(80);

            // Upload and save Image 4
            const image4UploadResponse = await uploadFileToHostinger(
                selectedImage4,
                selectedGrade!,
                subjectName.trim(),
                'schedule',
                (progress) => {
                    const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                    setUploadProgress(80 + Math.round(progressValue * 0.15)); // 15% for image 4
                }
            );

            if (!image4UploadResponse.success || !image4UploadResponse.fileUrl) {
                setUploading(false);
                setMessage({ type: 'error', text: image4UploadResponse.error || 'فشل رفع الصورة الرابعة' });
                return;
            }

            setUploadProgress(95);

            // Save Image 4 schedule
            const image4Schedule = await saveLiveStreamSchedule({
                stage: 'middle',
                grade: selectedGrade!,
                subject_name: subjectName.trim() as 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي',
                teacher_name: teacherName.trim(),
                content_type: 'image',
                file_url: image4UploadResponse.fileUrl,
                file_name: selectedImage4.name,
                file_size: selectedImage4.size,
                start_datetime: image4StartDateTime.toISOString(),
                end_datetime: image4EndDateTime.toISOString(),
                status: 'scheduled',
            });

            setUploadProgress(100);
            setUploading(false);

            if (!image4Schedule) {
                setMessage({ type: 'error', text: 'تم حفظ الصور الثلاثة والفيديو ولكن فشل حفظ الصورة الرابعة' });
                return;
            }

            setMessage({ type: 'success', text: editingSchedule ? 'تم تحديث البث المباشر بنجاح!' : 'تم حفظ إعدادات البث المباشر بنجاح!' });
            
            // Reload schedules
            const allSchedules = await getAllLiveStreamSchedules();
            setSchedules(allSchedules);
            
            // Reset form
            setEditingSchedule(null);
            setSelectedGrade(null);
            setSubjectName('');
            setTeacherName('');
            setSelectedImage1(null);
            setImage1StartDate('');
            setImage1StartTime('');
            setImage1EndDate('');
            setImage1EndTime('');
            setSelectedImage(null);
            setImageStartDate('');
            setImageStartTime('');
            setImageEndDate('');
            setImageEndTime('');
            setVideoUrl('');
            setVideoDuration(null);
            setSelectedImageAfter(null);
            setImageAfterStartDate('');
            setImageAfterStartTime('');
            setImageAfterEndDate('');
            setImageAfterEndTime('');
            setSelectedImage4(null);
            setImage4StartDate('');
            setImage4StartTime('');
            setImage4EndDate('');
            setImage4EndTime('');
            if (fileInputRef1.current) {
                fileInputRef1.current.value = '';
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            if (fileInputRefAfter.current) {
                fileInputRefAfter.current.value = '';
            }
            if (fileInputRef4.current) {
                fileInputRef4.current.value = '';
            }
        } catch (error) {
            console.error('Error saving live stream settings:', error);
            setUploading(false);
            setMessage({ 
                type: 'error', 
                text: error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ' 
            });
        }
    };

    // Get current date for default values
    const getCurrentDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const defaultDate = getCurrentDate();

    // Group schedules by grade
    const schedulesByGrade = schedules.reduce((acc, schedule) => {
        if (!acc[schedule.grade]) {
            acc[schedule.grade] = [];
        }
        acc[schedule.grade].push(schedule);
        return acc;
    }, {} as Record<number, LiveStreamSchedule[]>);

    // Handle edit - load all 4 images and video
    const handleEdit = async (schedule: LiveStreamSchedule) => {
        const gradeSchedules = schedulesByGrade[schedule.grade] || [];
        
        // Find all related schedules (same teacher, subject, grade)
        const relatedSchedules = gradeSchedules.filter(s => 
                            s.teacher_name === schedule.teacher_name && 
            s.subject_name === schedule.subject_name
        );
        
        // Sort by start_datetime to identify order: image1, image2, video, image3, image4
        const sortedSchedules = relatedSchedules.sort((a, b) => 
            new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
        );
        
        // Identify each schedule by type and order
        const image1Schedule = sortedSchedules.find(s => s.content_type === 'image' && s.id === schedule.id) ||
                              sortedSchedules.find((s, idx) => s.content_type === 'image' && idx === 0);
        const image2Schedule = sortedSchedules.find((s, idx) => s.content_type === 'image' && idx === 1);
        const videoSchedule = sortedSchedules.find(s => s.content_type === 'video');
        const image3Schedule = sortedSchedules.find((s, idx) => s.content_type === 'image' && idx === 2);
        const image4Schedule = sortedSchedules.find((s, idx) => s.content_type === 'image' && idx === 3);

        if (image1Schedule || image2Schedule || videoSchedule) {
            const firstSchedule = image1Schedule || image2Schedule || videoSchedule!;
            setEditingSchedule(firstSchedule);
            setSelectedGrade(firstSchedule.grade);
            setSubjectName(firstSchedule.subject_name);
            setTeacherName(firstSchedule.teacher_name);
            
            // Load Image 1
            if (image1Schedule) {
                const startDate = new Date(image1Schedule.start_datetime);
                setImage1StartDate(startDate.toISOString().split('T')[0]);
                setImage1StartTime(startDate.toTimeString().slice(0, 5));
                const endDate = new Date(image1Schedule.end_datetime);
                setImage1EndDate(endDate.toISOString().split('T')[0]);
                setImage1EndTime(endDate.toTimeString().slice(0, 5));
                setSelectedImage1(null);
            }
            
            // Load Image 2
            if (image2Schedule) {
                const startDate = new Date(image2Schedule.start_datetime);
            setImageStartDate(startDate.toISOString().split('T')[0]);
            setImageStartTime(startDate.toTimeString().slice(0, 5));
                const endDate = new Date(image2Schedule.end_datetime);
            setImageEndDate(endDate.toISOString().split('T')[0]);
            setImageEndTime(endDate.toTimeString().slice(0, 5));
                setSelectedImage(null);
            }
            
            // Load Video
            if (videoSchedule) {
                let videoUrlValue = videoSchedule.file_url;
                if (videoUrlValue.startsWith(BASE_VIDEO_URL)) {
                    videoUrlValue = videoUrlValue.substring(BASE_VIDEO_URL.length);
                }
                setVideoUrl(videoUrlValue);
                const videoStartDateTime = new Date(videoSchedule.start_datetime);
                const videoEndDateTime = new Date(videoSchedule.end_datetime);
                const duration = Math.ceil((videoEndDateTime.getTime() - videoStartDateTime.getTime()) / 1000);
                setVideoDuration(duration);
            }
            
            // Load Image 3
            if (image3Schedule) {
                const startDate = new Date(image3Schedule.start_datetime);
                setImageAfterStartDate(startDate.toISOString().split('T')[0]);
                setImageAfterStartTime(startDate.toTimeString().slice(0, 5));
                const endDate = new Date(image3Schedule.end_datetime);
                setImageAfterEndDate(endDate.toISOString().split('T')[0]);
                setImageAfterEndTime(endDate.toTimeString().slice(0, 5));
                setSelectedImageAfter(null);
            }
            
            // Load Image 4
            if (image4Schedule) {
                const startDate = new Date(image4Schedule.start_datetime);
                setImage4StartDate(startDate.toISOString().split('T')[0]);
                setImage4StartTime(startDate.toTimeString().slice(0, 5));
                const endDate = new Date(image4Schedule.end_datetime);
                setImage4EndDate(endDate.toISOString().split('T')[0]);
                setImage4EndTime(endDate.toTimeString().slice(0, 5));
                setSelectedImage4(null);
            }
            
            setShowForm(true);
            setTimeout(() => {
                document.querySelector('.settings-form')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    // Handle delete
    const handleDelete = async (schedule: LiveStreamSchedule) => {
        if (!confirm(`هل أنت متأكد من حذف هذا البث؟\nالصف: ${grades.find(g => g.id === schedule.grade)?.name}\nالمادة: ${schedule.subject_name}\nالمعلم: ${schedule.teacher_name}`)) {
            return;
        }

        setLoadingSchedules(true);
        try {
            const success = await deleteLiveStreamSchedule(schedule.id);
            if (success) {
                setMessage({ type: 'success', text: 'تم حذف البث بنجاح' });
                const allSchedules = await getAllLiveStreamSchedules();
                setSchedules(allSchedules);
            } else {
                setMessage({ type: 'error', text: 'فشل حذف البث' });
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' });
        } finally {
            setLoadingSchedules(false);
        }
    };

    // Format date/time for display
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getGradeName = (gradeId: number) => {
        return grades.find(g => g.id === gradeId)?.name || `الصف ${gradeId}`;
    };

    return (
        <Layout showFooter={false}>
            <div className="live-stream-settings-screen">
                <BackButton />
                
                <div className="settings-header">
                    <h1 className="settings-title">إعدادات البث المباشر</h1>
                    <p className="settings-subtitle">قم بإعداد الصورة والفيديو للبث المباشر</p>
                </div>

                {/* Existing Schedules List */}
                <div className="schedules-list-section">
                    <div className="section-header-actions">
                        <h2 className="section-title">البثوث الموجودة</h2>
                        <button
                            type="button"
                            className="toggle-form-btn"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? 'إخفاء النموذج' : 'إظهار النموذج'}
                        </button>
                    </div>
                    
                    {loadingSchedules ? (
                        <div className="loading-schedules">
                            <p>جاري التحميل...</p>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="no-schedules">
                            <p>لا توجد بثوث مجدولة حالياً</p>
                        </div>
                    ) : (
                        <div className="schedules-list">
                            {Object.entries(schedulesByGrade).map(([gradeId, gradeSchedules]) => (
                                <div key={gradeId} className="grade-schedules-group">
                                    <h3 className="grade-group-title">{getGradeName(Number(gradeId))}</h3>
                                    <div className="schedules-cards">
                                        {gradeSchedules.map((schedule) => (
                                            <div key={schedule.id} className="schedule-card-item">
                                                <div className="schedule-card-header">
                                                    <div className="schedule-type-badge">
                                                        {schedule.content_type === 'image' ? '🖼️ صورة' : '🎥 فيديو'}
                                                    </div>
                                                    <div className={`schedule-status-badge status-${schedule.status}`}>
                                                        {schedule.status === 'scheduled' ? '⏰ مجدول' :
                                                         schedule.status === 'active' ? '🔴 نشط' :
                                                         schedule.status === 'completed' ? '✅ مكتمل' : '❌ ملغي'}
                                                    </div>
                                                </div>
                                                <div className="schedule-card-content">
                                                    <div className="schedule-info-row">
                                                        <span className="info-label">المادة:</span>
                                                        <span className="info-value">{schedule.subject_name}</span>
                                                    </div>
                                                    <div className="schedule-info-row">
                                                        <span className="info-label">المعلم:</span>
                                                        <span className="info-value">{schedule.teacher_name}</span>
                                                    </div>
                                                    <div className="schedule-info-row">
                                                        <span className="info-label">البدء:</span>
                                                        <span className="info-value">{formatDateTime(schedule.start_datetime)}</span>
                                                    </div>
                                                    <div className="schedule-info-row">
                                                        <span className="info-label">الانتهاء:</span>
                                                        <span className="info-value">{formatDateTime(schedule.end_datetime)}</span>
                                                    </div>
                                                    {schedule.content_title && (
                                                        <div className="schedule-info-row">
                                                            <span className="info-label">العنوان:</span>
                                                            <span className="info-value">{schedule.content_title}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="schedule-card-actions">
                                                    <button
                                                        type="button"
                                                        className="edit-btn"
                                                        onClick={() => handleEdit(schedule)}
                                                    >
                                                        ✏️ تعديل
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={() => handleDelete(schedule)}
                                                    >
                                                        🗑️ حذف
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showForm && (
                <div className="settings-form">
                    {editingSchedule && (
                        <div className="editing-notice">
                            <p>⚠️ أنت تقوم بتعديل بث موجود - سيتم تحديث البيانات عند الحفظ</p>
                            <button
                                type="button"
                                className="cancel-edit-btn"
                                onClick={() => {
                                    setEditingSchedule(null);
                                    setSelectedGrade(null);
                                    setSubjectName('');
                                    setTeacherName('');
                                    setSelectedImage1(null);
                                    setImage1StartDate('');
                                    setImage1StartTime('');
                                    setImage1EndDate('');
                                    setImage1EndTime('');
                                    setSelectedImage(null);
                                    setImageStartDate('');
                                    setImageStartTime('');
                                    setImageEndDate('');
                                    setImageEndTime('');
                                    setVideoUrl('');
                                    setVideoDuration(null);
                                    setSelectedImageAfter(null);
                                    setImageAfterStartDate('');
                                    setImageAfterStartTime('');
                                    setImageAfterEndDate('');
                                    setImageAfterEndTime('');
                                    setSelectedImage4(null);
                                    setImage4StartDate('');
                                    setImage4StartTime('');
                                    setImage4EndDate('');
                                    setImage4EndTime('');
                                    if (fileInputRef1.current) {
                                        fileInputRef1.current.value = '';
                                    }
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                    }
                                    if (fileInputRefAfter.current) {
                                        fileInputRefAfter.current.value = '';
                                    }
                                    if (fileInputRef4.current) {
                                        fileInputRef4.current.value = '';
                                    }
                                }}
                            >
                                إلغاء التعديل
                            </button>
                        </div>
                    )}
                    {/* Grade Selection */}
                    <div className="form-section">
                        <label className="form-label">الصف الدراسي</label>
                        <div className="grade-grid">
                            {grades.map((grade) => (
                                <button
                                    key={grade.id}
                                    type="button"
                                    className={`grade-btn ${selectedGrade === grade.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedGrade(grade.id);
                                        setSubjectName('');
                                    }}
                                >
                                    {grade.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject Selection */}
                    {selectedGrade && (
                        <div className="form-section">
                            <label className="form-label">المادة</label>
                            {loadingSubjects ? (
                                <p>جاري التحميل...</p>
                            ) : (
                                <select
                                    className="form-select"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
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

                    {/* Teacher Name */}
                    <div className="form-section">
                        <label className="form-label">اسم المعلم</label>
                        <input
                            type="text"
                            className="form-input"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            placeholder="أدخل اسم المعلم"
                        />
                    </div>

                    {/* Image 1 Section */}
                    <div className="form-section image-section">
                        <h2 className="section-title">الصورة الأولى</h2>
                        
                        <div className="form-section">
                            <label className="form-label">رفع الصورة الأولى</label>
                            <div
                                className={`file-drop-zone ${selectedImage1 ? 'has-file' : ''}`}
                                onClick={() => fileInputRef1.current?.click()}
                            >
                                <input
                                    ref={fileInputRef1}
                                    type="file"
                                    className="file-input-hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleFileSelect1(file);
                                        }
                                    }}
                                    disabled={uploading}
                                />
                                {selectedImage1 ? (
                                    <div className="file-preview">
                                        <div className="file-info">
                                            <p className="file-name">{selectedImage1.name}</p>
                                            <p className="file-size">{formatFileSize(selectedImage1.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-placeholder">
                                        <p className="upload-text">انقر لاختيار الصورة الأولى</p>
                                        <p className="upload-hint">JPG, PNG, GIF, WEBP (حتى 10 ميجابايت)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="datetime-row">
                            <div className="datetime-group">
                                <label className="form-label">موعد بدء الصورة الأولى</label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={image1StartDate}
                                        onChange={(e) => setImage1StartDate(e.target.value)}
                                        min={defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={image1StartTime}
                                        onChange={(e) => setImage1StartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="datetime-group">
                                <label className="form-label">موعد انتهاء الصورة الأولى</label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={image1EndDate}
                                        onChange={(e) => setImage1EndDate(e.target.value)}
                                        min={image1StartDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={image1EndTime}
                                        onChange={(e) => setImage1EndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image 2 Section */}
                    <div className="form-section image-section">
                        <h2 className="section-title">الصورة الثانية (قبل الفيديو)</h2>
                        
                        <div className="form-section">
                            <label className="form-label">رفع الصورة الثانية</label>
                            <div
                                className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${selectedImage ? 'has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="file-input-hidden"
                                    accept="image/*"
                                    onChange={handleFileInputChange}
                                    disabled={uploading}
                                />
                                {selectedImage ? (
                                    <div className="file-preview">
                                        <div className="file-info">
                                            <p className="file-name">{selectedImage.name}</p>
                                            <p className="file-size">{formatFileSize(selectedImage.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-placeholder">
                                        <p className="upload-text">اسحب الصورة هنا أو انقر للاختيار</p>
                                        <p className="upload-hint">JPG, PNG, GIF, WEBP (حتى 10 ميجابايت)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="datetime-row">
                            <div className="datetime-group">
                                <label className="form-label">
                                    موعد بدء الصورة الثانية
                                    <span className="hint-text"> (يحدد تلقائياً عند انتهاء الصورة الأولى)</span>
                                </label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={imageStartDate}
                                        onChange={(e) => setImageStartDate(e.target.value)}
                                        min={defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={imageStartTime}
                                        onChange={(e) => setImageStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="datetime-group">
                                <label className="form-label">موعد انتهاء الصورة الثانية</label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={imageEndDate}
                                        onChange={(e) => setImageEndDate(e.target.value)}
                                        min={imageStartDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={imageEndTime}
                                        onChange={(e) => setImageEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Video Section */}
                    <div className="form-section video-section">
                        <h2 className="section-title">الفيديو</h2>
                        
                        <div className="form-section">
                            <label className="form-label">
                                رابط الفيديو
                                <span className="hint-text"> (المسار الثابت: https://northelite0.com/)</span>
                            </label>
                            <div className="url-input-group">
                                <span className="url-prefix">{BASE_VIDEO_URL}</span>
                                <input
                                    type="text"
                                    className="form-input url-input"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="أدخل باقي المسار (مثال: videos/live.mp4)"
                                />
                            </div>
                            {videoUrl && (
                                <p className="url-preview">
                                    الرابط الكامل: <strong>{BASE_VIDEO_URL}{videoUrl}</strong>
                                </p>
                            )}
                        </div>

                        <div className="form-section">
                            <label className="form-label">
                                موعد بدء الفيديو
                                <span className="hint-text"> (يحدد تلقائياً بناءً على موعد انتهاء الصورة الثانية)</span>
                            </label>
                            <div className="datetime-display">
                                {imageEndDate && imageEndTime ? (
                                    <div className="auto-datetime">
                                        <span className="auto-label">سيبدأ تلقائياً في:</span>
                                        <span className="auto-value">
                                            {new Date(`${imageEndDate}T${imageEndTime}`).toLocaleString('ar-SA', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="no-date-hint">حدد موعد انتهاء الصورة أولاً</p>
                                )}
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">
                                موعد انتهاء الفيديو
                                <span className="hint-text"> (يتم حسابه تلقائياً بناءً على مدة الفيديو)</span>
                            </label>
                            <div className="datetime-display">
                                {videoDuration && imageEndDate && imageEndTime ? (
                                    <div className="auto-datetime">
                                        <span className="auto-label">مدة الفيديو:</span>
                                        <span className="auto-value">
                                            {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                                        </span>
                                        <span className="auto-label" style={{ marginTop: '0.5rem' }}>سيبدأ في:</span>
                                        <span className="auto-value">
                                            {new Date(`${imageEndDate}T${imageEndTime}`).toLocaleString('ar-SA', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <span className="auto-label" style={{ marginTop: '0.5rem' }}>سينتهي في:</span>
                                        <span className="auto-value">
                                            {new Date(new Date(`${imageEndDate}T${imageEndTime}`).getTime() + videoDuration * 1000).toLocaleString('ar-SA', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                ) : videoDurationLoading ? (
                                    <p className="no-date-hint">جاري حساب مدة الفيديو...</p>
                                ) : (
                                    <p className="no-date-hint">أدخل رابط الفيديو أولاً</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Image 3 Section */}
                    <div className="form-section image-section">
                        <h2 className="section-title">الصورة الثالثة (بعد الفيديو)</h2>
                        
                        <div className="form-section">
                            <label className="form-label">رفع الصورة الثالثة</label>
                            <div
                                className={`file-drop-zone ${selectedImageAfter ? 'has-file' : ''}`}
                                onClick={() => fileInputRefAfter.current?.click()}
                            >
                                <input
                                    ref={fileInputRefAfter}
                                    type="file"
                                    className="file-input-hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleFileSelectAfter(file);
                                        }
                                    }}
                                    disabled={uploading}
                                />
                                {selectedImageAfter ? (
                                    <div className="file-preview">
                                        <div className="file-info">
                                            <p className="file-name">{selectedImageAfter.name}</p>
                                            <p className="file-size">{formatFileSize(selectedImageAfter.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-placeholder">
                                        <p className="upload-text">انقر لاختيار الصورة</p>
                                        <p className="upload-hint">JPG, PNG, GIF, WEBP (حتى 10 ميجابايت)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="datetime-row">
                            <div className="datetime-group">
                                <label className="form-label">
                                    موعد بدء الصورة الثالثة
                                    <span className="hint-text"> (يحدد تلقائياً عند انتهاء الفيديو)</span>
                                </label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={imageAfterStartDate}
                                        onChange={(e) => setImageAfterStartDate(e.target.value)}
                                        min={imageEndDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={imageAfterStartTime}
                                        onChange={(e) => setImageAfterStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="datetime-group">
                                <label className="form-label">موعد انتهاء الصورة الثالثة</label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={imageAfterEndDate}
                                        onChange={(e) => setImageAfterEndDate(e.target.value)}
                                        min={imageAfterStartDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={imageAfterEndTime}
                                        onChange={(e) => setImageAfterEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image 4 Section */}
                    <div className="form-section image-section">
                        <h2 className="section-title">الصورة الرابعة (بعد صورة 3)</h2>
                        
                        <div className="form-section">
                            <label className="form-label">رفع الصورة الرابعة</label>
                            <div
                                className={`file-drop-zone ${selectedImage4 ? 'has-file' : ''}`}
                                onClick={() => fileInputRef4.current?.click()}
                            >
                                <input
                                    ref={fileInputRef4}
                                    type="file"
                                    className="file-input-hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleFileSelect4(file);
                                        }
                                    }}
                                    disabled={uploading}
                                />
                                {selectedImage4 ? (
                                    <div className="file-preview">
                                        <div className="file-info">
                                            <p className="file-name">{selectedImage4.name}</p>
                                            <p className="file-size">{formatFileSize(selectedImage4.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-placeholder">
                                        <p className="upload-text">انقر لاختيار الصورة الرابعة</p>
                                        <p className="upload-hint">JPG, PNG, GIF, WEBP (حتى 10 ميجابايت)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="datetime-row">
                            <div className="datetime-group">
                                <label className="form-label">
                                    موعد بدء الصورة الرابعة
                                    <span className="hint-text"> (يحدد تلقائياً عند انتهاء الصورة الثالثة)</span>
                                </label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={image4StartDate}
                                        onChange={(e) => setImage4StartDate(e.target.value)}
                                        min={imageAfterEndDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={image4StartTime}
                                        onChange={(e) => setImage4StartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="datetime-group">
                                <label className="form-label">موعد انتهاء الصورة الرابعة</label>
                                <div className="datetime-inputs">
                                    <input
                                        type="date"
                                        className="form-input date-input"
                                        value={image4EndDate}
                                        onChange={(e) => setImage4EndDate(e.target.value)}
                                        min={image4StartDate || defaultDate}
                                    />
                                    <input
                                        type="time"
                                        className="form-input time-input"
                                        value={image4EndTime}
                                        onChange={(e) => setImage4EndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Progress */}
                    {uploading && (
                        <div className="upload-progress">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="progress-text">{uploadProgress}%</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="form-actions">
                        <Button
                            onClick={handleSubmit}
                            disabled={uploading}
                            className="submit-button"
                        >
                            {uploading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </Button>
                    </div>
                </div>
                )}
            </div>
        </Layout>
    );
}
