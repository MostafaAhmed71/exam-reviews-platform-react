# تقرير ثغرات شاشات المستخدمين العاديين
## User Screens Security Vulnerabilities Report

**التاريخ:** 2024  
**نوع الفحص:** شاشات المستخدمين العاديين (الطلاب/أولياء الأمور)

---

## 📋 الشاشات المفحوصة

### شاشات المستخدمين العاديين:
1. ✅ WelcomeScreen - صفحة الترحيب
2. ✅ TermsScreen - الشروط والأحكام
3. ✅ StageSelection - اختيار المرحلة
4. ✅ GradeSelection - اختيار الصف
5. ✅ ReviewTypeSelection - اختيار نوع المراجعة
6. ✅ SubjectSelection - اختيار المادة
7. ✅ ScheduleScreen - جدول المواعيد
8. ✅ VideosScreen - قائمة الفيديوهات
9. ✅ SubjectVideosScreen - فيديوهات المادة
10. ✅ ElectronicScreen - الاختبارات الإلكترونية
11. ✅ SubjectTestsScreen - اختبارات المادة
12. ✅ SubjectMaterialsScreen - مواد المادة
13. ✅ LiveStreamScreen - البث المباشر
14. ⚠️ **TakeTestScreen** - حل الاختبار (تحتاج فحص دقيق)

---

## 🔴 الثغرات الحرجة (CRITICAL)

### 1. XSS Vulnerability في TakeTestScreen
**المستوى:** 🔴 CRITICAL  
**الموقع:** `src/pages/TakeTestScreen.tsx` (السطر 967)

**المشكلة:**
```typescript
// خطأ أمني خطير!
<span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />
```

**الخطر:**
- استخدام `dangerouslySetInnerHTML` يسمح بتنفيذ JavaScript من محتوى الأسئلة
- إذا كان محتوى السؤال يحتوي على `<script>alert('XSS')</script>` سيتم تنفيذه
- يمكن للمهاجم حقن كود JavaScript ضار

**مثال على الهجوم:**
إذا كان نص السؤال:
```html
السؤال: ما هي النتيجة؟ <img src=x onerror="alert('XSS Attack!')">
```

**التأثير:**
- سرقة بيانات المستخدم (cookies, tokens)
- إعادة توجيه المستخدم لمواقع ضارة
- سرقة session tokens
- تنفيذ أي كود JavaScript

**الحل:**
```typescript
// استبدال dangerouslySetInnerHTML بـ HTML sanitization
import DOMPurify from 'dompurify';

// في JSX:
<span key={index} dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(part.content, { 
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
        ALLOWED_ATTR: []
    }) 
}} />
```

**أو أفضل:**
```typescript
// استخدام HTML entities بدلاً من HTML مباشرة
<span key={index}>{part.content}</span>
// React سيقوم بـ escape تلقائياً
```

---

### 2. عدم وجود Rate Limiting في Submit Test Answers
**المستوى:** 🔴 CRITICAL  
**الموقع:** `src/services/testService.ts`, `src/pages/TakeTestScreen.tsx`

**المشكلة:**
- لا يوجد حد لعدد مرات إرسال الإجابات
- يمكن إرسال إجابات لا نهائية بنفس session token
- يمكن إغراق قاعدة البيانات بطلبات متكررة

**الكود:**
```typescript
// TakeTestScreen.tsx
const handleSubmit = async () => {
    // لا يوجد rate limiting
    const result = await submitTestAnswers(test.id, answersArray, sessionToken);
};

// testService.ts
export async function submitTestAnswers(...) {
    // لا يوجد تحقق من عدد المرات
    const { error } = await supabase
        .from('test_answers')
        .insert(answersToInsert);
}
```

**التأثير:**
- إغراق قاعدة البيانات (DoS)
- استهلاك موارد السيرفر
- إمكانية تزوير النتائج

**الحل:**
```typescript
// في testService.ts
export async function submitTestAnswers(...) {
    // التحقق من وجود إجابات سابقة
    const { data: existingAnswers } = await supabase
        .from('test_answers')
        .select('id')
        .eq('test_id', testId)
        .eq('session_token', sessionToken)
        .limit(1);
    
    if (existingAnswers && existingAnswers.length > 0) {
        return { 
            success: false, 
            error: 'لقد قمت بإرسال الإجابات مسبقاً' 
        };
    }
    
    // باقي الكود...
}
```

