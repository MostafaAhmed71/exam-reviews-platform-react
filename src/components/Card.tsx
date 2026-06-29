import React from 'react';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    selected?: boolean;
}

export function Card({ children, onClick, className = '', selected = false }: CardProps) {
    return (
        <div
            className={`card card-enhanced card-hover-lift ${onClick ? 'card-clickable' : ''} ${selected ? 'card-selected' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}
