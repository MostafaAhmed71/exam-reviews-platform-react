import { supabase } from '../lib/supabase';
import type { UploadedMaterial, UploadResponse, ContentType } from '../types/database.types';

// Configuration - يرجى تحديث هذا الرابط برابط upload.php الخاص بك
const UPLOAD_API_URL = 'https://northelite.tech/upload.php';
const DELETE_API_URL = 'https://northelite.tech/delete.php';
const BASE_FILE_URL = 'https://northelite.tech/'; // Base URL for manually uploaded files

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Allowed file types
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
];

const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
];

// Max file sizes
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB (increased for large videos)

/**
 * Validate file before upload
 */
export function validateFile(file: File, contentType?: string): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: 'الرجاء اختيار ملف' };
    }

    // Determine allowed types and max size based on content type
    let allowedTypes: string[] = [];
    let maxSize = MAX_DOCUMENT_SIZE;
    let typeName = '';

    if (contentType === 'schedule') {
        allowedTypes = ALLOWED_IMAGE_TYPES;
        maxSize = MAX_IMAGE_SIZE;
        typeName = 'صورة';
    } else if (contentType === 'videos') {
        allowedTypes = ALLOWED_VIDEO_TYPES;
        maxSize = MAX_VIDEO_SIZE;
        typeName = 'فيديو';
    } else {
        allowedTypes = ALLOWED_DOCUMENT_TYPES;
        maxSize = MAX_DOCUMENT_SIZE;
        typeName = 'ملف';
    }

    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return { valid: false, error: `حجم ${typeName} كبير جداً (الحد الأقصى ${maxSizeMB} ميجابايت)` };
    }

    // Check file type
    const isValidType = allowedTypes.includes(file.type) || 
                       // Fallback: check by extension
                       (file.name.match(/\.(pdf|doc|docx|ppt|pptx)$/i) && contentType !== 'schedule' && contentType !== 'videos') ||
                       (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) && contentType === 'schedule') ||
                       (file.name.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) && contentType === 'videos');

    if (!isValidType) {
        let errorMsg = `نوع ${typeName} غير مدعوم. `;
        if (contentType === 'schedule') {
            errorMsg += 'يجب أن تكون الصورة بصيغة: JPG, PNG, GIF, WEBP';
        } else if (contentType === 'videos') {
            errorMsg += 'يجب أن يكون الفيديو بصيغة: MP4, WebM, OGG';
        } else {
            errorMsg += 'يجب أن يكون الملف بصيغة: PDF, Word, PowerPoint';
        }
        return { valid: false, error: errorMsg };
    }

    return { valid: true };
}

/**
 * Upload file in chunks to avoid timeout issues
 * NOTE: Currently not used - single file upload with 1 hour timeout is used instead
 * Kept for backward compatibility and future use
 */
