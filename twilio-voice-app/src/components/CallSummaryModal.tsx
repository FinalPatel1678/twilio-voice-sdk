import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface CallSummaryData {
    phoneNumber: string;
    duration: number;
    timestamp: number;
    notes: string;
    outcome: 'success' | 'voicemail' | 'no-answer' | 'busy' | 'failed';
    followUpRequired: boolean;
}

interface CallSummaryModalProps {
    isOpen: boolean;
    callDetails: {
        phoneNumber: string;
        duration: number;
        timestamp: number;
    };
    onClose: () => void;
    onSubmit: (data: CallSummaryData) => void;
}

const CallSummaryModal: React.FC<CallSummaryModalProps> = ({
    isOpen,
    callDetails,
    onClose,
    onSubmit
}) => {
    const [formData, setFormData] = useState<CallSummaryData>({
        phoneNumber: callDetails.phoneNumber,
        duration: callDetails.duration,
        timestamp: callDetails.timestamp,
        notes: '',
        outcome: 'success',
        followUpRequired: false
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Call Summary</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="mt-1 text-gray-900">{formData.phoneNumber}</div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <div className="mt-1 text-gray-900">
                        {Math.round(formData.duration / 1000)}s
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Outcome</label>
                    <select
                        value={formData.outcome}
                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value as CallSummaryData['outcome'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="success">Success</option>
                        <option value="voicemail">Voicemail</option>
                        <option value="no-answer">No Answer</option>
                        <option value="busy">Busy</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.followUpRequired}
                        onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                        Follow-up required
                    </label>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CallSummaryModal;
