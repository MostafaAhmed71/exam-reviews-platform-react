<?php
/**
 * File Upload Handler for Educational Materials
 * This script receives files from the admin interface and saves them to Hostinger
 * 
 * Expected POST parameters:
 * - file: The uploaded file
 * - grade: Grade level (1-6)
 * - subject: Subject name in Arabic
 * 
 * Returns JSON response:
 * {
 *   "success": true/false,
 *   "message": "Success or error message",
 *   "fileUrl": "URL of uploaded file" (on success)
 * }
 */

// CRITICAL: Set CORS headers FIRST, before any other output or processing
// This ensures CORS headers are sent even if timeout or error occurs
// Note: These headers are also set in .htaccess at Apache level for maximum compatibility
// SECURITY: Only allow specific domains instead of "*" to prevent unauthorized access
if (!headers_sent()) {
    // Define allowed origins (whitelist)
    $allowedOrigins = [
        'https://mufid.northelite0.com',
        'https://www.mufid.northelite0.com',
        'https://northelite.tech',
        'https://www.northelite.tech',
        'https://review.northelite0.com',
        'https://momo01.netlify.app',
        'https://*.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is in whitelist
    if (!empty($origin) && in_array($origin, $allowedOrigins)) {
        header('Access-Control-Allow-Origin: ' . $origin, true);
    } elseif (!empty($origin) && (
        strpos($origin, 'northelite0.com') !== false ||
        strpos($origin, 'netlify.app') !== false ||
        strpos($origin, 'localhost') !== false ||
        strpos($origin, '127.0.0.1') !== false
    )) {
        // Allow any subdomain of northelite0.com, netlify.app, or localhost for development
        header('Access-Control-Allow-Origin: ' . $origin, true);
    } else {
        // For unknown origins, don't set CORS header (will be blocked by browser)
        // This is more secure than allowing all origins
    }
    
    header('Access-Control-Allow-Methods: POST, OPTIONS, GET, PUT, DELETE', true);
    header('Access-Control-Allow-Headers: Content-Type, Content-Length, X-Requested-With, Accept, Origin', true);
    header('Access-Control-Allow-Credentials: true', true);
    header('Access-Control-Max-Age: 86400', true);
    header('Access-Control-Expose-Headers: Content-Length', true);
}

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Increase PHP limits for large file uploads (especially videos)
// These settings ensure large files can be uploaded without timeout
set_time_limit(0); // No time limit for script execution
ini_set('max_execution_time', 0); // Unlimited execution time
ini_set('max_input_time', 0); // Unlimited input time
ini_set('memory_limit', '512M'); // Increase memory limit
ini_set('post_max_size', '500M'); // Maximum POST data size
ini_set('upload_max_filesize', '500M'); // Maximum upload file size

// Keep script running even if client disconnects
ignore_user_abort(true);

// Set response header to JSON
header('Content-Type: application/json; charset=utf-8');

// Send keep-alive header to prevent connection timeout
header('Connection: keep-alive');

// Register error handler to ensure CORS headers are sent even on errors
register_shutdown_function(function() {
    // Always set CORS headers in shutdown function (even if no error)
    if (!headers_sent()) {
        // Use same whitelist logic
        $allowedOrigins = [
            'https://mufid.northelite0.com',
            'https://www.mufid.northelite0.com',
            'https://northelite0.com',
            'https://www.northelite0.com',
            'https://review.northelite0.com',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (!empty($origin) && (in_array($origin, $allowedOrigins) || 
            strpos($origin, 'northelite0.com') !== false || 
            strpos($origin, 'localhost') !== false || 
            strpos($origin, '127.0.0.1') !== false)) {
            header('Access-Control-Allow-Origin: ' . $origin, true);
        }
        header('Access-Control-Allow-Methods: POST, OPTIONS, GET', true);
        header('Access-Control-Allow-Headers: Content-Type, Content-Length, X-Requested-With', true);
        header('Access-Control-Allow-Credentials: true', true);
        header('Content-Type: application/json; charset=utf-8', true);
    }
    
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // Ensure CORS headers are sent even on fatal errors
        if (!headers_sent()) {
            $allowedOrigins = [
                'https://mufid.northelite0.com',
                'https://www.mufid.northelite0.com',
                'https://northelite0.com',
                'https://www.northelite0.com',
                'https://review.northelite0.com',
                'http://localhost:5173',
                'http://localhost:3000',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:3000',
            ];
            
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if (!empty($origin) && (in_array($origin, $allowedOrigins) || 
                strpos($origin, 'northelite0.com') !== false || 
                strpos($origin, 'localhost') !== false || 
                strpos($origin, '127.0.0.1') !== false)) {
                header('Access-Control-Allow-Origin: ' . $origin, true);
            }
            header('Access-Control-Allow-Methods: POST, OPTIONS, GET', true);
            header('Access-Control-Allow-Headers: Content-Type, Content-Length, X-Requested-With', true);
            header('Content-Type: application/json; charset=utf-8', true);
        }
        echo json_encode([
            'success' => false,
            'message' => 'حدث خطأ في السيرفر أثناء معالجة الملف',
            'error' => 'Server error occurred'
        ], JSON_UNESCAPED_UNICODE);
    }
});

// Set error handler for non-fatal errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Log error but don't stop execution
    error_log("Upload error: $errstr in $errfile on line $errline");
    return false; // Let PHP handle the error normally
}, E_WARNING | E_NOTICE);

