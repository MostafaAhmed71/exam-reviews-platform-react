# exam-reviews-platform-react — Version History

## Version: v1.5.0
**Date:** 2026-10-07

### Changes
- Rebuilt only the existing welcome UI with a centered school logo, two-level school name, navy/gold decorative edges, an educational SVG illustration, period and school cards, a large CTA, and three feature icons.
- Preserved visitor tracking, swipe navigation, the CTA action, the director footer, routes and backend data. The period display remains noninteractive as before.
- Scoped new styles to the welcome screen; reused the existing Cairo font and school logo. Labels remain HTML rather than text embedded in an image.

### Validation
- Production build passed; ESLint passed for WelcomeScreen.tsx and LearningArtwork.tsx.
- Chromium viewport checks passed at 320, 360, 375, 390, 412, 430, 768 and 1440 px with Cairo loaded: no horizontal overflow, clipped text, overlapping badges or runtime errors.
- CTA and swipe both reach the existing terms screen. Backend and analytics calls intercepted during QA; no live data changed.
- Evidence: scratch/reviews-design/premium-welcome-report.json and premium-welcome-*.png.
- No new reference image was attached; implemented the written specification, so exact image matching cannot be verified. Physical iOS/Android devices were not tested.

### Backup
- Versions/2026-10-07_v2.33.0_BeforePremiumWelcome.zip: Git HEAD snapshot, 3,271,425 bytes.
- Versions/2026-10-07_v1.4.0_BeforePremiumWelcome.zip: current platform files, 46,031,032 bytes; secrets and generated dependencies excluded.

---

## Version: v1.4.0
**Date:** 2026-10-07

### Changes
- إصلاح تجاوب مراجعة الأسئلة وإعدادات البث وإدارة الطلاب والاختبار وأسماء الملفات الطويلة وإضافة الفيديو.
- حصر تمرير جدول الطلاب داخل إطاره، والسماح بتكبير الصفحة، وتحسين حجم حقول الإدخال على الجوال.
- تذييل موحد في جميع شاشات `Layout` يعرض مدير المدرسة محمد نصر الدين ومطور ومبرمج المنصة مصطفى أحمد بأسماء واضحة وأكبر، مع رابط التواصل.
- تبسيط التذييل إلى توقيع نصي هادئ بدون بطاقات أو أيقونات بعد ملاحظات المستخدم، مع الحفاظ على حجم أسماء مقروء.

### Validation
- Production build passed.
- 235 browser checks passed: 29 main screens + 18 form/modal states × widths 320 / 360 / 390 / 430 / 768 px; zero exposed/clipped content failures or JavaScript errors after animations settle.
- Isolated fixtures; backend requests intercepted; no production writes. Browser QA uses fallback fonts and viewport emulation, not physical Android/iOS devices.
- Report and screenshots in `../scratch/mobile-audit/`.

### Backup
- `../Versions/2026-10-07_v1.3.0_BeforeMobileAudit.zip` — 46,163,256 bytes, 225 files, secrets and generated dependencies excluded.

---

## Version: v1.3.0
**Date:** 2026-10-07

### Changes
- تصميم تكوينات مختلفة لشاشات الطالب: ترحيب برسم كتاب وخطة مراجعة، بطاقات مرحلة مرقمة، مسارات صف، وخيار بارز لمكتبة «عرض الكل».
- تجميع الملفات تحت عنوان المادة بدل تكرار اسم المادة في كل صف، وإظهار هدف المراجعة «افهم الحل / جرّب بنفسك».
- الحفاظ على الهوية الكحلية والذهبية ودعم الجوال وتقليل الحركة والتنقل بلوحة المفاتيح.

### Validation
- Production build passed; browser journey and search/clear checks passed with 7 subject groups.
- Grade cards verified at 360 / 390 / 768 / 1440 px without clipping; mobile cards stack vertically.
- Desktop/mobile screenshots reviewed in `../scratch/reviews-design/creative-*.png`; no JavaScript errors in the journey or horizontal overflow in the mobile file list. External font/CDN requests were blocked in the browser QA run to avoid network stalls; screenshots use the fallback font.

### Backup
- `../Versions/2026-10-07_v1.2.2_BeforeCreativeScreens.zip` — complete platform working files; 46,157,101 bytes; secrets and generated dependencies excluded.

---

## Version: v1.2.2
**Date:** 2026-10-07

