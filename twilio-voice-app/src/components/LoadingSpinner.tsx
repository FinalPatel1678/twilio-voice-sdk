import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', message }) => {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-8 h-8',
        large: 'w-12 h-12'
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-200 border-t-blue-500`} />
            {message && (
                <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
        </div>
    );
};

export default LoadingSpinner;