// Configuration
define('UPLOAD_DIR', __DIR__ . '/uploads/materials/');
define('CHUNK_DIR', __DIR__ . '/uploads/chunks/'); // Directory for temporary chunks
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500MB
define('CHUNK_SIZE', 5 * 1024 * 1024); // 5MB chunks - small enough to avoid timeout
define('ALLOWED_DOCUMENT_EXTENSIONS', ['pdf', 'doc', 'docx', 'ppt', 'pptx']);
define('ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('ALLOWED_VIDEO_EXTENSIONS', ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp']);
define('BASE_URL', 'https://northelite0.com/uploads/materials/');

/**
 * Send JSON response and exit
 */
function sendResponse($success, $message, $fileUrl = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($fileUrl) {
        $response['fileUrl'] = $fileUrl;
    } else if (!$success) {
        $response['error'] = $message;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Sanitize filename
 */
function sanitizeFilename($filename) {
    // Get file extension
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    // Get filename without extension
    $name = pathinfo($filename, PATHINFO_FILENAME);
    
    // Remove special characters and replace spaces with underscores
    $name = preg_replace('/[^a-zA-Z0-9\-_\u0600-\u06FF]/', '_', $name);
    
    // Add timestamp to make filename unique
    $timestamp = time();
    
    return $name . '_' . $timestamp . '.' . $ext;
}

/**
 * Handle chunked upload
 */
function handleChunkedUpload() {
    // Validate required parameters
    if (!isset($_POST['chunk_index']) || !isset($_POST['total_chunks']) || !isset($_POST['chunk_id']) || 
        !isset($_POST['file_name']) || !isset($_POST['file_size']) || !isset($_POST['grade']) || 
        !isset($_POST['subject']) || !isset($_FILES['chunk'])) {
        sendResponse(false, 'معاملات غير كاملة لرفع الجزء');
    }
    
    $chunkIndex = intval($_POST['chunk_index']);
    $totalChunks = intval($_POST['total_chunks']);
    $chunkId = trim($_POST['chunk_id']);
    $fileName = trim($_POST['file_name']);
    $fileSize = intval($_POST['file_size']);
    $grade = intval($_POST['grade']);
    $subject = trim($_POST['subject']);
    $reviewType = isset($_POST['content_type']) ? trim($_POST['content_type']) : 'solved';
    
    // Validate grade
    if ($grade < 1 || $grade > 12) {
        sendResponse(false, 'الصف يجب أن يكون بين 1 و 12');
    }
    
    // Validate chunk index
    if ($chunkIndex < 0 || $chunkIndex >= $totalChunks) {
        sendResponse(false, 'فهرس الجزء غير صحيح');
    }
    
    // Validate file size
    if ($fileSize > MAX_FILE_SIZE) {
        sendResponse(false, 'حجم الملف كبير جداً (الحد الأقصى 500 ميجابايت)');
    }
    
    // Validate file extension
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $allowedExtensions = array_merge(
        ALLOWED_DOCUMENT_EXTENSIONS,
        ALLOWED_VIDEO_EXTENSIONS,
        ALLOWED_IMAGE_EXTENSIONS
    );
    if (!in_array($fileExtension, $allowedExtensions)) {
        sendResponse(false, 'نوع الملف غير مدعوم');
    }
    
    // Create chunk directory
    if (!file_exists(CHUNK_DIR)) {
        if (!mkdir(CHUNK_DIR, 0755, true)) {
            sendResponse(false, 'فشل إنشاء مجلد الأجزاء');
        }
    }
    
    // Save chunk with binary-safe method
    $chunkPath = CHUNK_DIR . $chunkId . '_' . $chunkIndex;
    
    // Use copy instead of move_uploaded_file to ensure binary safety
    $tmpFile = $_FILES['chunk']['tmp_name'];
    if (!is_uploaded_file($tmpFile)) {
        sendResponse(false, 'ملف غير صالح للرفع');
    }
    
    // Copy file in binary mode to ensure no data corruption
    $sourceHandle = fopen($tmpFile, 'rb');
    if (!$sourceHandle) {
        sendResponse(false, 'فشل فتح الملف المؤقت');
    }
    
    $destHandle = fopen($chunkPath, 'wb');
    if (!$destHandle) {
        fclose($sourceHandle);
        sendResponse(false, 'فشل إنشاء ملف الجزء');
    }
    
    // Copy data in binary mode with buffer
    $bufferSize = 8192;
    $chunkSize = 0;
    while (!feof($sourceHandle)) {
        $data = fread($sourceHandle, $bufferSize);
        if ($data === false) {
            fclose($sourceHandle);
            fclose($destHandle);
            @unlink($chunkPath);
            sendResponse(false, 'خطأ في قراءة الملف المؤقت');
        }
        $bytesWritten = fwrite($destHandle, $data);
        if ($bytesWritten === false) {
            fclose($sourceHandle);
            fclose($destHandle);
            @unlink($chunkPath);
            sendResponse(false, 'خطأ في كتابة الجزء');
        }
        $chunkSize += $bytesWritten;
    }
    
    fclose($sourceHandle);
    fclose($destHandle);
    
    // Verify chunk size matches uploaded size
    $actualChunkSize = filesize($chunkPath);
    $uploadedSize = $_FILES['chunk']['size'];
    if ($actualChunkSize !== $uploadedSize || $chunkSize !== $uploadedSize) {
        @unlink($chunkPath);
        sendResponse(false, "حجم الجزء لا يتطابق. المتوقع: $uploadedSize، الفعلي: $actualChunkSize");
    }
    
    // Calculate and store chunk hash for verification
    $chunkHash = md5_file($chunkPath);
    file_put_contents($chunkPath . '.hash', $chunkHash);
    
    // If this is the last chunk, combine all chunks
    if ($chunkIndex === $totalChunks - 1) {
        // Create upload directory
        if (!file_exists(UPLOAD_DIR)) {
            if (!mkdir(UPLOAD_DIR, 0755, true)) {
                sendResponse(false, 'فشل إنشاء مجلد الرفع');
            }
        }
        
        // Create grade subdirectory
        $gradeDir = UPLOAD_DIR . 'grade_' . $grade . '/';
        if (!file_exists($gradeDir)) {
            if (!mkdir($gradeDir, 0755, true)) {
                sendResponse(false, 'فشل إنشاء مجلد الصف');
            }
        }
        
        // Sanitize filename
        $safeFilename = sanitizeFilename($fileName);
        $targetPath = $gradeDir . $safeFilename;
        
        // Combine all chunks using binary-safe methods with verification
        $targetFile = fopen($targetPath, 'wb');
        if (!$targetFile) {
            sendResponse(false, 'فشل إنشاء الملف النهائي');
        }
        
        $totalSize = 0;
        $bufferSize = 8192; // 8KB buffer for efficient copying
        
        // Verify all chunks exist before starting combination
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkFile = CHUNK_DIR . $chunkId . '_' . $i;
            if (!file_exists($chunkFile)) {
                fclose($targetFile);
                @unlink($targetPath);
                sendResponse(false, "الجزء $i مفقود قبل الدمج");
            }
        }
        
        // Combine chunks in order
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkFile = CHUNK_DIR . $chunkId . '_' . $i;
            $chunkHashFile = $chunkFile . '.hash';
            
            // Verify chunk hash if available
            if (file_exists($chunkHashFile)) {
                $storedHash = trim(file_get_contents($chunkHashFile));
                $calculatedHash = md5_file($chunkFile);
                if ($storedHash !== $calculatedHash) {
                    fclose($targetFile);
                    @unlink($targetPath);
                    sendResponse(false, "الجزء $i تالف (checksum mismatch)");
                }
            }
            
            // Open chunk file in binary read mode
            $chunkHandle = fopen($chunkFile, 'rb');
            if (!$chunkHandle) {
                fclose($targetFile);
                @unlink($targetPath);
                sendResponse(false, "فشل قراءة الجزء $i");
            }
            
            // Get chunk size for verification
            $chunkFileSize = filesize($chunkFile);
            $chunkBytesRead = 0;
            
            // Copy chunk data in binary mode using buffer
            // CRITICAL: Use stream_copy_to_stream for maximum binary safety
            // This ensures perfect binary data integrity for video files with audio
            $bytesCopied = stream_copy_to_stream($chunkHandle, $targetFile);
            
            if ($bytesCopied === false) {
                fclose($chunkHandle);
                fclose($targetFile);
                @unlink($targetPath);
                sendResponse(false, "فشل نسخ الجزء $i");
            }
            
            // Verify all bytes were copied
            if ($bytesCopied !== $chunkFileSize) {
                fclose($chunkHandle);
                fclose($targetFile);
                @unlink($targetPath);
                sendResponse(false, "الجزء $i لم يتم نسخه بالكامل. المتوقع: $chunkFileSize، المنسوخ: $bytesCopied");
            }
            
            $totalSize += $bytesCopied;
            $chunkBytesRead = $bytesCopied;
            
            fclose($chunkHandle);
            
            // Verify chunk was fully copied
            if ($chunkBytesRead !== $chunkFileSize) {
                fclose($targetFile);
                @unlink($targetPath);
                sendResponse(false, "الجزء $i لم يتم نسخه بالكامل. المتوقع: $chunkFileSize، المنسوخ: $chunkBytesRead");
            }
            
            // Delete chunk and hash file after combining
            @unlink($chunkFile);
            @unlink($chunkHashFile);
        }
        
        // Flush and close file
        fflush($targetFile);
        fclose($targetFile);
        
        // Force flush OS buffers
        clearstatcache(true, $targetPath);
        
        // Verify file size
        $actualFileSize = filesize($targetPath);
        if ($actualFileSize !== $fileSize || $totalSize !== $fileSize) {
            @unlink($targetPath);
            sendResponse(false, "حجم الملف النهائي لا يتطابق مع الحجم المتوقع. المتوقع: $fileSize، الفعلي: $actualFileSize، المجموع: $totalSize");
        }
        
        // Verify file exists and is readable
        if (!file_exists($targetPath) || !is_readable($targetPath)) {
            sendResponse(false, 'فشل التحقق من الملف النهائي');
        }
        
        // Verify file is not empty
        if ($actualFileSize === 0) {
            @unlink($targetPath);
            sendResponse(false, 'الملف النهائي فارغ');
        }
        
        // Set file permissions
        chmod($targetPath, 0644);
        
        // Final verification: check if file is a valid video file (basic check)
        $fileExtension = strtolower(pathinfo($targetPath, PATHINFO_EXTENSION));
        if (in_array($fileExtension, ALLOWED_VIDEO_EXTENSIONS)) {
            // For MP4 files, check for basic MP4 structure (ftyp box at start)
            if ($fileExtension === 'mp4') {
                $handle = fopen($targetPath, 'rb');
                if ($handle) {
                    $header = fread($handle, 8);
                    fclose($handle);
                    // MP4 files should start with size (4 bytes) + 'ftyp' (4 bytes)
                    if (strlen($header) >= 4 && substr($header, 4, 4) !== 'ftyp') {
                        // Not a critical error, but log it
                        error_log("Warning: MP4 file may be corrupted - missing ftyp box");
                    }
                }
            }
        }
        
        // Generate file URL
        $fileUrl = BASE_URL . 'grade_' . $grade . '/' . $safeFilename;
        
        // Log upload
        $logEntry = sprintf(
            "[%s] Grade: %d, Subject: %s, File: %s, Size: %d bytes (Chunked Upload)\n",
            date('Y-m-d H:i:s'),
            $grade,
            $subject,
            $safeFilename,
            $fileSize
        );
        file_put_contents(__DIR__ . '/upload_log.txt', $logEntry, FILE_APPEND);
        
        // Send success response
        sendResponse(true, 'تم رفع الملف بنجاح', $fileUrl);
    } else {
        // Not the last chunk, just confirm receipt
        sendResponse(true, "تم استلام الجزء " . ($chunkIndex + 1) . " من $totalChunks");
    }
}

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'طريقة الطلب غير صحيحة');
}

