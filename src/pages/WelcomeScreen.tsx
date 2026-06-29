import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { navigateTo } from '@/lib/navigation';
import { trackVisitor } from '@/services/trackingService';
import './WelcomeScreen.css';

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
                className="welcome-screen"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Background */}
                <div className="welcome-background"></div>

                {/* Glass Container */}
                <div className="glass-container">
                    {/* Main Content */}
                    <div className="welcome-content">
                        {/* Logo */}
                        <div className="welcome-logo">
                            <img 
                                src="/logo.jpeg" 
                                alt="شعار المدرسة" 
                                className="logo-image"
                                loading="eager"
                            />
                        </div>

                        {/* Main Title */}
                        <h1 className="welcome-title">
                            منصة النخبة المراجعات النهائية
                        </h1>

                        {/* Subtitle */}
                        <p className="welcome-subtitle">
                            الفترة الثانية الفصل الدراسي الثاني
                        </p>

                        {/* School Name */}
                        <p className="welcome-school-name">
                            متوسطة وثانوية نخبة الشمال الأهلية
                        </p>

                        {/* Start Button */}
                        <Button 
                            variant="primary" 
                            fullWidth 
                            className="start-button"
                            onClick={handleStartClick}
                        >
                            ابدأ
                        </Button>

                        {/* Director Name */}
                        <div className="director-info">
                            <p className="director-label">مدير المدرسة</p>
                            <p className="director-name">محمد نصر الدين</p>
                        </div>

                        {/* Developer Info */}
                        <div className="developer-card">
                            <span className="developer-name">مطور ومبرمج المنصة: مصطفى أحمد</span>
                            <a 
                                href="https://wa.me/966543641209" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="developer-phone"
                            >
                                0543641209
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
