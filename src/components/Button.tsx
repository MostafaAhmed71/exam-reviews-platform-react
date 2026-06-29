import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit';
    className?: string;
    style?: React.CSSProperties;
}

export function Button({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    fullWidth = false,
    type = 'button',
    className = '',
    style,
}: ButtonProps) {
    return (
        <motion.button
            className={`button ${variant} ${fullWidth ? 'full-width' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
            type={type}
            style={style}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
            {children}
        </motion.button>
    );
}
