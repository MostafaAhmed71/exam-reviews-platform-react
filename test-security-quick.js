/**
 * سكريبت اختبار أمان سريع
 * Quick Security Testing Script
 * 
 * الاستخدام:
 * node test-security-quick.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const UPLOAD_API_URL = process.env.UPLOAD_API_URL || 'https://your-domain.com/upload.php';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Test 1: Admin Access Protection
async function testAdminAccess() {
    logInfo('\n1. Testing Admin Access Protection...');
    
    try {
        // Note: This test works in browser console, not in Node.js
        // For Node.js, you need to use a browser automation tool like Puppeteer
        logWarning('   Note: This test requires browser testing.');
        logWarning('   Open: ' + BASE_URL + '/#admin');
        logWarning('   Expected: Should require login or deny access');
        
        // In a real scenario, you would use Puppeteer or Playwright here
        logInfo('   Manual test required in browser');
        
    } catch (error) {
        logError(`   Error: ${error.message}`);
    }
}

// Test 2: TestDataScreen Access
async function testTestDataScreen() {
    logInfo('\n2. Testing TestDataScreen Access...');
    
    try {
        logWarning('   Open: ' + BASE_URL + '/#tata');
        logWarning('   Expected: Should require login or deny access');
        logInfo('   Manual test required in browser');
    } catch (error) {
        logError(`   Error: ${error.message}`);
    }
}

// Test 3: CORS Configuration
async function testCORS() {
    logInfo('\n3. Testing CORS Configuration...');
    
    try {
        const response = await fetch(UPLOAD_API_URL, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'POST',
            }
        });
        
        const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
        
        if (allowOrigin === '*') {
            logError('   CORS is open to all origins!');
            logError('   Fix: Restrict CORS to your domain only');
        } else if (allowOrigin) {
            logSuccess(`   CORS is restricted to: ${allowOrigin}`);
        } else {
            logWarning('   Could not determine CORS configuration');
        }
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            logWarning('   Upload API URL is not accessible (might be expected in development)');
        } else {
            logError(`   Error: ${error.message}`);
        }
    }
}

// Test 4: Check for exposed environment variables
async function testExposedEnvVars() {
    logInfo('\n4. Checking for exposed environment variables...');
    
    try {
        const response = await fetch(BASE_URL);
        const html = await response.text();
        
        const dangerousPatterns = [
            /VITE_SUPABASE_URL["']?\s*[:=]\s*["']([^"']+)/gi,
            /VITE_SUPABASE_ANON_KEY["']?\s*[:=]\s*["']([^"']+)/gi,
            /api[_-]?key["']?\s*[:=]\s*["']([^"']+)/gi,
            /secret["']?\s*[:=]\s*["']([^"']+)/gi,
            /password["']?\s*[:=]\s*["']([^"']+)/gi,
        ];
        
        let found = false;
        dangerousPatterns.forEach((pattern, index) => {
            const matches = html.match(pattern);
            if (matches) {
                found = true;
                logError(`   Found potentially exposed sensitive data: ${matches[0].substring(0, 50)}...`);
            }
        });
        
        if (!found) {
            logSuccess('   No obvious sensitive data exposed in HTML');
        }
    } catch (error) {
        logWarning(`   Could not fetch page: ${error.message}`);
    }
}

// Test 5: Check security headers
async function testSecurityHeaders() {
    logInfo('\n5. Testing Security Headers...');
    
    try {
        const response = await fetch(BASE_URL);
        const headers = response.headers;
        
        const securityHeaders = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY or SAMEORIGIN',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000',
            'Content-Security-Policy': 'various',
        };
        
        let hasHeaders = false;
        Object.keys(securityHeaders).forEach(header => {
            if (headers.get(header)) {
                logSuccess(`   ${header} is set`);
                hasHeaders = true;
            } else {
                logWarning(`   ${header} is missing (recommended)`);
            }
        });
        
        if (!hasHeaders) {
            logWarning('   No security headers found (consider adding them)');
        }
    } catch (error) {
        logWarning(`   Could not check headers: ${error.message}`);
    }
}

// Test 6: Check for console errors
async function testConsoleErrors() {
    logInfo('\n6. Console Error Check...');
    logWarning('   Manual test required:');
    logWarning('   1. Open browser DevTools (F12)');
    logWarning('   2. Go to Console tab');
    logWarning('   3. Check for errors related to:');
    logWarning('      - Authentication failures');
    logWarning('      - CORS errors');
    logWarning('      - Exposed API keys');
}

// Main test runner
async function runTests() {
    log('\n' + '='.repeat(60), 'blue');
    log('🔒 Security Testing Report', 'blue');
    log('='.repeat(60) + '\n', 'blue');
    
    logInfo(`Base URL: ${BASE_URL}`);
    logInfo(`Upload API: ${UPLOAD_API_URL}\n`);
    
    await testAdminAccess();
    await testTestDataScreen();
    await testCORS();
    await testExposedEnvVars();
    await testSecurityHeaders();
    await testConsoleErrors();
    
    log('\n' + '='.repeat(60), 'blue');
    logInfo('Testing Complete!');
    logWarning('Note: Some tests require manual browser testing');
    logWarning('See SECURITY_TESTING_GUIDE.md for detailed instructions');
    log('='.repeat(60) + '\n', 'blue');
}

// Run tests
runTests().catch(error => {
    logError(`\nFatal error: ${error.message}`);
    process.exit(1);
});

