/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    /** رابط بوت تليجرام، مثل https://t.me/your_bot */
    readonly VITE_TELEGRAM_BOT_URL?: string
    /** ضع القيمة `true` لإظهار زر البوت العائم؛ غير مفعّل = مخفي */
    readonly VITE_SHOW_TELEGRAM_BOT?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// MathJax types
interface MathJax {
    typesetPromise?: () => Promise<void>;
}

interface Window {
    MathJax?: MathJax;
}