/**
 * سكريبت اختبار أمان للمتصفح
 * Browser Security Testing Script
 * 
 * الاستخدام:
 * 1. افتح المتصفح
 * 2. افتح Developer Tools (F12)
 * 3. اذهب إلى Console
 * 4. انسخ والصق هذا الكود
 */

(async function securityTests() {
    console.log('%c🔒 Security Tests Started', 'color: blue; font-size: 16px; font-weight: bold');
    console.log('='.repeat(60));
    
    // Test 1: Check if Admin route is accessible
    console.log('\n1. Testing Admin Access...');
    const currentHash = window.location.hash;
    if (currentHash === '#admin' || currentHash === '#admin-panel') {
        // Check if we can access admin without login
        const adminContent = document.body.innerHTML;
        if (adminContent.includes('admin') && !adminContent.includes('login')) {
            console.error('❌ Admin panel is accessible without authentication!');
        } else {
            console.log('✅ Admin panel requires authentication or redirects to login');
        }
    } else {
        console.log('ℹ️  Navigate to #admin to test admin access');
    }
    
    // Test 2: Check localStorage for sensitive data
    console.log('\n2. Checking localStorage for sensitive data...');
    const localStorageKeys = Object.keys(localStorage);
    const sensitiveKeys = localStorageKeys.filter(key => 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('key') || 
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('password')
    );
    
    if (sensitiveKeys.length > 0) {
        sensitiveKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value && value.length > 50) {
                console.warn(`⚠️  Found sensitive data in localStorage: ${key}`);
                console.warn(`   Preview: ${value.substring(0, 50)}...`);
            }
        });
    } else {
        console.log('✅ No obvious sensitive data in localStorage');
    }
    
    // Test 3: Check for exposed environment variables
    console.log('\n3. Checking for exposed environment variables...');
    const pageHTML = document.documentElement.outerHTML;
    const envPatterns = [
        /VITE_SUPABASE_URL["']?\s*[:=]\s*["']([^"']+)/gi,
        /VITE_SUPABASE_ANON_KEY["']?\s*[:=]\s*["']([^"']+)/gi,
    ];
    
    let foundEnv = false;
    envPatterns.forEach(pattern => {
        const matches = pageHTML.match(pattern);
        if (matches) {
            console.error(`❌ Found exposed environment variable: ${matches[0].substring(0, 80)}...`);
            foundEnv = true;
        }
    });
    
    if (!foundEnv) {
        console.log('✅ No environment variables exposed in HTML');
    }
    
    // Test 4: Test Supabase client (if available)
    console.log('\n4. Testing Supabase connection...');
    try {
        // Try to import supabase (this will only work if the module is available)
        if (window.supabase) {
            console.log('ℹ️  Supabase client is available globally (consider making it private)');
        } else {
            console.log('✅ Supabase client is not exposed globally');
        }
    } catch (error) {
        console.log('ℹ️  Could not check Supabase client');
    }
    
    // Test 5: Check for console.log with sensitive data
    console.log('\n5. Checking console for sensitive data leaks...');
    console.log('ℹ️  Review console output above for any sensitive information');
    console.log('ℹ️  Common issues: API keys, passwords, tokens in console.log');
    
    // Test 6: Check network requests for sensitive data
    console.log('\n6. Network Security Check...');
    console.log('ℹ️  Go to Network tab and check:');
    console.log('   - Are API keys visible in request headers?');
    console.log('   - Are passwords sent in plain text?');
    console.log('   - Are requests using HTTPS?');
    
    // Test 7: CORS test
    console.log('\n7. Testing CORS...');
    try {
        const testUrl = 'https://your-domain.com/upload.php'; // Replace with actual URL
        const response = await fetch(testUrl, {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST',
            }
        });
        
        const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
        if (allowOrigin === '*') {
            console.error('❌ CORS is open to all origins!');
        } else if (allowOrigin) {
            console.log(`✅ CORS is restricted to: ${allowOrigin}`);
        }
    } catch (error) {
        console.log('ℹ️  Could not test CORS (expected if URL is different)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('%c✅ Security Tests Complete!', 'color: green; font-weight: bold');
    console.log('Review the results above and check SECURITY_TESTING_GUIDE.md for more details');
    console.log('='.repeat(60));
})();

