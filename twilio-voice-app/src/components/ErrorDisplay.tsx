import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  type?: 'error' | 'warning';
  onDismiss?: () => void;
}

const ErrorDisplay = ({ message, type = 'error', onDismiss }: ErrorDisplayProps) => {
  if (!message) return null;

  return (
    <div className={`rounded-lg p-3 mb-4 flex items-center justify-between
      ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current hover:opacity-75">
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
