import { navigateToAdmin } from '../lib/navigation';
import './AdminAccessButton.css';

/**
 * Hidden Admin Access Button
 * Triple-click on the footer text to reveal this button
 */
export function AdminAccessButton() {
    const handleTripleClick = () => {
        const confirmed = window.confirm('هل تريد الدخول إلى لوحة تحكم المدير؟');
        if (confirmed) {
            navigateToAdmin();
        }
    };

    return (
        <div
            className="admin-access-trigger"
            onDoubleClick={handleTripleClick}
            title="انقر مرتين للوصول للوحة المدير"
        >
            {/* Hidden trigger - appears as normal text */}
        </div>
    );
}
