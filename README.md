# exam-reviews-platform-react

منصة المراجعات النهائية لمدرسة **نخبة الشمال الأهلية** — نظام شامل لإدارة المراجعات النهائية للطلاب: فيديوهات، مواد تعليمية، اختبارات إلكترونية، بث مباشر، وإدارة كاملة من الأدمن.

> الاسم المقترح: **`exam-reviews-platform-react`**
> المجلد الحالي: `E:\mohamad exam`
> آخر تعديل: **2026-06-03**

---

## 🎯 الهدف من المشروع

منصة مدرسة نخبة الشمال الأهلية للمراجعات النهائية، بتشمل:

### للطلاب
- تصفح المراجعات (فيديو + مواد + اختبارات) حسب المرحلة والصف والمادة.
- جدول المراجعات.
- اختبارات إلكترونية تفاعلية (`TakeTestScreen`).
- اختباراتي (`MyTestsScreen`).
- فيديوهات محفوظة (`SavedVideosScreen`).
- بث مباشر للمحاضرات (`LiveStreamScreen`).
- بحث عن رقم الجلوس (`AdminSeatLookup`).

### للأدمن
- رفع المواد (`AdminUpload`).
- إدارة المواد (`MaterialsManagement`).
- إدارة المواد الدراسية (`SubjectsManagement`).
- إدارة الاختبارات الإلكترونية (`ElectronicTestsManagement`).
- بناء اختبارات بالسحب والإفلات (`TestBuilder` + `@dnd-kit`).
- إضافة أسئلة (`AddQuestionScreen`).
- مراجعة الأسئلة (`QuestionReviewScreen`).
- إحصائيات (`StatisticsScreen`).
- بيانات الاختبارات (`TestDataScreen`).
- إدارة الطلاب (`StudentManagement`).
- إعدادات البث المباشر (`LiveStreamSettingsScreen`).
- تلجرام بوت عائم (`FloatingTelegramBot`).

---

## 🛠️ التقنيات المستخدمة

### Core
- **React 19.2** + **TypeScript 5.9** (أحدث إصدار)
- **Vite 7.2** (build tool سريع)
- **React Router 7**

### State & Data
- **Nanostores 1.1** + **@nanostores/react 1.0** (state management خفيف)
- **@supabase/supabase-js 2.87** (Backend: Auth + DB + Storage)
- **@tanstack/react-query** (data fetching)

### UI/UX
- **Tailwind CSS** (عبر index.css)
- **Framer Motion 12** (animations)
- **Chart.js 4.5** + **react-chartjs-2 5.3** (رسوم بيانية)
- **@dnd-kit/core 6.3** + **sortable 10** + **utilities 3.2** (drag & drop في Test Builder)

### File Processing
- **ExcelJS 4.4** + **xlsx 0.18** (Excel import/export)
- **Mammoth 1.11** (تحويل Word → HTML للمواد)
- **DOMPurify 3.3** (sanitize HTML)
- **@types/dompurify 3.0**

### Utils
- **Nanoid 5.1** (IDs فريدة)

### Hosting & Security
- **Netlify** (`netlify.toml` موجود)
- **CSP Headers** كاملة في `netlify.toml` (Content Security Policy صارمة)
- **Security testing scripts**: `test-security-browser.js`, `test-security-quick.js`

### Telegram Bot
- مجلد `teleg bot/` فيه bot code
- `FloatingTelegramBot` component (يظهر/يختفي حسب `VITE_SHOW_TELEGRAM_BOT`)

---

## 📦 هيكل المشروع

```
mohamad exam/
├── src/
│   ├── App.tsx          # شاشة navigation واحدة كبيرة (state-driven)
│   ├── main.tsx
│   ├── pages/           # ~30 شاشة
│   │   ├── WelcomeScreen, TermsScreen
│   │   ├── StageSelection, GradeSelection
│   │   ├── ReviewTypeSelection, SubjectSelection
│   │   ├── ScheduleScreen, VideosScreen
│   │   ├── ElectronicScreen, AdminUpload
│   │   ├── MaterialsManagement, SubjectsManagement
│   │   ├── ElectronicTestsManagement, TestBuilder
│   │   ├── TakeTestScreen, MyTestsScreen
│   │   ├── AddQuestionScreen, SubjectVideosScreen
│   │   ├── SubjectTestsScreen, SubjectMaterialsScreen
│   │   ├── StatisticsScreen, QuestionReviewScreen
│   │   ├── LiveStreamScreen, LiveStreamSettingsScreen
│   │   ├── TestDataScreen, StudentManagement
│   │   ├── SavedVideosScreen, AdminSeatLookup
│   ├── components/      # FloatingTelegramBot...
│   ├── lib/             # navigation store
│   ├── services/        # API calls
│   ├── hooks/
│   ├── types/
│   └── utils/
├── teleg bot/           # Telegram bot code
├── docs/                # documentation
├── dummy/               # بيانات اختبارية
├── database/            # SQL dumps
├── hostinger/           # deploy للـ Hostinger
├── public/
├── dist/ + dist.zip     # build outputs (متضمنة في git)
├── USER_SCREENS_SECURITY_REPORT.md
└── package.json
```

---

## 🚀 طريقة التشغيل

### 1) المتطلبات
- Node.js 20+
- حساب Supabase
- حساب Netlify (للـ deployment)

### 2) تجهيز Supabase
1. أنشئ مشروع على [supabase.com](https://supabase.com).
2. شغل الـ migrations من مجلد `database/` على SQL Editor.
3. أضف بيانات المدارس والمراحل والصفوف.

### 3) متغيرات البيئة
أنشئ `.env` في الجذر:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SHOW_TELEGRAM_BOT=true   # أو false لإخفاء البوت العائم
```

### 4) Development
```bash
cd "E:\mohamad exam"
npm install
npm run dev      # http://localhost:5173 (محدد في vite.config.ts)
```

### 5) Production build
```bash
npm run build       # → dist/
npm run preview     # معاينة محلية
```

### 6) Security Audit
```bash
npm run test:security   # يفحص security issues
npm run audit           # npm audit
```

### 7) Deploy على Netlify
اربط الـ repo بـ Netlify — الإعدادات في `netlify.toml` جاهزة:
- Build command: `npm run build`
- Publish dir: `dist`
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options) متضمنة.

---

## 📝 أوامر مفيدة

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | Vite dev server على `localhost:5173` |
| `npm run build` | TypeScript + Vite build |
| `npm run preview` | معاينة build |
| `npm run lint` | ESLint check |
| `npm run test:security` | اختبار security |
| `npm run audit` | فحص الثغرات في dependencies |

---

## 📅 آخر تعديل

**2026-06-03** — خامس أحدث مشروع.

---

## ⚠️ ملاحظات

- **الـ index.html title**: "منصة المراجعات النهائية - متوسطة وثانوية نخبة الشمال الأهلية".
- **أكبر مشروع في الـ drive** من حيث عدد الصفحات (30+ شاشة).
- الـ navigation **state-driven** مش route-based (يستخدم nanostores `currentScreen`).
- ملفات `dist/` و `node_modules.rar` متضمنة — **ينصح بإضافتها لـ `.gitignore`**.
- **CSP صارمة جداً** في `netlify.toml` — لو ضفت CDN جديد محتاج تحدّث الـ headers.
- مجلد `dummy/` فيه بيانات تجريبية — مفيد للـ testing.
- شوف `USER_SCREENS_SECURITY_REPORT.md` لتقرير أمني مفصل.
- ملاحظة: مفيش مدرستين مختلفتين (nخبة الشمال)، ده للمدرسة بس.