---

### 3. Session Token قابل للتوقع
**المستوى:** 🟠 HIGH  
**الموقع:** `src/pages/TakeTestScreen.tsx` (السطر 29)

**المشكلة:**
```typescript
const [sessionToken] = useState(() => 'session_' + Math.random().toString(36).substring(2, 15));
```

**الخطر:**
- `Math.random()` ليس آمناً للتشفير
- يمكن توقع القيم
- يمكن انتحال session tokens

**الحل:**
```typescript
// استخدام crypto API
const generateSecureToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'session_' + Array.from(array, byte => byte.toString(36)).join('').substring(0, 32);
};

const [sessionToken] = useState(() => generateSecureToken());
```

---

## 🟠 الثغرات عالية الخطورة (HIGH)

### 4. عدم التحقق من صحة Test Token
**المستوى:** 🟠 HIGH  
**الموقع:** `src/pages/TakeTestScreen.tsx`, `src/services/testService.ts`

**المشكلة:**
- Token يُقرأ مباشرة من URL hash
- لا يوجد تحقق من expiration
- لا يوجد تحقق من format
- يمكن تخمين tokens

**الكود:**
```typescript
const getTokenFromHash = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#test/')) {
        return hash.substring(6); // بدون أي validation
    }
    return null;
};
```

**التأثير:**
- الوصول لاختبارات غير مصرح بها
- تخمين tokens للاختبارات

**الحل:**
```typescript
// في testService.ts - التحقق من token format
const isValidTokenFormat = (token: string): boolean => {
    // مثال: token يجب أن يكون 32 حرف hex
    return /^[a-f0-9]{32}$/i.test(token);
};

// التحقق من expiration
const { data: test } = await supabase
    .from('electronic_tests')
    .select('*, share_token_expires_at')
    .eq('share_token', token)
    .single();

if (!test) {
    return null; // Token غير صحيح
}

if (test.share_token_expires_at) {
    const expiresAt = new Date(test.share_token_expires_at);
    if (expiresAt < new Date()) {
        return null; // Token منتهي
    }
}
```

---

### 5. عدم التحقق من حجم الإجابات
**المستوى:** 🟠 HIGH  
**الموقع:** `src/pages/TakeTestScreen.tsx`

**المشكلة:**
- لا يوجد حد أقصى لحجم الإجابة
- يمكن إرسال بيانات ضخمة (DoS attack)

**الحل:**
```typescript
const handleAnswerChange = (questionId: number, answer: string) => {
    // تحديد حد أقصى 5000 حرف
    if (answer.length > 5000) {
        setMessage({ type: 'error', text: 'الإجابة طويلة جداً (الحد الأقصى 5000 حرف)' });
        return;
    }
    setAnswers({ ...answers, [questionId]: answer });
};
```

---

### 6. عرض معلومات حساسة في Console
**المستوى:** 🟡 MEDIUM  
**الموقع:** `src/pages/TakeTestScreen.tsx`

**المشكلة:**
```typescript
console.log('Loaded questions:', testWithQuestions.questions);
testWithQuestions.questions.forEach((q, idx) => {
    if (q.question_image) {
        console.log(`Question ${idx + 1} has image:`, q.question_image);
    }
});
```

**الحل:**
- إزالة console.logs في الإنتاج
- أو استخدام environment variable:
```typescript
if (import.meta.env.DEV) {
    console.log('Loaded questions:', testWithQuestions.questions);
}
```

---

## 🟡 الثغرات متوسطة الخطورة (MEDIUM)

### 7. عدم وجود Input Validation شامل
**المستوى:** 🟡 MEDIUM  
**الموقع:** جميع شاشات المستخدمين

**المشكلة:**
- بعض المدخلات لا يتم التحقق منها بشكل كافٍ
- لا يوجد sanitization للبيانات

**الحل:**
- استخدام Zod أو Yup للvalidation
- Sanitize جميع المدخلات

---

### 8. عدم وجود CSRF Protection
**المستوى:** 🟡 MEDIUM  
**الموقع:** جميع forms

