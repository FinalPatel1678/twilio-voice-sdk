import React from 'react';
import { AutoDialState } from '../types/call.types';

interface AutoDialControlsProps {
    autoDialState: AutoDialState;
    isDeviceReady: boolean;
    activeCall: boolean;
    totalNumbers: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
}

const AutoDialControls: React.FC<AutoDialControlsProps> = ({
    autoDialState,
    isDeviceReady,
    activeCall,
    totalNumbers,
    onStart,
    onPause,
    onResume,
    onStop
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Auto-Dial Controls</h2>
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-500">Progress</div>
                        <div className="text-2xl font-semibold">
                            {autoDialState.currentIndex}/{totalNumbers}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onStart}
                            disabled={!isDeviceReady || autoDialState.isActive || activeCall || totalNumbers === 0}
                            className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 transition-colors"
                        >
                            Start Auto-Dial
                        </button>
                        {autoDialState.isActive && (
                            <>
                                {autoDialState.isPaused ? (
                                    <button
                                        onClick={onResume}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={onPause}
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-medium hover:bg-yellow-600 transition-colors"
                                    >
                                        Pause
                                    </button>
                                )}
                                <button
                                    onClick={onStop}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
                                >
                                    Stop
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoDialControls;
