<?php
/**
 * File Delete Handler for Educational Materials
 * This script deletes files from Hostinger server
 * 
 * Expected POST parameters:
 * - fileUrl: The URL of the file to delete
 * 
 * Returns JSON response:
 * {
 *   "success": true/false,
 *   "message": "Success or error message"
 * }
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set response header to JSON
header('Content-Type: application/json; charset=utf-8');

// Allow CORS - Restricted to specific domains for security
$allowedOrigins = [
    'https://mufid.northelite0.com',
    'https://www.mufid.northelite0.com',
    'https://northelite.tech',
    'https://www.northelite.tech',
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
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
define('UPLOAD_DIR', __DIR__ . '/uploads/materials/');
define('OLD_UPLOAD_DIR', __DIR__ . '/uploads/'); // For old files directly in /uploads/
define('BASE_URL', 'https://northelite0.com/uploads/materials/');
define('OLD_BASE_URL', 'https://northelite0.com/uploads/'); // For old files

/**
 * Send JSON response and exit
 */
function sendResponse($success, $message) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if (!$success) {
        $response['error'] = $message;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'طريقة الطلب غير صحيحة');
}

// Check if fileUrl was provided
if (!isset($_POST['fileUrl']) || empty(trim($_POST['fileUrl']))) {
    sendResponse(false, 'رابط الملف مطلوب');
}

$fileUrl = trim($_POST['fileUrl']);

// Log the received URL for debugging
error_log("Received fileUrl: " . $fileUrl);
error_log("BASE_URL: " . BASE_URL);

// Extract file path from URL - handle different URL formats
$relativePath = '';
$isOldFormat = false;

// Try to extract path from different possible URL formats
if (strpos($fileUrl, BASE_URL) === 0) {
    // Standard format: https://northelite0.com/uploads/materials/grade_X/filename
    $relativePath = str_replace(BASE_URL, '', $fileUrl);
} else if (strpos($fileUrl, OLD_BASE_URL) === 0 && strpos($fileUrl, '/uploads/materials/') === false) {
    // Old format: https://northelite0.com/uploads/filename (without materials/grade_X/)
    $oldFileName = str_replace(OLD_BASE_URL, '', $fileUrl);
    $isOldFormat = true;
    error_log("Old format detected, file: " . $oldFileName);
    
    // First, try to find it in grade directories (in case it was moved)
    for ($grade = 1; $grade <= 6; $grade++) {
        $searchPath = UPLOAD_DIR . 'grade_' . $grade . '/' . $oldFileName;
        if (file_exists($searchPath)) {
            $relativePath = 'grade_' . $grade . '/' . $oldFileName;
            $isOldFormat = false; // Found in new location
            error_log("Found in grade directory: " . $relativePath);
            break;
        }
    }
    
    // If not found in grade directories, it's in old location
    if ($isOldFormat) {
        $oldFilePath = OLD_UPLOAD_DIR . $oldFileName;
        if (file_exists($oldFilePath)) {
            // Delete from old location directly
            error_log("Deleting from old location: " . $oldFilePath);
            if (unlink($oldFilePath)) {
                sendResponse(true, 'تم حذف الملف من الموقع القديم بنجاح');
            } else {
                sendResponse(false, 'فشل حذف الملف من الموقع القديم');
            }
        } else {
            sendResponse(true, 'الملف غير موجود (تم حذفه مسبقاً)');
        }
    }
} else if (strpos($fileUrl, '/uploads/materials/') !== false) {
    // Format with domain: https://northelite0.com/uploads/materials/grade_X/filename
    $parts = explode('/uploads/materials/', $fileUrl);
    if (isset($parts[1])) {
        $relativePath = $parts[1];
    }
} else if (strpos($fileUrl, '/uploads/') !== false && strpos($fileUrl, '/uploads/materials/') === false) {
    // Old format: /uploads/filename
    $parts = explode('/uploads/', $fileUrl);
    if (isset($parts[1])) {
        $oldRelativePath = $parts[1];
        $isOldFormat = true;
        error_log("Old format detected (path only), searching for: " . $oldRelativePath);
    }
} else if (strpos($fileUrl, 'grade_') !== false) {
    // Format starting with grade_X: grade_X/filename
    $parts = explode('grade_', $fileUrl);
    if (isset($parts[1])) {
        $relativePath = 'grade_' . $parts[1];
    }
} else {
    // If URL doesn't match expected patterns, try to extract filename
    $urlParts = parse_url($fileUrl);
    if (isset($urlParts['path'])) {
        $path = $urlParts['path'];
        if (strpos($path, '/uploads/materials/') !== false) {
            $relativePath = str_replace('/uploads/materials/', '', $path);
        } else if (strpos($path, '/uploads/') !== false && strpos($path, '/uploads/materials/') === false) {
            // Old format
            $oldRelativePath = str_replace('/uploads/', '', $path);
            $isOldFormat = true;
            error_log("Old format detected (parsed), searching for: " . $oldRelativePath);
        } else {
            // Last resort: try to get the last part of the path
            $pathParts = explode('/', trim($path, '/'));
            if (count($pathParts) >= 2) {
                // Assume format: grade_X/filename
                $relativePath = $pathParts[count($pathParts) - 2] . '/' . $pathParts[count($pathParts) - 1];
            } else if (count($pathParts) === 1) {
                // Just filename - old format
                $oldRelativePath = $pathParts[0];
                $isOldFormat = true;
                error_log("Old format detected (filename only), searching for: " . $oldRelativePath);
            }
        }
    }
}