**المشكلة:**
- لا يوجد CSRF tokens للطلبات
- لكن Supabase يحمي من ذلك جزئياً

---

## ✅ نقاط القوة

1. ✅ استخدام Supabase (يحمي من SQL Injection)
2. ✅ React يقوم بـ escape تلقائي لمعظم المحتوى
3. ✅ لا توجد file uploads من المستخدمين العاديين
4. ✅ معظم الشاشات للقراءة فقط

---

## 📋 خطة الإصلاح (Priority Order)

### المرحلة 1: الحماية الفورية (يجب تنفيذها فوراً)

1. ✅ **إصلاح XSS في TakeTestScreen**
   - إزالة `dangerouslySetInnerHTML`
   - استخدام DOMPurify أو HTML entities

2. ✅ **إضافة Rate Limiting للإجابات**
   - منع إرسال الإجابات أكثر من مرة
   - التحقق من duplicate submissions

3. ✅ **تحسين Session Tokens**
   - استخدام crypto.getRandomValues
   - جعل tokens أقوى

### المرحلة 2: تحسينات أمنية (خلال أسبوع)

4. ✅ **التحقق من Test Tokens**
   - إضافة expiration check
   - إضافة format validation

5. ✅ **إضافة Input Validation**
   - تحديد حد أقصى لحجم الإجابات
   - Sanitize المدخلات

6. ✅ **تقليل Console Logs**
   - إزالة logs الحساسة
   - استخدام environment checks

---

## 🔧 أمثلة على الإصلاحات

### إصلاح 1: XSS في TakeTestScreen

```typescript
// قبل (غير آمن):
<span dangerouslySetInnerHTML={{ __html: part.content }} />

// بعد (آمن):
import DOMPurify from 'dompurify';

// تثبيت: npm install dompurify @types/dompurify
<span dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(part.content, { 
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'sub', 'sup'],
        ALLOWED_ATTR: []
    }) 
}} />
```

### إصلاح 2: Rate Limiting

```typescript
// في testService.ts
export async function submitTestAnswers(...) {
    // التحقق من الإجابات السابقة
    const { data: existing } = await supabase
        .from('test_answers')
        .select('id, created_at')
        .eq('test_id', testId)
        .eq('session_token', sessionToken)
        .limit(1);
    
    if (existing && existing.length > 0) {
        return { 
            success: false, 
            error: 'لقد قمت بإرسال الإجابات مسبقاً. لا يمكن إعادة الإرسال.' 
        };
    }
    
    // باقي الكود...
}
```

---

## 📊 ملخص الثغرات

| # | الثغرة | الخطورة | الأولوية | الموقع |
|---|--------|---------|----------|--------|
| 1 | XSS via dangerouslySetInnerHTML | 🔴 Critical | 1 | TakeTestScreen.tsx:967 |
| 2 | No Rate Limiting | 🔴 Critical | 1 | TakeTestScreen.tsx, testService.ts |
| 3 | Weak Session Tokens | 🟠 High | 2 | TakeTestScreen.tsx:29 |
| 4 | No Token Validation | 🟠 High | 2 | TakeTestScreen.tsx, testService.ts |
| 5 | No Answer Size Limit | 🟠 High | 2 | TakeTestScreen.tsx |
| 6 | Console Logs | 🟡 Medium | 3 | TakeTestScreen.tsx |
| 7 | Input Validation | 🟡 Medium | 3 | All screens |
| 8 | CSRF Protection | 🟡 Medium | 3 | All forms |

---

## ✅ Checklist للإصلاح

- [ ] إصلاح XSS في TakeTestScreen (استخدام DOMPurify)
- [ ] إضافة Rate Limiting للإجابات
- [ ] تحسين Session Tokens (crypto.getRandomValues)
- [ ] التحقق من Test Token expiration
- [ ] إضافة حد أقصى لحجم الإجابات
- [ ] إزالة Console Logs الحساسة
- [ ] إضافة Input Validation شامل
- [ ] اختبار جميع الإصلاحات

---

**ملاحظة:** هذه الثغرات في شاشات المستخدمين العاديين. يجب إصلاحها قبل الانتقال لحماية لوحة الإدارة.

**هل تريد أن أبدأ بإصلاح هذه الثغرات الآن؟**

