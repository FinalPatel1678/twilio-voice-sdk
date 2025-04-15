import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CandidateNumber, CallDetailLoading } from '../types/call.types';
import LoadingSpinner from './LoadingSpinner';
import { Call } from '@twilio/voice-sdk';

// Add type safety for status values
type CallStatus = 'success' | 'voicemail' | 'no-answer' | 'busy' | 'failed' |
    'canceled' | 'rejected' | 'invalid-number' | 'error';
type QueueStatus = 'completed' | 'in-progress' | 'failed' | 'pending';

interface CallQueueProps {
    candidateNumbers: CandidateNumber[];
    currentIndex: number;
    callDetailLoading: CallDetailLoading | null;
    isAutoDialActive: boolean;
    activeCall: Call | null;
    onRemoveNumber: (index: number) => void;
}

const CallQueue: React.FC<CallQueueProps> = ({
    candidateNumbers,
    currentIndex,
    callDetailLoading,
    isAutoDialActive,
    activeCall,
    onRemoveNumber
}) => {
    const [expandedErrors, setExpandedErrors] = useState<Record<number, boolean>>({});

    const toggleErrorExpansion = (index: number) => {
        setExpandedErrors((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const getCallStatusColor = (status: CallStatus) => {
        const colorMap: Record<CallStatus, string> = {
            'success': 'bg-green-100 text-green-800',
            'voicemail': 'bg-yellow-100 text-yellow-800',
            'no-answer': 'bg-orange-100 text-orange-800',
            'busy': 'bg-purple-100 text-purple-800',
            'failed': 'bg-red-100 text-red-800',
            'canceled': 'bg-gray-100 text-gray-800',
            'rejected': 'bg-red-100 text-red-800',
            'invalid-number': 'bg-red-100 text-red-800',
            'error': 'bg-red-100 text-red-800'
        };
        return colorMap[status] || 'bg-gray-100 text-gray-800';
    };

    const getQueueStatusColor = (status: QueueStatus) => {
        const colorMap: Record<QueueStatus, string> = {
            'completed': 'bg-green-100 text-green-800',
            'in-progress': 'bg-blue-100 text-blue-800',
            'failed': 'bg-red-100 text-red-800',
            'pending': 'bg-gray-100 text-gray-800'
        };
        return colorMap[status] || 'bg-gray-100 text-gray-800';
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatDuration = (duration: number) => {
        const seconds = Math.round(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const renderQueueStatus = (item: CandidateNumber) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getQueueStatusColor(item.status as QueueStatus)}`}>
            {item.status}
        </span>
    );

    const renderCallStatus = (item: CandidateNumber, index: number) => {
        if (callDetailLoading?.index === index) {
            return (
                <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span className="text-xs text-gray-600">{callDetailLoading.status}</span>
                </div>
            );
        }

        return item.attempt?.status ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCallStatusColor(item.attempt.status as CallStatus)}`}>
                {item.attempt.status}
            </span>
        ) : null;
    };

    const RenderError: React.FC<{ error?: string; index: number }> = ({ error, index }) => {
        if (!error) return <span>-</span>;

        const showFullError = expandedErrors[index] || false;
        const truncatedError = error.length > 20 ? `${error.substring(0, 20)}...` : error;

        return (
            <span className="text-red-600 font-medium text-sm">
                {showFullError ? error : truncatedError}
                {error.length > 20 && (
                    <button
                        onClick={() => toggleErrorExpansion(index)}
                        className="ml-2 text-blue-600 underline hover:no-underline text-xs"
                    >
                        {showFullError ? 'See less' : 'See more'}
                    </button>
                )}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Call Queue</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">#</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Name</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Number</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Queue Status</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Call Status</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Duration</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Start Time</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">End Time</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Error</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {candidateNumbers.map((item, index) => (
                            <tr
                                key={item.id}
                                className={`${index === currentIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <td className="py-3 px-4 text-sm">{index + 1}</td>
                                <td className="py-3 px-4 text-sm font-medium">{item.name || '-'}</td>
                                <td className="py-3 px-4 text-sm font-medium">{item.number}</td>
                                <td className="py-3 px-4">{renderQueueStatus(item)}</td>
                                <td className="py-3 px-4">{renderCallStatus(item, index) || '-'}</td>
                                <td className="py-3 px-4 text-sm">
                                    {item.attempt?.duration ? formatDuration(item.attempt.duration) : '-'}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                    {item.attempt?.answerTime ? formatTimestamp(item.attempt.answerTime) : '-'}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                    {item.attempt?.endTime ? formatTimestamp(item.attempt.endTime) : '-'}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                    <RenderError error={item.attempt?.error} index={index} />
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => onRemoveNumber(index)}
                                        disabled={
                                            (isAutoDialActive && index <= currentIndex) || // Disable for processed numbers during auto-dial
                                            (index === currentIndex && candidateNumbers[index]?.status === 'in-progress') || // Disable if the current call is in progress
                                            !!activeCall // Disable if there is an active call
                                        }
                                        className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CallQueue;
