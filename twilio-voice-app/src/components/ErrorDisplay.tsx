import React from 'react';
import { X } from 'lucide-react';

interface ErrorDisplayProps {
    message: string;
    type?: 'error' | 'warning' | 'info';
    onDismiss?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    message,
    type = 'error',
    onDismiss
}) => {
    const getBackgroundColor = () => {
        switch (type) {
            case 'error': return 'bg-red-50 text-red-800';
            case 'warning': return 'bg-yellow-50 text-yellow-800';
            case 'info': return 'bg-blue-50 text-blue-800';
            default: return 'bg-red-50 text-red-800';
        }
    };

    return (
        <div className={`rounded-md p-4 ${getBackgroundColor()}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="ml-3 flex-shrink-0 inline-flex"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorDisplay;