// Handle old format files (in /uploads/ directly, not in /uploads/materials/grade_X/)
if ($isOldFormat && empty($relativePath)) {
    $oldRelativePath = isset($oldRelativePath) ? $oldRelativePath : str_replace([OLD_BASE_URL, '/uploads/'], '', $fileUrl);
    $filename = basename($oldRelativePath);
    
    // Search for the file in all grade directories
    error_log("Searching for old format file: " . $filename);
    for ($grade = 1; $grade <= 6; $grade++) {
        $searchPath = UPLOAD_DIR . 'grade_' . $grade . '/' . $filename;
        if (file_exists($searchPath)) {
            $relativePath = 'grade_' . $grade . '/' . $filename;
            error_log("Found old format file at: " . $relativePath);
            break;
        }
    }
    
    // If not found in grade directories, check if it's in the old location
    if (empty($relativePath)) {
        $oldUploadDir = __DIR__ . '/uploads/';
        $oldFilePath = $oldUploadDir . $filename;
        if (file_exists($oldFilePath)) {
            // File is in old location, delete it from there
            error_log("Found file in old location: " . $oldFilePath);
            if (unlink($oldFilePath)) {
                sendResponse(true, 'تم حذف الملف من الموقع القديم بنجاح');
            } else {
                sendResponse(false, 'فشل حذف الملف من الموقع القديم');
            }
        }
    }
}

// If we still don't have a relative path, try one more approach
if (empty($relativePath)) {
    // Try to extract just the filename and search for it
    $urlParts = parse_url($fileUrl);
    $path = isset($urlParts['path']) ? $urlParts['path'] : $fileUrl;
    
    // Get the last part (filename)
    $pathParts = explode('/', trim($path, '/'));
    $filename = end($pathParts);
    
    if (!empty($filename)) {
        // Search for the file in all grade directories
        error_log("Searching for filename: " . $filename);
        for ($grade = 1; $grade <= 6; $grade++) {
            $searchPath = UPLOAD_DIR . 'grade_' . $grade . '/' . $filename;
            if (file_exists($searchPath)) {
                $relativePath = 'grade_' . $grade . '/' . $filename;
                error_log("Found file at: " . $relativePath);
                break;
            }
        }
    }
}

// If we still don't have a relative path, reject
if (empty($relativePath)) {
    error_log("Failed to extract relative path from: " . $fileUrl);
    // Instead of failing, try to continue with the original URL path
    // This is a fallback for edge cases
    $urlParts = parse_url($fileUrl);
    if (isset($urlParts['path'])) {
        $path = trim($urlParts['path'], '/');
        $pathParts = explode('/', $path);
        // Try to find grade_X pattern
        foreach ($pathParts as $part) {
            if (strpos($part, 'grade_') === 0) {
                $gradeIndex = array_search($part, $pathParts);
                if ($gradeIndex !== false && isset($pathParts[$gradeIndex + 1])) {
                    $relativePath = $part . '/' . $pathParts[$gradeIndex + 1];
                    error_log("Extracted path using fallback: " . $relativePath);
                    break;
                }
            }
        }
    }
    
    if (empty($relativePath)) {
        sendResponse(false, 'رابط الملف غير صحيح. الرجاء التحقق من الرابط: ' . substr($fileUrl, 0, 100));
    }
}

// Construct full file path
$filePath = UPLOAD_DIR . $relativePath;

// Normalize the path (remove any '..' or extra slashes)
$dirPath = dirname($filePath);
$fileName = basename($filePath);
$realDirPath = realpath($dirPath);

if ($realDirPath === false) {
    // Directory doesn't exist, use the original path
    $filePath = rtrim($dirPath, '/\\') . '/' . $fileName;
} else {
    $filePath = $realDirPath . '/' . $fileName;
}

// Security check: ensure the file is within the upload directory
$realUploadDir = realpath(UPLOAD_DIR);
if ($realUploadDir === false) {
    sendResponse(false, 'مجلد الرفع غير موجود');
}

$realFilePath = realpath($filePath);

// If file doesn't exist yet, check if the directory path is valid
if ($realFilePath === false) {
    $dirPath = dirname($filePath);
    $realDirPath = realpath($dirPath);
    if ($realDirPath === false || strpos($realDirPath, $realUploadDir) !== 0) {
        error_log("Invalid directory path: " . $dirPath);
        sendResponse(false, 'مسار الملف غير صحيح: ' . $filePath);
    }
    // File doesn't exist, but directory is valid - this is okay
} else {
    // File exists, verify it's within upload directory
    if (strpos($realFilePath, $realUploadDir) !== 0) {
        error_log("File path outside upload directory: " . $realFilePath);
        sendResponse(false, 'مسار الملف خارج مجلد الرفع');
    }
}

// Log the constructed file path for debugging
error_log("Constructed file path: " . $filePath);
error_log("Relative path: " . $relativePath);

// Check if file exists
if (!file_exists($filePath)) {
    // File doesn't exist, but we'll consider it a success (already deleted)
    error_log("File does not exist: " . $filePath);
    sendResponse(true, 'الملف غير موجود (تم حذفه مسبقاً)');
}

// Check if it's a file (not a directory)
if (!is_file($filePath)) {
    sendResponse(false, 'المسار المحدد ليس ملفاً');
}

// Attempt to delete the file
if (!unlink($filePath)) {
    sendResponse(false, 'فشل حذف الملف من السيرفر');
}

// Log deletion (optional)
$logEntry = sprintf(
    "[%s] Deleted file: %s\n",
    date('Y-m-d H:i:s'),
    $relativePath
);
file_put_contents(__DIR__ . '/delete_log.txt', $logEntry, FILE_APPEND);

// Send success response
sendResponse(true, 'تم حذف الملف بنجاح');
?>

