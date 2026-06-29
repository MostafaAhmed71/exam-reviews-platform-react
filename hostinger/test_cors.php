<?php
/**
 * Simple CORS Test Script
 * Upload this file to your server and access it from your domain to test CORS
 * URL: https://northelite0.com/test_cors.php
 */

// Start output buffering
if (ob_get_level() == 0) {
    ob_start();
}

// Clear any buffered output
if (ob_get_level() > 0) {
    ob_clean();
}

// Set CORS headers - Restricted to specific domains for security
$allowedOrigins = [
    'https://mufid.northelite0.com',
    'https://www.mufid.northelite0.com',
    'https://northelite.tech',
    'https://www.northelite.tech',
    'https://review.northelite0.com',
    'http://review.northelite0.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin) && in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin, true);
} else if (!empty($origin) && (
    strpos($origin, 'northelite0.com') !== false ||
    strpos($origin, 'localhost') !== false ||
    strpos($origin, '127.0.0.1') !== false
)) {
    // Allow any subdomain of northelite0.com or localhost for development
    header('Access-Control-Allow-Origin: ' . $origin, true);
} else {
    // For unknown origins, don't set CORS header (will be blocked by browser)
    // This is more secure than allowing all origins
}

header('Access-Control-Allow-Methods: POST, OPTIONS, GET', true);
header('Access-Control-Allow-Headers: Content-Type, Content-Length, X-Requested-With', true);
header('Access-Control-Allow-Credentials: true', true);
header('Access-Control-Max-Age: 86400', true);
header('Content-Type: application/json; charset=utf-8', true);

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Return test response
$response = [
    'success' => true,
    'message' => 'CORS is working!',
    'origin' => $origin,
    'server' => [
        'HTTP_ORIGIN' => $_SERVER['HTTP_ORIGIN'] ?? 'not set',
        'HTTP_REFERER' => $_SERVER['HTTP_REFERER'] ?? 'not set',
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'not set',
    ],
    'headers_sent' => headers_sent(),
    'cors_header' => 'Access-Control-Allow-Origin header should be visible in response',
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit();