export async function uploadFileInChunks(
    file: File,
    grade: number,
    subjectName: string,
    contentType: ContentType,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunkId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`📦 Starting chunked upload: ${totalChunks} chunks, chunk ID: ${chunkId}`);
    
    let finalResponse: UploadResponse | null = null;
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        
        // Use Blob.slice() which is binary-safe for File objects
        // Ensure we're using the correct MIME type
        const chunk = file.slice(start, end, file.type || 'application/octet-stream');
        
        // Verify chunk size
        if (chunk.size === 0 && chunkIndex < totalChunks - 1) {
            throw new Error(`الجزء ${chunkIndex + 1} فارغ`);
        }
        
        const formData = new FormData();
        // Create a new File object to ensure proper binary handling
        const chunkFile = new File([chunk], file.name, { type: file.type || 'application/octet-stream' });
        formData.append('chunk', chunkFile);
        formData.append('chunk_index', chunkIndex.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('chunk_id', chunkId);
        formData.append('file_name', file.name);
        formData.append('file_size', file.size.toString());
        formData.append('grade', grade.toString());
        formData.append('subject', subjectName);
        formData.append('content_type', contentType);
        
        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    // Calculate overall progress
                    const chunkProgress = (chunkIndex / totalChunks) * 100;
                    const currentChunkProgress = (e.loaded / e.total) * (100 / totalChunks);
                    const overallProgress = Math.round(chunkProgress + currentChunkProgress);
                    onProgress(overallProgress);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
                            
                            // If this is the last chunk, save the final response
                            if (chunkIndex === totalChunks - 1) {
                                finalResponse = {
                                    success: true,
                                    message: response.message || 'تم رفع الملف بنجاح',
                                    fileUrl: response.fileUrl || ''
                                };
                            }
                            
                            resolve();
                        } else {
                            reject(new Error(response.message || response.error || 'فشل رفع الجزء'));
                        }
                    } catch (error) {
                        reject(new Error('خطأ في قراءة استجابة السيرفر'));
                    }
                } else {
                    reject(new Error(`خطأ في الرفع: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('فشل الاتصال بالسيرفر أثناء رفع الجزء'));
            });
            
            xhr.addEventListener('timeout', () => {
                reject(new Error('انتهت مهلة رفع الجزء'));
            });
            
            xhr.open('POST', UPLOAD_API_URL, true);
            xhr.timeout = 60000; // 60 seconds per chunk
            
            try {
                xhr.send(formData);
            } catch (error) {
                reject(new Error('خطأ في إرسال الجزء'));
            }
        });
    }
    
    // Return the final response from the last chunk
    if (finalResponse) {
        return finalResponse;
    }
    
    // Fallback if something went wrong
    return {
        success: false,
        message: 'فشل',
        error: 'لم يتم استلام رابط الملف من السيرفر'
    };
}

/**
 * Upload file to Hostinger via upload.php
 * Single file upload with 1 hour timeout for large files
 */
export interface UploadProgressInfo {
    percentage: number;
    loaded: number;
    total: number;
}

export async function uploadFileToHostinger(
    file: File,
    grade: number,
    subjectName: string,
    contentType: ContentType,
    onProgress?: (progress: number | UploadProgressInfo) => void
): Promise<UploadResponse> {
    console.log('🚀 ========== بدء رفع الملف ==========');
    console.log('📁 اسم الملف:', file.name);
    console.log('📦 حجم الملف:', formatBytes(file.size));
    console.log('🎓 الصف:', grade);
    console.log('📚 المادة:', subjectName);
    console.log('📋 نوع المحتوى:', contentType);
    console.log('🚀 ====================================');

    // Always use single file upload (no chunking)
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('grade', grade.toString());
        formData.append('subject', subjectName);
        formData.append('content_type', contentType);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            // Track upload progress with detailed information
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress && typeof onProgress === 'function') {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    const loadedBytes = e.loaded;
                    const totalBytes = e.total;
                    
                    // Detailed console logs (only every 10% to reduce console spam)
                    if (progress % 10 === 0 || progress === 100) {
                        console.log(`📤 Upload Progress: ${progress}% (${formatBytes(loadedBytes)} / ${formatBytes(totalBytes)})`);
                    }
                    
                    // Pass progress as object with detailed info
                    const progressInfo: UploadProgressInfo = {
                        percentage: progress,
                        loaded: loadedBytes,
                        total: totalBytes
                    };
                    onProgress(progressInfo);
                }
            });

            xhr.addEventListener('load', () => {
                console.log('📥 ========== استجابة السيرفر ==========');
                console.log('📥 حالة الاستجابة:', xhr.status);
                console.log('📥 محتوى الاستجابة:', xhr.responseText);
                console.log('📥 رؤوس الاستجابة:', xhr.getAllResponseHeaders());
                console.log('📥 ======================================');

                // Handle all 2xx status codes as success
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        // Check if response is empty
                        if (!xhr.responseText || xhr.responseText.trim() === '') {
                            console.error('❌ ========== استجابة فارغة ==========');
                            console.error('❌ حجم الملف:', formatBytes(file.size));
                            console.error('❌ اسم الملف:', file.name);
                            console.error('❌ ======================================');
                            const fileSizeMB = Math.round(file.size / (1024 * 1024));
                            reject({
                                success: false,
                                message: 'فشل',
                                error: `السيرفر لم يرسل استجابة بعد رفع الفيديو (${fileSizeMB} ميجابايت). قد يكون السبب: إعدادات PHP لا تسمح بملفات كبيرة (تحقق من upload_max_filesize و post_max_size)، أو انتهت مهلة التنفيذ (max_execution_time)، أو مشكلة في الذاكرة (memory_limit). يرجى التحقق من إعدادات السيرفر.`,
                            });
                            return;
                        }
                        
                        const response = JSON.parse(xhr.responseText);
                        console.log('✅ ========== نجح الرفع ==========');
                        console.log('✅ الاستجابة:', response);
                        if (response.fileUrl) {
                            console.log('🔗 رابط الملف:', response.fileUrl);
                        }
                        console.log('📦 حجم الملف المرفوع:', formatBytes(file.size));
                        console.log('✅ =================================');
                        resolve(response);
                    } catch (error) {
                        console.error('❌ ========== خطأ في قراءة الاستجابة ==========');
                        console.error('❌ الخطأ:', error);
                        console.error('❌ نص الاستجابة:', xhr.responseText);
                        console.error('❌ حجم الملف:', formatBytes(file.size));
                        console.error('❌ ===========================================');
                        reject({
                            success: false,
                            message: 'فشل',
                            error: 'خطأ في قراءة استجابة السيرفر: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'),
                        });
                    }
                } else {
                    console.error('❌ ========== فشل الرفع ==========');
                    console.error('❌ حالة الاستجابة:', xhr.status);
                    console.error('❌ حجم الملف:', formatBytes(file.size));
                    console.error('❌ اسم الملف:', file.name);
                    let errorMsg = `خطأ في الرفع: ${xhr.status}`;
                    
                    // Try to parse error response
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.message || errorResponse.error) {
                            errorMsg = errorResponse.message || errorResponse.error;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                    
                    console.error('❌ رسالة الخطأ:', errorMsg);
                    console.error('❌ =================================');
                    reject({
                        success: false,
                        message: 'فشل',
                        error: errorMsg,
                    });
                }
            });

            xhr.addEventListener('error', () => {
                console.error('❌ ========== خطأ في الاتصال ==========');
                console.error('❌ حالة الاتصال:', xhr.readyState);
                console.error('❌ حالة الاستجابة:', xhr.status);
                console.error('❌ حجم الملف:', formatBytes(file.size));
                console.error('❌ اسم الملف:', file.name);
                console.error('❌ ======================================');
                const fileSizeMB = Math.round(file.size / (1024 * 1024));
                reject({
                    success: false,
                    message: 'فشل',
                    error: `فشل الاتصال بالسيرفر أثناء رفع الفيديو (${fileSizeMB} ميجابايت). قد يكون السبب: اتصال بطيء، انقطاع الشبكة، أو مشكلة في السيرفر. يرجى التحقق من الاتصال والمحاولة مرة أخرى.`,
                });
            });
            
            // Handle loadend event (fires after load, error, or abort)
            xhr.addEventListener('loadend', () => {
                console.log('📋 ========== انتهى الطلب ==========');
                console.log('📋 الحالة:', xhr.status);
                console.log('📋 حالة الاتصال:', xhr.readyState);
                console.log('📋 =================================');
            });

            console.log('📤 ========== إرسال الطلب ==========');
            console.log('📤 رابط السيرفر:', UPLOAD_API_URL);
            console.log('📤 طريقة الطلب: POST');
            console.log('📤 مفاتيح FormData:', Array.from(formData.keys()));
            console.log('📤 حجم الملف:', formatBytes(file.size));
            console.log('📤 =================================');
            
            // Open POST request (must be async)
            xhr.open('POST', UPLOAD_API_URL, true);
            
            // Set timeout to 1 hour (3600000ms = 60 minutes) for large video uploads
            // This allows uploading very large files without chunking
            xhr.timeout = 3600000;
            
            // Set request headers (important for file uploads)
            // Note: Don't set Content-Type header for FormData - browser will set it automatically with boundary
            // Note: X-Requested-With header removed to avoid CORS preflight issues
            
            // Verify the request method before sending
            console.log('✅ Request opened successfully as POST');
            
            xhr.addEventListener('timeout', () => {
                console.error('❌ ========== انتهت مهلة الرفع ==========');
                console.error('❌ حجم الملف:', formatBytes(file.size));
                console.error('❌ اسم الملف:', file.name);
                console.error('⏱️ المهلة: ساعة واحدة (3600 ثانية)');
                console.error('❌ ======================================');
                const fileSizeMB = Math.round(file.size / (1024 * 1024));
                reject({
                    success: false,
                    message: 'فشل',
                    error: `انتهت مهلة الرفع (ساعة واحدة). حجم الفيديو: ${fileSizeMB} ميجابايت. يرجى التحقق من سرعة الاتصال أو تقليل حجم الفيديو. يمكنك ضغط الفيديو باستخدام أدوات مثل HandBrake أو FFmpeg.`,
                });
            });
            
            // Send FormData
            try {
                xhr.send(formData);
                console.log('📤 FormData sent successfully');
            } catch (error) {
                console.error('❌ Error sending request:', error);
                reject({
                    success: false,
                    message: 'فشل',
                    error: 'خطأ في إرسال الطلب: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'),
                });
            }
        });
    } catch (error) {
        console.error('❌ Exception during upload:', error);
        return {
            success: false,
            message: 'فشل',
            error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        };
    }
}

/**
 * Save file URL to Supabase
 */
export async function saveFileUrlToSupabase(
    material: Omit<UploadedMaterial, 'id' | 'uploaded_at'>
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase غير متصل' };
    }

    try {
        const { error } = await supabase
            .from('uploaded_materials')
            .insert([
                {
                    stage: material.stage,
                    grade: material.grade,
                    subject_name: material.subject_name,
                    content_type: material.content_type,
                    review_type: material.review_type || (material.content_type === 'solved' || material.content_type === 'unsolved' ? material.content_type : undefined),
                    file_name: material.file_name,
                    file_url: material.file_url,
                    file_size: material.file_size,
                    video_title: material.video_title,
                    video_description: material.video_description,
                    quiz_title: material.quiz_title,
                    quiz_description: material.quiz_description,
                    quiz_url: material.quiz_url,
                    teacher_whatsapp: material.teacher_whatsapp,
                    display_order:
                        material.display_order !== undefined &&
                        material.display_order !== null
                            ? Math.max(0, Math.floor(Number(material.display_order)))
                            : 0,
                    uploaded_at: new Date().toISOString(),
                },
            ]);

        if (error) {
            console.error('Supabase error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Save to Supabase error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حفظ البيانات',
        };
    }
}

/**
 * Complete upload process: upload file to Hostinger and save URL to Supabase
 */
export async function uploadMaterial(
    file: File | null,
    stage: 'middle' | 'high',
    grade: number,
    subjectName: string,
    contentType: ContentType,
    onProgress?: (progress: number | UploadProgressInfo) => void,
    additionalData?: {
        videoTitle?: string;
        videoDescription?: string;
        quizTitle?: string;
        quizDescription?: string;
        quizUrl?: string;
        teacherWhatsapp?: string;
        videoUrl?: string; // For YouTube links or direct video URLs
        fileUrl?: string; // For manual URL entry (file uploaded manually to Hostinger)
    }
): Promise<{ success: boolean; error?: string }> {
    // For schedule, videos, and electronic, file might be optional (URL-based)
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;

    if (file) {
        // Validate file
        const validation = validateFile(file, contentType);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        try {
            // Upload to Hostinger
            const uploadResponse = await uploadFileToHostinger(file, grade, subjectName || 'عام', contentType, onProgress);

            console.log('📦 Upload response:', uploadResponse);

            if (!uploadResponse.success) {
                return {
                    success: false,
                    error: uploadResponse.error || 'فشل رفع الملف',
                };
            }

            // Get file URL (server returns 'url' not 'fileUrl')
            fileUrl = uploadResponse.fileUrl || (uploadResponse as any).url;

            if (!fileUrl) {
                return {
                    success: false,
                    error: 'لم يتم استلام رابط الملف من السيرفر',
                };
            }

            fileName = file.name;
            fileSize = file.size;
        } catch (error) {
            console.error('❌ Upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'حدث خطأ أثناء الرفع',
            };
        }
    } else if (additionalData?.fileUrl) {
        // Manual URL entry - user uploaded file manually to Hostinger
        let inputUrl = additionalData.fileUrl.trim();
        
        // If URL doesn't start with http:// or https://, prepend BASE_FILE_URL
        if (inputUrl && !inputUrl.match(/^https?:\/\//i)) {
            // Remove leading slash if present
            if (inputUrl.startsWith('/')) {
                inputUrl = inputUrl.substring(1);
            }
            fileUrl = BASE_FILE_URL + inputUrl;
        } else {
            fileUrl = inputUrl;
        }
        
        // Extract filename from URL if possible
        try {
            const urlObj = new URL(fileUrl);
            const pathParts = urlObj.pathname.split('/');
            fileName = pathParts[pathParts.length - 1] || 'محتوى';
            // Remove query parameters if any
            if (fileName.includes('?')) {
                fileName = fileName.split('?')[0];
            }
        } catch (e) {
            // If URL parsing fails, try to extract from path directly
            const pathParts = inputUrl.split('/');
            fileName = pathParts[pathParts.length - 1] || 'محتوى';
        }
        fileSize = 0; // Size unknown for manual uploads
        console.log('📎 Using manual file URL:', fileUrl);
    } else if (contentType === 'electronic' && additionalData?.quizUrl) {
        // For electronic reviews, use quiz URL if provided
        fileUrl = additionalData.quizUrl;
        fileName = 'اختبار إلكتروني';
    } else if (contentType === 'videos' && additionalData?.videoUrl) {
        // For videos, file URL might be provided separately (YouTube link or direct URL)
        let inputUrl = additionalData.videoUrl.trim();
        
        // Check if it's a YouTube URL (don't modify YouTube URLs)
        if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
            fileUrl = inputUrl;
        } else {
            // If URL doesn't start with http:// or https://, prepend BASE_FILE_URL
            if (inputUrl && !inputUrl.match(/^https?:\/\//i)) {
                // Remove leading slash if present
                if (inputUrl.startsWith('/')) {
                    inputUrl = inputUrl.substring(1);
                }
                fileUrl = BASE_FILE_URL + inputUrl;
            } else {
                fileUrl = inputUrl;
            }
        }
        fileName = additionalData.videoTitle || 'فيديو';
    } else if (contentType === 'videos' && additionalData?.videoTitle) {
        // For videos without URL, use title as filename
        fileName = additionalData.videoTitle;
    }

    try {
        console.log('💾 Saving to Supabase:', fileUrl);

        // Save URL to Supabase
        const saveResponse = await saveFileUrlToSupabase({
            stage,
            grade,
            subject_name: subjectName,
            content_type: contentType,
            review_type: contentType === 'solved' || contentType === 'unsolved' ? contentType : undefined,
            file_name: fileName || 'محتوى',
            file_url: fileUrl || '',
            file_size: fileSize,
            video_title: additionalData?.videoTitle,
            video_description: additionalData?.videoDescription,
            quiz_title: additionalData?.quizTitle,
            quiz_description: additionalData?.quizDescription,
            quiz_url: additionalData?.quizUrl,
            teacher_whatsapp: additionalData?.teacherWhatsapp,
        });

        if (!saveResponse.success) {
            console.warn('⚠️ File uploaded but failed to save to Supabase:', saveResponse.error);
            return {
                success: false,
                error: `تم رفع الملف ولكن فشل حفظ الرابط: ${saveResponse.error}`,
            };
        }

        console.log('✅ Upload complete!');
        return { success: true };
    } catch (error) {
        console.error('❌ Upload material error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'حدث خطأ أثناء الرفع',
        };
    }
}

/**
 * Get recent uploads from Supabase
 */
export async function getRecentUploads(limit = 10): Promise<UploadedMaterial[]> {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('*')
            .order('uploaded_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching uploads:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching uploads:', error);
        return [];
    }
}

/**
 * Get all materials from Supabase
 */
export async function getAllMaterials(): Promise<UploadedMaterial[]> {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('*')
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching all materials:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching all materials:', error);
        return [];
    }
}

/**
 * Update material in Supabase
 */
export async function updateMaterial(
    id: number,
    updates: Partial<Omit<UploadedMaterial, 'id' | 'uploaded_at'>>
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase غير متصل' };
    }

    try {
        const { error } = await supabase
            .from('uploaded_materials')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating material:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating material:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في تحديث البيانات',
        };
    }
}

/**
 * Delete file from Hostinger server
 */
export async function deleteFileFromHostinger(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('🗑️ Attempting to delete file:', fileUrl);
        
        const formData = new FormData();
        formData.append('fileUrl', fileUrl);

        const response = await fetch(DELETE_API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Delete request failed:', response.status, errorText);
            return {
                success: false,
                error: `خطأ في حذف الملف: ${response.status}`,
            };
        }

        const result = await response.json();
        console.log('📥 Delete response:', result);
        
        if (!result.success) {
            // Check if the error is because file doesn't exist (which is fine)
            const errorMsg = result.error || result.message || '';
            if (errorMsg.includes('غير موجود') || errorMsg.includes('تم حذفه مسبقاً')) {
                console.log('ℹ️ File already deleted from server (this is fine)');
                return { success: true };
            }
            
            return {
                success: false,
                error: errorMsg || 'فشل حذف الملف من السيرفر',
            };
        }

        console.log('✅ File deleted successfully from Hostinger');
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting file from Hostinger:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'فشل الاتصال بالسيرفر لحذف الملف',
        };
    }
}

/**
 * Delete material from Supabase and Hostinger
 */
export async function deleteMaterial(id: number): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase غير متصل' };
    }

    try {
        // First, get the material to get the file URL
        const { data: material, error: fetchError } = await supabase
            .from('uploaded_materials')
            .select('file_url')
            .eq('id', id)
            .single();

        if (fetchError || !material) {
            console.error('Error fetching material:', fetchError);
            return { success: false, error: 'لم يتم العثور على المادة' };
        }

        // Delete file from Hostinger first
        if (material.file_url) {
            const deleteFileResult = await deleteFileFromHostinger(material.file_url);
            if (!deleteFileResult.success) {
                console.warn('⚠️ Failed to delete file from Hostinger:', deleteFileResult.error);
                // Continue to delete from database even if file deletion fails
                // (file might already be deleted or not exist)
            }
        }

        // Delete from Supabase
        console.log('🗑️ Deleting material from Supabase, ID:', id);
        const { data: deleteData, error } = await supabase
            .from('uploaded_materials')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('❌ Error deleting material from Supabase:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Material deleted from Supabase:', deleteData);
        
        // Check if deletion was successful
        // If deleteData is empty array or null, the material was not found (already deleted)
        // If deleteData has items, the deletion was successful
        if (deleteData && deleteData.length > 0) {
            console.log('✅ Material deletion confirmed - record was deleted');
            return { success: true };
        } else {
            // Material might have been already deleted or doesn't exist
            // This is still considered success since the goal is to ensure it's deleted
            console.log('ℹ️ Material not found (may have been already deleted)');
            return { success: true };
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حذف البيانات',
        };
    }
}