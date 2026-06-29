import React from 'react';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
    directorName?: string;
}

export function Layout({ children, showFooter = false, directorName }: LayoutProps) {
    return (
        <div className="layout">
            <main className="layout-main">{children}</main>
            {showFooter && directorName && (
                <footer className="layout-footer">
                    <div className="footer-content">
                        <div className="footer-text-wrapper">
                            <span className="footer-label">مدير المدرسة</span>
                            <span className="footer-name">{directorName}</span>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
