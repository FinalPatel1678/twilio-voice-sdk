import React from 'react';
import { X } from 'lucide-react';
import { CandidateNumber, CallDetailLoading } from '../types/call.types';
import LoadingSpinner from './LoadingSpinner';

interface CallQueueProps {
    candidateNumbers: CandidateNumber[];
    currentIndex: number;
    callDetailLoading: CallDetailLoading | null;
    isAutoDialActive: boolean;
    onRemoveNumber: (index: number) => void;
}

const CallQueue: React.FC<CallQueueProps> = ({
    candidateNumbers,
    currentIndex,
    callDetailLoading,
    isAutoDialActive,
    onRemoveNumber
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'voicemail': return 'bg-yellow-100 text-yellow-800';
            case 'no-answer': return 'bg-orange-100 text-orange-800';
            case 'busy': return 'bg-purple-100 text-purple-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'canceled': return 'bg-gray-100 text-gray-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'invalid-number': return 'bg-red-100 text-red-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderCallStatus = (item: CandidateNumber, index: number) => {
        if (callDetailLoading?.index === index) {
            return (
                <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span className="text-xs text-gray-600">{callDetailLoading.status}</span>
                </div>
            );
        }

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                    item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`}>
                {item.status}
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
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Number</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Status</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Attempt</th>
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
                                <td className="py-3 px-4 text-sm font-medium">{item.number}</td>
                                <td className="py-3 px-4">{renderCallStatus(item, index)}</td>
                                <td className="py-3 px-4">
                                    {item.attempt && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.attempt.status)}`}>
                                            {item.attempt.status}
                                            {item.attempt.duration && ` (${Math.round(item.attempt.duration / 1000)}s)`}
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => onRemoveNumber(index)}
                                        disabled={isAutoDialActive && index <= currentIndex}
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