### Changes
- استعادة ألوان الكحلي والذهبي السابقة لتجربة البرجاندي والعاجي بناءً على طلب المستخدم، مع الاحتفاظ بتحسينات الواجهات والبحث.
- استعادة `src/styles/portal-design.css` حرفيًا من `../Versions/2026-10-07_PortalBeforeBurgundyIvory.css`.
- حفظ نسخة Git كاملة قبل الاستعادة في `../Versions/2026-10-07_v2.31.1_BeforeRestoreOriginalPalette.zip` ونسخة من ألوان البرجاندي في `../Versions/2026-10-07_PortalBurgundyBeforeRestore.css`.

---

## Version: v1.2.1
**Date:** 2026-10-07

### Changes
- تعديل لوحة ألوان واجهات الطالب بناءً على طلب المستخدم: خلفية برجاندي `#4b1429` وأزرار واختيارات عاجية `#f2e5d0`، ونصوص متباينة وبطاقات ملفات بدرجة برجاندي أخف.
- الاحتفاظ بنسخة من التصميم السابق في `../Versions/2026-10-07_PortalBeforeBurgundyIvory.css` وتجربة الخلفية العاجية في `../Versions/2026-10-07_PortalIvoryBackgroundTrial.css`.
- Production build passed.

---

## Version: v1.2.0
**Date:** 2026-10-07

### Changes
- إعادة تصميم رحلة الطالب بهوية كحلية وذهبية: ترحيب، تعليمات، اختيار المرحلة والصف، أنواع المراجعات والملفات.
- ترويسة موحدة، مؤشر خطوات، أيقونات SVG، بطاقات متجاوبة وتحسين التنقل بلوحة المفاتيح وتقليل الحركة.
- بحث باسم المادة أو الملف، ووسوم للمراجعات المحلولة وغير المحلولة، مع توضيح أسماء الملفات.
- الأنماط محصورة داخل واجهات الطالب عبر `student-ui`.

### Validation
- Production build passed.
- Browser journey and search/clear checks passed; no JavaScript errors or horizontal overflow at 360 / 390 / 768 / 1440 px.
- Desktop and mobile screenshots reviewed in `../scratch/reviews-design/`.

### Backup
- `../Versions/2026-10-07_v1.1.0_ReviewsPlatformBeforeVisualRefresh.zip` — 222 files; 46,149,562 bytes; secrets and generated dependencies excluded.

---

## Version: v1.1.0
**Date:** 2026-10-07

### Changes
- ????? ????? ????? CSS ?? `StageSelection.css` ?`TakeTestScreen.css` ???? ???? ???? ???? ?????????.
- ??? ???? `mohamad exam` ?????????? ???????? ?? `academic_exam_reviews` ??????? ?? ??? ???? ????? ?????? ??? ?????.
- ?????? ???? ??????? ???????? (7?12) ?? ????? ???????? ?????? (1?3)? ???? ????????? ???????? ???? ???????? ?????? ??????????.
- ????? ????? ??? Realtime? ???? ?????? ???????? ??? 30 ?????? ?????? ??????? ??? ???? ?????.
- ??? ??????? ??? (`sentToParent`) ??? ????? ????? ???????? ?? ???? ????????.

### Validation
- `npm run build --prefix "mohamad exam"` passed.
- Live service checks passed: 80 published reviews across grades 7?12 and 5 schedules; no published schedule for grade 11.

### Backup
- `Versions/2026-10-07_v2.29.0_BeforeReviewsPlatformIntegration.zip`
- `Versions/2026-10-07_v2.29.0_ReviewsIntegrationWorkingTree.zip` (working files, excluding secrets and generated dependencies).

---

## Version: v1.0.0
**Date:** 2026-06-29

### Changes
- Initial snapshot taken before GitHub push.
- Restore Point created at `Versions/2026-06-29_v1.0.0_InitialSnapshot.zip` (44939.7 KB, 224 files).
- Project description: **Exam reviews platform — React + Vite + Supabase for madrassa exams**

### Files Modified
- `Versions/2026-06-29_v1.0.0_InitialSnapshot.zip` (new — Restore Point)
- `VERSION.md` (new)
- `.gitignore` (replaced with universal template)

### GitHub
- Repo target: `https://github.com/MostafaAhmed71/exam-reviews-platform-react`
- Visibility: Public (for freelancing portfolio)

---

## Previous History
- Project created and developed prior to v1.0.0 (pre-versioning era).
- See `README.md` for the full project documentation.
