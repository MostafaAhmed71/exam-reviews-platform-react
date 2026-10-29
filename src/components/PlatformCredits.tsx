import './PlatformCredits.css';

export function PlatformCredits({ directorName = 'محمد نصر الدين' }: { directorName?: string }) {
    return (
        <footer className="platform-credits" aria-label="مدير المدرسة">
            <div className="credit-card">
                <span className="credit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c4 3 8 3 12 0v-6M22 9v8" /></svg></span>
                <div className="credit-details"><span className="credit-role">مدير المدرسة</span><strong className="credit-name">{directorName}</strong></div>
            </div>
        </footer>
    );
}
