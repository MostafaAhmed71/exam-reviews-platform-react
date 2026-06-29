import { navigateBack, canGoBack } from '@/lib/navigation';
import './BackButton.css';

export function BackButton() {
    if (!canGoBack()) {
        return null;
    }

    return (
        <button 
            className="back-button"
            onClick={navigateBack}
            aria-label="رجوع"
        >
            <span className="back-icon">←</span>
            <span className="back-text">رجوع</span>
        </button>
    );
}

