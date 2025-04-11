import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Call } from '@twilio/voice-sdk';
import { USER_STATE } from '../types/call.types';

interface StatusBarProps {
    userState: string;
    activeCall: Call | null;
    phoneNumber: string;
    isMuted: boolean;
    elapsedTime: number;
    isLoading: boolean;
    isDeviceReady: boolean;
    onToggleMute: () => void;
    onCall: () => void;
    onHangUp: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
    userState,
    activeCall,
    phoneNumber,
    isMuted,
    elapsedTime,
    isLoading,
    isDeviceReady,
    onToggleMute,
    onCall,
    onHangUp
}) => {
    const getStateColor = (state: string) => {
        switch (state) {
            case USER_STATE.CONNECTING: return 'bg-yellow-400';
            case USER_STATE.READY: return 'bg-green-500';
            case USER_STATE.ON_CALL: return 'bg-red-500';
            case USER_STATE.OFFLINE: return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    const formatElapsedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStateColor(userState)}`} />
                        <span className="text-lg font-medium text-gray-700">{userState}</span>
                    </div>
                    {activeCall && (
                        <div className="flex items-center gap-x-2">
                            <span className="text-gray-500">Current call:</span>
                            <span className="font-mono text-lg">{phoneNumber}</span>
                        </div>
                    )}
                </div>
                {activeCall && (
                    <div className="flex items-center gap-x-3">
                        {elapsedTime ? (
                            <div className="text-lg font-mono bg-gray-100 px-3 py-1 rounded-md">
                                {formatElapsedTime(elapsedTime)}
                            </div>
                        ) : null}
                        <button
                            onClick={onToggleMute}
                            className={`p-2.5 rounded-full transition-colors ${isMuted ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'}`}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={activeCall ? onHangUp : onCall}
                            disabled={!isDeviceReady || isLoading || (!phoneNumber && !activeCall)}
                            className={`max-w-[100px] py-2 px-4 rounded-lg font-medium text-white text-base transition-colors
                            ${activeCall ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Connecting...' : activeCall ? 'End Call' : 'Call'}
                        </button>
                    </div>
                )}


            </div>
        </div>
    );
};

export default StatusBar;