// Check if this is a chunked upload
$isChunkedUpload = isset($_POST['chunk_index']) && isset($_POST['total_chunks']) && isset($_POST['chunk_id']);

if ($isChunkedUpload) {
    // Handle chunked upload
    handleChunkedUpload();
    exit();
}

// Regular single file upload
// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
    sendResponse(false, 'لم يتم اختيار ملف');
}

// Check for upload errors
if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'الملف كبير جداً',
        UPLOAD_ERR_FORM_SIZE => 'الملف كبير جداً',
        UPLOAD_ERR_PARTIAL => 'تم رفع جزء من الملف فقط',
        UPLOAD_ERR_NO_TMP_DIR => 'مجلد مؤقت مفقود',
        UPLOAD_ERR_CANT_WRITE => 'فشل كتابة الملف',
        UPLOAD_ERR_EXTENSION => 'امتداد PHP أوقف رفع الملف'
    ];
    
    $message = $errorMessages[$_FILES['file']['error']] ?? 'خطأ غير معروف في رفع الملف';
    sendResponse(false, $message);
}

// Validate grade
if (!isset($_POST['grade']) || !is_numeric($_POST['grade'])) {
    sendResponse(false, 'الصف غير صحيح');
}

$grade = intval($_POST['grade']);
if ($grade < 1 || $grade > 12) {
    sendResponse(false, 'الصف يجب أن يكون بين 1 و 12');
}

