declare const __BUILD_VERSION__: string;

// Check fresh deployment metadata without touching stored sessions or user data.
export function startAutomaticUpdates() {
    if (!import.meta.env.PROD) return;
    let checking = false;

    const check = async () => {
        if (checking || document.visibilityState !== 'visible') return;
        checking = true;
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) return;
            const metadata = await response.json();
            if (typeof metadata.version !== 'string' || !/^\d+$/.test(metadata.version)) return;
            if (metadata.version === __BUILD_VERSION__) return;
            const url = new URL(window.location.href);
            // A fresh document URL also bypasses stale browser HTML caches.
            if (url.searchParams.get('_v') === metadata.version) return;
            url.searchParams.set('_v', metadata.version);
            window.location.replace(url.href);
        } catch {
            // An offline device keeps the current screen and retries later.
        } finally {
            checking = false;
        }
    };

    void check();
    window.setInterval(() => void check(), 60000);
    document.addEventListener('visibilitychange', () => void check());
    window.addEventListener('online', () => void check());
}
