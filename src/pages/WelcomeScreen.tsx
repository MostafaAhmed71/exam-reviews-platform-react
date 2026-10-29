import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { navigateTo } from '@/lib/navigation';
import { trackVisitor } from '@/services/trackingService';
import { LearningArtwork } from '@/components/LearningArtwork';
import './WelcomeScreen.css';
import './PremiumWelcome.css';

type WelcomeIconName = 'cap' | 'school' | 'book' | 'pen' | 'calendar' | 'arrow';
function WelcomeIcon({ name }: { name: WelcomeIconName }) {
    const paths: Record<WelcomeIconName, string> = {
        cap: 'm2 9 10-5 10 5-10 5-10-5Zm4 3v5c4 3 8 3 12 0v-5M22 9v8',
        school: 'M4 21V9l8-6 8 6v12M2 21h20M9 21v-6h6v6M8 10h1m6 0h1M8 13h1m6 0h1M12 7v2',
        book: 'M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15M5 8h3m-3 4h3m8-4h3m-3 4h3',
        pen: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Zm0 0 5-1',
        calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-3v6m10-6v6M3 10h18M7 14h2m6 0h2m-10 3h2',
        arrow: 'M19 12H5m6-6-6 6 6 6',
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function WelcomeScreen() {
    useEffect(() => {
        trackVisitor('welcome');
    }, []);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Swipe gesture detection
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;

        if (isLeftSwipe) {
            navigateTo('terms');
        }
    };

    const handleStartClick = () => {
        navigateTo('terms');
    };

    return (
        <Layout showFooter={false}>
            <div 
                className="welcome-screen elite-welcome"
                dir="rtl"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="elite-edge elite-edge-top" aria-hidden="true" />
                <div className="elite-edge elite-edge-bottom" aria-hidden="true" />
                <div className="elite-entry">
                    <header className="elite-school-header">
                        <img src="/logo.jpeg" alt="شعار مدرسة نخبة الشمال الأهلية" className="elite-school-logo" loading="eager" />
                        <h1 className="elite-school-name"><span>متوسطة وثانوية</span><strong>نخبة الشمال الأهلية</strong></h1>
                    </header>
                    <div className="elite-hero">
                        <div className="elite-hero-visual">
                            <LearningArtwork />
                            <span className="elite-art-badge elite-badge-reviews"><WelcomeIcon name="book" />مراجعات شاملة</span>
                            <span className="elite-art-badge elite-badge-subjects"><WelcomeIcon name="cap" />مواد متنوعة</span>
                            <span className="elite-art-badge elite-badge-tests"><WelcomeIcon name="pen" />اختبارات تفاعلية</span>
                        </div>
                    </div>
                    <div className="elite-entry-actions">
                        <div className="elite-period-card"><span className="elite-card-icon"><WelcomeIcon name="cap" /></span><p>الفترة الأولى للفصل الدراسي الأول</p></div>
                        <Button variant="primary" fullWidth className="elite-start-button" onClick={handleStartClick}>
                            <span>ابدأ المراجعة</span><span className="elite-cta-arrow"><WelcomeIcon name="arrow" /></span>
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
