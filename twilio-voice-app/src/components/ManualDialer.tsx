import React from 'react';
import { Call } from '@twilio/voice-sdk';

interface ManualDialerProps {
    phoneNumber: string;
    isDeviceReady: boolean;
    activeCall: Call | null;
    isLoading: boolean;
    onPhoneNumberChange: (value: string) => void;
    onCall: () => void;
    onHangUp: () => void;
}

const ManualDialer: React.FC<ManualDialerProps> = ({
    phoneNumber,
    isDeviceReady,
    activeCall,
    isLoading,
    onPhoneNumberChange,
    onCall,
    onHangUp
}) => {
    const numberList = [1, 2, 3, 4, 5, 6, 7, 8, 9, '+', 0, '⌫'];

    const handleNumberClick = (value: number | string) => {
        if (!isDeviceReady || activeCall) return;
        if (value === '⌫') {
            onPhoneNumberChange(phoneNumber.slice(0, -1));
        } else {
            onPhoneNumberChange(phoneNumber + value);
        }
    };

    return (
        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Manual Dialer</h2>
            </div>
            <div className="p-4 space-y-4">
                <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={phoneNumber}
                    placeholder="Manual dialing is disabled"
                    disabled={true} // Disable the input field
                />

                <div className="grid grid-cols-3 gap-3">
                    {numberList.map((value) => (
                        <button
                            key={value}
                            disabled={true} // Disable all buttons
                            className="h-12 rounded-md bg-gray-50 text-gray-400 text-lg font-medium cursor-not-allowed"
                        >
                            {value}
                        </button>
                    ))}
                </div>

                <button
                    onClick={activeCall ? onHangUp : onCall}
                    disabled={!isDeviceReady || isLoading || (!phoneNumber && !activeCall)}
                    className={`w-full py-3 rounded-lg font-medium text-white text-base transition-colors
                        ${activeCall ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? 'Connecting...' : activeCall ? 'End Call' : 'Call'}
                </button>
            </div>
        </div>
    );
};

export default ManualDialer;
