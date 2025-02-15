import React, { useState } from 'react';

interface CallSummaryModalProps {
    isOpen: boolean;
    callDetails: {
        phoneNumber: string;
        duration: number;
        timestamp: number;
    };
    onClose: () => void;
    onSubmit: (summary: CallSummaryData) => void;
}

export interface CallSummaryData {
    phoneNumber: string;
    duration: number;
    timestamp: number;
    notes: string;
    outcome: 'successful' | 'unsuccessful' | 'no-answer';
    followUpRequired: boolean;
}

const CallSummaryModal: React.FC<CallSummaryModalProps> = ({
    isOpen,
    callDetails,
    onClose,
    onSubmit,
}) => {
    const [notes, setNotes] = useState('');
    const [outcome, setOutcome] = useState<'successful' | 'unsuccessful' | 'no-answer'>('successful');
    const [followUpRequired, setFollowUpRequired] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...callDetails,
            notes,
            outcome,
            followUpRequired,
        });
        setNotes('');
        setOutcome('successful');
        setFollowUpRequired(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Call Summary</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <div className="text-gray-900 p-2 bg-gray-50 rounded-md">
                            {callDetails.phoneNumber}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Call Duration
                        </label>
                        <div className="text-gray-900 p-2 bg-gray-50 rounded-md">
                            {Math.floor(callDetails.duration / 1000)} seconds
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Call Outcome
                        </label>
                        <select
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value as any)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="successful">Successful</option>
                            <option value="unsuccessful">Unsuccessful</option>
                            <option value="no-answer">No Answer</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter call notes here..."
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="followUp"
                            checked={followUpRequired}
                            onChange={(e) => setFollowUpRequired(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="followUp" className="text-sm text-gray-900">
                            Follow-up required
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            Save & Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CallSummaryModal;
