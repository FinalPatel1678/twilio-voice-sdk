import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { Call, Device } from '@twilio/voice-sdk';
import { getAccessToken } from '../services/twilioService';
import LocalStorageManager from '../services/localStorageManager';
import usePersistor from '../hooks/usePersistor';
import  ErrorDisplay  from './ErrorDisplay';

const USER_STATE = {
    CONNECTING: "Connecting",
    READY: "Ready",
    ON_CALL: "On call",
    OFFLINE: "Offline",
};

const numberList = [1, 2, 3, 4, 5, 6, 7, 8, 9, '+', 0, '⌫'];
const localStorageManager = new LocalStorageManager();

// Add new interfaces
interface CallAttempt {
    timestamp: number;
    duration?: number;
    status: 'success' | 'failed';
    error?: string;
}

interface TestNumber {
    id: number;
    number: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    attempts: CallAttempt[];
    lastError?: string;
}

// Enhance the AutoDialState interface
interface AutoDialState {
    isActive: boolean;
    isPaused: boolean;
    currentIndex: number;
}

const AUTO_DIAL_CONFIG = {
    MIN_CALL_DURATION: 2000, // Minimum time to wait before next call (2 seconds)
    TRANSITION_DELAY: 1000,  // Delay between calls for UI updates (1 second)  // Add retry delay
};