// Validate subject
if (!isset($_POST['subject']) || empty(trim($_POST['subject']))) {
    sendResponse(false, 'اسم المادة مطلوب');
}

$subject = trim($_POST['subject']);

// Get review type (optional, defaults to 'solved' for backward compatibility)
// Check both 'review_type' (old) and 'content_type' (new) for compatibility
$reviewType = 'solved'; // default
if (isset($_POST['review_type']) && !empty(trim($_POST['review_type']))) {
    $reviewType = trim($_POST['review_type']);
} elseif (isset($_POST['content_type']) && !empty(trim($_POST['content_type']))) {
    $reviewType = trim($_POST['content_type']);
}

// Validate file size
if ($_FILES['file']['size'] > MAX_FILE_SIZE) {
    sendResponse(false, 'حجم الملف كبير جداً (الحد الأقصى 500 ميجابايت)');
}

// Validate file extension based on review type
$fileExtension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
if ($reviewType === 'schedule') {
    // For schedule, only allow images
    if (!in_array($fileExtension, ALLOWED_IMAGE_EXTENSIONS)) {
        sendResponse(false, 'نوع الملف غير مدعوم (الصور فقط: JPG, PNG, GIF, WEBP)');
    }
} elseif ($reviewType === 'videos') {
    // For videos, only allow video files
    if (!in_array($fileExtension, ALLOWED_VIDEO_EXTENSIONS)) {
        sendResponse(false, 'نوع الملف غير مدعوم (الفيديو فقط: MP4, AVI, MOV, WMV, FLV, WEBM, MKV, M4V, 3GP)');
    }
} else {
    // For solved/unsolved/electronic and any other type, allow documents, videos, and images
    $allowedExtensions = array_merge(
        ALLOWED_DOCUMENT_EXTENSIONS, 
        ALLOWED_VIDEO_EXTENSIONS, 
        ALLOWED_IMAGE_EXTENSIONS
    );
    if (!in_array($fileExtension, $allowedExtensions)) {
        sendResponse(false, 'نوع الملف غير مدعوم (PDF, Word, PowerPoint، الصور: JPG, PNG, GIF, WEBP، أو الفيديو: MP4, AVI, MOV, WMV, FLV, WEBM, MKV, M4V, 3GP)');
    }
}

