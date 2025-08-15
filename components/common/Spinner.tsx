
import React from 'react';

interface SpinnerProps {
    size?: 'small' | 'medium' | 'large';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'small' }) => {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-6 h-6',
        large: 'w-8 h-8'
    };
    return (
        <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`}
            role="status"
            aria-live="polite"
        >
             <span className="sr-only">در حال بارگذاری...</span>
        </div>
    );
};

export default Spinner;
