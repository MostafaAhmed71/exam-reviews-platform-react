import React from 'react';
import { useStore } from '@nanostores/react';
import { currentScreen } from '@/lib/navigation';
import { PlatformCredits } from './PlatformCredits';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
    directorName?: string;
}

export function Layout({ children, directorName }: LayoutProps) {
    const screen = useStore(currentScreen);
    const studentScreens = ['welcome', 'terms', 'stage', 'grade', 'reviewType', 'subject', 'subject-materials', 'schedule'];
    const studentUI = studentScreens.includes(screen);
    return (
        <div className={`layout${studentUI ? ' student-ui' : ''}${screen === 'welcome' ? ' welcome-layout' : ''}${screen === 'stage' || screen === 'grade' ? ' selection-layout' : ''}${screen === 'stage' ? ' stage-layout' : ''}`}>
            <main className="layout-main">{children}</main>
            <PlatformCredits directorName={directorName} />
        </div>
    );
}