// Create upload directory if it doesn't exist
if (!file_exists(UPLOAD_DIR)) {
    if (!mkdir(UPLOAD_DIR, 0755, true)) {
        sendResponse(false, 'فشل إنشاء مجلد الرفع');
    }
}

// Create grade subdirectory
$gradeDir = UPLOAD_DIR . 'grade_' . $grade . '/';
if (!file_exists($gradeDir)) {
    if (!mkdir($gradeDir, 0755, true)) {
        sendResponse(false, 'فشل إنشاء مجلد الصف');
    }
}

// Sanitize and generate unique filename
$safeFilename = sanitizeFilename($_FILES['file']['name']);
$targetPath = $gradeDir . $safeFilename;

// Flush output buffer to ensure connection stays alive during large file uploads
if (ob_get_level()) {
    ob_end_flush();
}
flush();

// Move uploaded file using binary-safe method
$tmpFile = $_FILES['file']['tmp_name'];
$uploadedSize = $_FILES['file']['size'];

// Verify uploaded file
if (!is_uploaded_file($tmpFile)) {
    sendResponse(false, 'ملف غير صالح للرفع');
}

// Use binary-safe copy method to ensure no data corruption
$sourceHandle = fopen($tmpFile, 'rb');
if (!$sourceHandle) {
    sendResponse(false, 'فشل فتح الملف المؤقت');
}