const ScreenDialer = () => {
    // Existing states from FloatingDialer
    const [device, setDevice] = useState<Device | null>(null);
    const [userState, setUserState] = useState<string>(USER_STATE.OFFLINE);
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [isInitialized, setIsInitialized] = useState(false);
    const [isDeviceReady, setIsDeviceReady] = useState(false);

    // Timer states
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    const [isOnCall, setIsOnCall] = usePersistor<boolean>('isOnCall', false, localStorageManager);

    // Enhanced states for better error handling
    const [testNumbers, setTestNumbers] = useState<TestNumber[]>([
        {
            id: 1,
            number: '+917359665133',
            status: 'pending',
            attempts: []
        },
        {
            id: 2,
            number: '+919714882560',
            status: 'pending',
            attempts: []
        },
        {
            id: 3,
            number: '+919727365133',
            status: 'pending',
            attempts: []
        },
    ]);

    const [autoDialState, setAutoDialState] = useState<AutoDialState>({
        isActive: false,
        isPaused: false,
        currentIndex: 0,
    });

    // Enhanced error handling
    const [errors, setErrors] = useState<{
        device?: string;
        call?: string;
        validation?: string;
    }>({});

    // Add new state for better call tracking
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);

    useEffect(() => {
        initializeDevice();
        return () => {
            if (device) {
                device.destroy();
            }
        };
    }, []);

    useEffect(() => {
        if (activeCall && callStartTime) {
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - callStartTime) / 1000)); // Update elapsed time in seconds
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setElapsedTime(0);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activeCall, callStartTime]);

    const initializeDevice = async () => {
        if (!isInitialized) {
            try {
                setUserState(USER_STATE.CONNECTING);
                setIsLoading(true);
                const tokenData = await getAccessToken();

                if (!tokenData?.token) {
                    throw new Error('Failed to get access token');
                }

                const newDevice = new Device(tokenData.token, {
                    edge: 'ashburn',
                    closeProtection: 'You have an active call. Leaving or reloading this page will disconnect the call. Are you sure you want to continue?',
                    logLevel: 4,
                });

                setDevice(newDevice);
                setIsInitialized(true);
                setIsDeviceReady(true);
                setUserState(USER_STATE.READY);

                newDevice.register();
                newDevice.on('tokenWillExpire', async () => {
                    const token = await getAccessToken();
                    newDevice.updateToken(token.token);
                });

                newDevice.on('registered', () => setUserState(USER_STATE.READY));
                newDevice.on('disconnect', handleCallDisconnect);
                newDevice.on('error', handleDeviceError);
            } catch (error: any) {
                const errorMessage = error.message || 'Failed to initialize device';
                setErrors(prev => ({ ...prev, device: errorMessage }));
                setUserState(USER_STATE.OFFLINE);
                setIsDeviceReady(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCallConnect = (call: Call) => {
        if (!call) return;

        setActiveCall(call);
        setUserState(USER_STATE.ON_CALL);
        setCallStartTime(Date.now());
        setIsOnCall(true);
        setErrorMessage('');

        // Ensure proper mute state
        setIsMuted(call.isMuted());
    };

    const handleCallDisconnect = () => {
        if (activeCall) {
            activeCall.removeAllListeners();  // Clean up all listeners
        }

        setActiveCall(null);
        setUserState(USER_STATE.READY);
        setCallStartTime(null);
        setIsOnCall(false);
        setErrorMessage('');
        setIsMuted(false);
    };

    const handleDeviceError = async (error: { code: number; message?: string }) => {
        console.error('Device error:', error);
        if (error?.code === 20101) {
            const token = await getAccessToken();
            device?.updateToken(token.token);
        }
        setUserState(USER_STATE.OFFLINE);
    };

    // Enhanced validatePhoneNumber with more robust validation
    const validatePhoneNumber = (number: string) => {
        // Remove any spaces and special characters except +
        const cleanNumber = number.replace(/[^\d+]/g, '');
        // Must start with + and contain 10-15 digits
        const phoneRegex = /^\+?\d{10,15}$/;
        return phoneRegex.test(cleanNumber);
    };

    // Common makeCall function for both manual and auto-dial
    const makeCall = async (phoneNumber: string, options?: {
        isAutoDial?: boolean,
        index?: number,
        callId?: string
    }) => {
        if (!device || !isDeviceReady) {
            throw new Error('Device not ready');
        }

        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!validatePhoneNumber(cleanNumber)) {
            throw new Error('Invalid phone number');
        }

        const call = await device.connect({
            params: { To: cleanNumber },
            rtcConstraints: { audio: true }
        });

        // Set up base call management
        setActiveCall(call);
        const startTime = Date.now();

        // Set up common call event handlers
        call.on('accept', () => {
            setPhoneNumber(cleanNumber);
            handleCallConnect(call);
            setIsMuted(false);
        });

        call.on('mute', (isMuted) => {
            setIsMuted(isMuted);
        });

        call.on('disconnect', () => {
            const duration = Date.now() - startTime;
            handleCallDisconnect();

            // Handle auto-dial specific logic
            if (options?.isAutoDial && options.index !== undefined) {
                if (autoDialState.isActive && !autoDialState.isPaused) {
                    handleCallSuccess(options.index, duration);
                }
            }
        });

        call.on('error', (error) => {
            console.error('Call error:', error);
            handleCallDisconnect();
            
            if (options?.isAutoDial && options.index !== undefined) {
                handleCallError(error, options.index);
            } else {
                setErrorMessage(`Call failed: ${error.message || 'Unknown error'}`);
            }
        });

        return call;
    };

    // Simplified handleCall for manual dialing
    const handleCall = async () => {
        setErrors({});

        if (isLoading || isOnCall) {
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            await makeCall(phoneNumber);
        } catch (error: any) {
            console.error('Error making call:', error);
            setErrorMessage(`Failed to make call: ${error.message || 'Unknown error'}`);
            setUserState(USER_STATE.READY);
            setIsOnCall(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Remove the first simpler makeAutoCall and keep only this enhanced version
    const makeAutoCall = async (index: number) => {
        if (!device || index >= testNumbers.length) {
            stopAutoDial();
            return;
        }
    
        const currentNumber = testNumbers[index];
        const callId = `call-${Date.now()}`;
        setCurrentCallId(callId);
    
        try {
            // Update number status before making the call
            setTestNumbers(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    status: 'in-progress',
                };
                return updated;
            });
    
            const call = await device.connect({
                params: { To: currentNumber.number },
                rtcConstraints: { audio: true }
            });
    
            // Set up call management
            setActiveCall(call);  // This enables mute and hangup controls
            const startTime = Date.now();
            let callCompleted = false;
    
            call.on('accept', () => {
                if (currentCallId !== callId) return; // Prevent stale calls
                setPhoneNumber(currentNumber.number);
                handleCallConnect(call);
                // Reset mute state for new call
                setIsMuted(false);
            });
    
            // Add mute state handler
            call.on('mute', (isMuted) => {
                setIsMuted(isMuted);
            });
    
            call.on('disconnect', () => {
                if (currentCallId !== callId || callCompleted) return;
                callCompleted = true;
    
                const duration = Date.now() - startTime;
                handleCallDisconnect();
                if (autoDialState.isActive && !autoDialState.isPaused) {
                    handleCallSuccess(index, duration);
                }
            });
    
            call.on('error', (error) => {
                if (currentCallId !== callId || callCompleted) return;
                callCompleted = true;
                handleCallError(error, index);
            });
    
        } catch (error: any) {
            if (currentCallId === callId) {
                handleCallError(error, index);
            }
        }
    };

    // Modify toggleMute to work with auto-dialing
    const toggleMute = () => {
        if (activeCall) {
            try {
                activeCall.mute(!isMuted);
                setIsMuted(!isMuted);
            } catch (error) {
                console.error('Error toggling mute:', error);
            }
        }
    };

    // Modify handleHangUp to work with auto-dialing
    const handleHangUp = () => {
        if (activeCall) {
            const wasAutoDialActive = autoDialState.isActive;
            const currentIndex = autoDialState.currentIndex;

            try {
                activeCall.disconnect();
                // Update the current number's status
                setTestNumbers(prev => {
                    const updated = [...prev];
                    if (currentIndex < updated.length) {
                        updated[currentIndex] = {
                            ...updated[currentIndex],
                            status: 'completed',
                            attempts: [
                                ...updated[currentIndex].attempts,
                                {
                                    timestamp: Date.now(),
                                    duration: callStartTime ? Date.now() - callStartTime : 0,
                                    status: 'success'
                                }
                            ]
                        };
                    }
                    return updated;
                });
            } catch (error) {
                console.error('Error disconnecting call:', error);
            }

            handleCallDisconnect();

            // Only proceed to next number if auto-dial is active and not paused
            if (wasAutoDialActive && !autoDialState.isPaused) {
                setTimeout(() => {
                    processNextNumber(currentIndex + 1);
                }, AUTO_DIAL_CONFIG.TRANSITION_DELAY);
            }
        }
    };

    const formatElapsedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case USER_STATE.CONNECTING: return 'bg-yellow-400';
            case USER_STATE.READY: return 'bg-green-500';
            case USER_STATE.ON_CALL: return 'bg-red-500';
            case USER_STATE.OFFLINE: return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    // Add new error handling functions
    const handleCallError = async (error: any, index: number) => {
        // Update status and move to next number immediately
        setTestNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status: 'failed',
                lastError: error.message,
                attempts: [
                    ...updated[index].attempts,
                    {
                        timestamp: Date.now(),
                        status: 'failed',
                        error: error.message
                    }
                ]
            };
            return updated;
        });

        // Short delay for UI update before moving to next number
        await new Promise(resolve => setTimeout(resolve, AUTO_DIAL_CONFIG.TRANSITION_DELAY));
        processNextNumber(index + 1);
    };

    // Add better state tracking for processNextNumber
    const processNextNumber = (nextIndex: number) => {
        if (nextIndex >= testNumbers.length || !autoDialState.isActive) {
            stopAutoDial();
            return;
        }

        setAutoDialState(prev => ({ ...prev, currentIndex: nextIndex }));

        if (!autoDialState.isPaused) {
            setTimeout(() => {
                makeAutoCall(nextIndex);
            }, AUTO_DIAL_CONFIG.TRANSITION_DELAY);
        }
    };

    // Improved handleCallSuccess with better state management
    const handleCallSuccess = async (index: number, duration: number) => {
        // Update the current number's status first
        setTestNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status: 'completed',
                attempts: [
                    ...updated[index].attempts,
                    {
                        timestamp: Date.now(),
                        duration,
                        status: 'success'
                    }
                ]
            };
            return updated;
        });

        // Small delay for UI update
        await new Promise(resolve => setTimeout(resolve, AUTO_DIAL_CONFIG.TRANSITION_DELAY));

        // Update auto-dial state and process next call
        setAutoDialState(prev => {
            const nextIndex = index + 1;
            if (nextIndex >= testNumbers.length) {
                return { isActive: false, isPaused: false, currentIndex: 0 };
            }
            return { ...prev, currentIndex: nextIndex };
        });

        // Process next call if auto-dial is still active
        if (autoDialState.isActive && !autoDialState.isPaused) {
            processNextNumber(index + 1);
        }
    };

    // Enhanced auto-dial control functions
    const startAutoDial = async () => {
        if (!device || !isDeviceReady || testNumbers.length === 0) {
            setErrorMessage('Cannot start auto-dial: device not ready or no numbers');
            return;
        }

        // Reset all numbers to pending state
        const resetNumbers = testNumbers.map(num => ({
            ...num,
            status: 'pending' as const,
            attempts: [],
            lastError: undefined
        }));

        setTestNumbers(resetNumbers);
        setAutoDialState({
            isActive: true,
            isPaused: false,
            currentIndex: 0,
        });

        // Start with the first call
        makeAutoCall(0);
    };

    // Enhance pause/resume functionality
    const pauseAutoDial = () => {
        setAutoDialState(prev => ({ ...prev, isPaused: true }));
        // Don't disconnect ongoing call, just pause the sequence
    };

    const resumeAutoDial = () => {
        setAutoDialState(prev => ({ ...prev, isPaused: false }));
        
        // Only start next call if there's no active call
        if (!activeCall && autoDialState.currentIndex < testNumbers.length) {
            setTimeout(() => {
                makeAutoCall(autoDialState.currentIndex);
            }, AUTO_DIAL_CONFIG.TRANSITION_DELAY);
        }
    };

    // Enhanced stopAutoDial with proper cleanup
    const stopAutoDial = () => {
        setAutoDialState({
            isActive: false,
            isPaused: false,
            currentIndex: 0,
        });
        setCurrentCallId(null);
        
        // Don't disconnect ongoing call, just stop the sequence
    };

    // Add error dismissal handlers
    const dismissError = (type: keyof typeof errors) => {
        setErrors(prev => ({ ...prev, [type]: undefined }));
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-6xl mx-auto space-y-4">
                {/* Error Displays */}
                {errors.device && (
                    <ErrorDisplay 
                        message={errors.device}
                        type="error"
                        onDismiss={() => dismissError('device')}
                    />
                )}
                {errors.validation && (
                    <ErrorDisplay 
                        message={errors.validation}
                        type="warning"
                        onDismiss={() => dismissError('validation')}
                    />
                )}
                {errors.call && (
                    <ErrorDisplay 
                        message={errors.call}
                        type="error"
                        onDismiss={() => dismissError('call')}
                    />
                )}

                {/* Header with Status */}
                <div className="bg-white rounded-lg shadow-sm p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${getStateColor(userState)}`} />
                            <span className="text-base font-medium text-gray-700">{userState}</span>
                        </div>
                        {activeCall && (
                            <div className="text-base font-semibold text-gray-700">
                                {formatElapsedTime(elapsedTime)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Panel - Dialer */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h2 className="text-lg font-semibold mb-3">Dialer</h2>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={isDeviceReady ? "Enter phone number" : "Initializing..."}
                            disabled={!isDeviceReady || !!activeCall || isLoading}
                        />

                        {!activeCall ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {numberList.map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            if (!isDeviceReady || activeCall) return;
                                            if (value === '⌫') {
                                                setPhoneNumber(phoneNumber.slice(0, -1));
                                            } else {
                                                setPhoneNumber(phoneNumber + value);
                                            }
                                        }}
                                        disabled={!isDeviceReady || !!activeCall || isLoading}
                                        className="h-10 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-3 flex justify-center gap-3">
                                <button
                                    onClick={toggleMute}
                                    className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={handleHangUp}
                                    className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={activeCall ? handleHangUp : handleCall}
                            disabled={
                                !isDeviceReady ||
                                isLoading ||
                                (!phoneNumber && !activeCall) ||
                                (autoDialState.isActive && !activeCall)
                            }
                            className={`mt-4 w-full py-2 rounded-lg font-medium text-white text-base transition-colors
                                ${activeCall ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Connecting...' : activeCall ? 'End Call' : 'Call'}
                        </button>

                        {errorMessage && (
                            <div className="mt-2 text-xs text-red-500 text-center">{errorMessage}</div>
                        )}
                    </div>

                    {/* Middle Panel - Auto Dial Controls */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h2 className="text-lg font-semibold mb-3">Auto-Dial Controls</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                    Progress: {autoDialState.currentIndex}/{testNumbers.length}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={startAutoDial}
                                        disabled={
                                            !isDeviceReady ||
                                            autoDialState.isActive ||
                                            !!activeCall ||  // Add this condition
                                            testNumbers.length === 0  // Only check if there are numbers to dial
                                        }
                                        className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 transition-colors"
                                    >
                                        Start
                                    </button>
                                    {autoDialState.isActive && (
                                        <>
                                            {autoDialState.isPaused ? (
                                                <button
                                                    onClick={resumeAutoDial}
                                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm transition-colors"
                                                >
                                                    Resume
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={pauseAutoDial}
                                                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-md text-sm transition-colors"
                                                >
                                                    Pause
                                                </button>
                                            )}
                                            <button
                                                onClick={stopAutoDial}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm transition-colors"
                                            >
                                                Stop
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Numbers List */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h2 className="text-lg font-semibold mb-3">Call Queue</h2>
                        <div className="overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left text-xs font-medium text-gray-500">
                                            <th className="py-2 px-3">#</th>
                                            <th className="py-2 px-3">Number</th>
                                            <th className="py-2 px-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {testNumbers.map((item, index) => (
                                            <tr
                                                key={item.id}
                                                className={`text-xs ${index === autoDialState.currentIndex
                                                        ? 'bg-blue-50'
                                                        : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <td className="py-2 px-3">{item.id}</td>
                                                <td className="py-2 px-3">{item.number}</td>
                                                <td className="py-2 px-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                                        ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                                item.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        {item.status}
                                                    </span>
                                                    {item.lastError && (
                                                        <span className="ml-2 text-xs text-red-500">
                                                            {item.lastError}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScreenDialer;
