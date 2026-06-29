/**
 * مطابقة جزئية لاسم المادة → مسار أيقونة من مجلد public
 */
const SUBJECT_ICON_MAP: Record<string, string> = {
    العلوم: '/laboratory.png',
    الرياضيات: '/calculating.png',
    ' لغتي': '/arabic.png',
    'اللغة الإنجليزية': '/eng.png',
    انجليزي: '/eng.png',
    إنجليزي: '/eng.png',
    انجليزية: '/eng.png',
    إنجليزية: '/eng.png',
    'لغة إنجليزية': '/eng.png',
    'لغة انجليزية': '/eng.png',
    عربي: '/arabic.png',
    عربية: '/arabic.png',
    'لغة عربية': '/arabic.png',
    'اللغة العربية': '/arabic.png',
    لغتي: '/arabic.png',
    ' كيفايات لغوية   ': '/arabic.png',
    'كفايات لغوية': '/arabic.png',
    كفايات: '/arabic.png',
    رياضيات: '/calculating.png',
    علوم: '/laboratory.png',
    كيمياء: '/كيمياء.png',
    الكيمياء: '/كيمياء.png',
    فيزياء: '/فيزياء.png',
    الفيزياء: '/فيزياء.png',
    'علوم الأرض': '/علم ارض.png',
    'علم ارض': '/علم ارض.png',
    'علم الأرض': '/علم ارض.png',
    أحياء: '/أحياء.png',
    الأحياء: '/أحياء.png',
    احياء: '/أحياء.png',
    مجمع: '/مجمع.png',

    رقمية: '/رقمية.png',
    إسلاميات: '/quran.png',
    اسلاميات: '/quran.png',
    الإسلاميات: '/quran.png',
    اجتماعيات: '/اجتماعيات.png',
    الاجتماعيات: '/اجتماعيات.png',
    توحيد: '/quran.png',
    التوحيد: '/quran.png',
};

export function getSubjectIconPath(subjectName: string): string {
    const normalizedSubjectName = subjectName.trim();
    if (!normalizedSubjectName) return '';

    for (const [key, icon] of Object.entries(SUBJECT_ICON_MAP)) {
        const k = key.trim();
        if (
            normalizedSubjectName.includes(k) ||
            k.includes(normalizedSubjectName)
        ) {
            return icon;
        }
    }

    return '';
}