$destHandle = fopen($targetPath, 'wb');
if (!$destHandle) {
    fclose($sourceHandle);
    sendResponse(false, 'فشل إنشاء الملف النهائي');
}

// Copy file in binary mode with buffer
$bufferSize = 8192;
$totalCopied = 0;
while (!feof($sourceHandle)) {
    $data = fread($sourceHandle, $bufferSize);
    if ($data === false) {
        fclose($sourceHandle);
        fclose($destHandle);
        @unlink($targetPath);
        sendResponse(false, 'خطأ في قراءة الملف المؤقت');
    }
    
    if (strlen($data) === 0) {
        break; // End of file
    }
    
    $bytesWritten = fwrite($destHandle, $data);
    if ($bytesWritten === false || $bytesWritten !== strlen($data)) {
        fclose($sourceHandle);
        fclose($destHandle);
        @unlink($targetPath);
        sendResponse(false, 'خطأ في كتابة الملف النهائي');
    }
    $totalCopied += $bytesWritten;
}

fclose($sourceHandle);
fflush($destHandle);
fclose($destHandle);

// Verify file size
$actualFileSize = filesize($targetPath);
if ($actualFileSize !== $uploadedSize || $totalCopied !== $uploadedSize) {
    @unlink($targetPath);
    sendResponse(false, "حجم الملف لا يتطابق. المتوقع: $uploadedSize، الفعلي: $actualFileSize، المنسوخ: $totalCopied");
}

// Remove temporary file
@unlink($tmpFile);

// Set file permissions
chmod($targetPath, 0644);

// Clear stat cache to ensure accurate file info
clearstatcache(true, $targetPath);

// Generate file URL
$fileUrl = BASE_URL . 'grade_' . $grade . '/' . $safeFilename;

// Log upload (optional)
$logEntry = sprintf(
    "[%s] Grade: %d, Subject: %s, File: %s, Size: %d bytes\n",
    date('Y-m-d H:i:s'),
    $grade,
    $subject,
    $safeFilename,
    $_FILES['file']['size']
);
file_put_contents(__DIR__ . '/upload_log.txt', $logEntry, FILE_APPEND);

// Send success response
sendResponse(true, 'تم رفع الملف بنجاح', $fileUrl);
?>
