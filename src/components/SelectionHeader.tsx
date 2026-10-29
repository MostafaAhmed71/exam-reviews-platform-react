import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import './SelectionHeader.css';

export function SelectionHeader({ children }: { children: ReactNode }) {
    return (
        <header className="selection-header">
            <BackButton />
            <h1 className="selection-header-title">{children}</h1>
        </header>
    );
}
