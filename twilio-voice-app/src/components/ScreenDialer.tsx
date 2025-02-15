import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { Call, Device } from '@twilio/voice-sdk';
import { getAccessToken } from '../services/twilioService';
import LocalStorageManager from '../services/localStorageManager';
import usePersistor from '../hooks/usePersistor';
import ErrorDisplay from './ErrorDisplay';
import CallSummaryModal from './CallSummaryModal';
import type { CallSummaryData } from './CallSummaryModal';

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
    number: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    attempt?: CallAttempt;
    lastError?: string;
}

// Enhance the AutoDialState interface
interface AutoDialState {
    isActive: boolean;
    isPaused: boolean;
    currentIndex: number;
}

// Add retry configuration
const AUTO_DIAL_CONFIG = {
    TRANSITION_DELAY: 1000,  // Delay between calls for UI updates (1 second)
};

// Enhance the logger
const logger = {
    info: (message: string, data?: any) => {
        console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${message}`, error ? {
            message: error.message,
            stack: error.stack,
            details: error
        } : '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    debug: (message: string, data?: any) => {
        console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    state: (component: string, data: any) => {
        console.log(`[STATE][${component}]`, JSON.stringify(data, null, 2));
    }
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
            number: '+917359665133',
            status: 'pending',
        },
        {
            number: '+919727365133',
            status: 'pending',
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

    // Add new state for modal
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [completedCallDetails, setCompletedCallDetails] = useState<{
        phoneNumber: string;
        duration: number;
        timestamp: number;
    } | null>(null);

    // Add this state to track if a call is being initiated
    const [isInitiatingCall, setIsInitiatingCall] = useState(false);

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
            logger.info('Initializing Twilio device...', { isInitialized, isDeviceReady });
            try {
                setUserState(USER_STATE.CONNECTING);
                setIsLoading(true);
                const tokenData = await getAccessToken();
                logger.debug('Access token received', {
                    tokenReceived: !!tokenData?.token,
                    tokenLength: tokenData?.token?.length
                });

                if (!tokenData?.token) {
                    throw new Error('Failed to get access token');
                }

                logger.info('Creating new Twilio device instance...', {
                    edge: 'ashburn',
                    logLevel: 4
                });

                const newDevice = new Device(tokenData.token, {
                    edge: 'ashburn',
                    closeProtection: 'You have an active call. Leaving or reloading this page will disconnect the call. Are you sure you want to continue?',
                    logLevel: 4,
                });

                logger.info('Device instance created successfully');
                setDevice(newDevice);
                setIsInitialized(true);
                setIsDeviceReady(true);
                setUserState(USER_STATE.READY);

                newDevice.register();
                logger.debug('Device registered');

                newDevice.on('tokenWillExpire', async () => {
                    logger.warn('Token will expire soon, requesting new token');
                    const token = await getAccessToken();
                    newDevice.updateToken(token.token);
                });

                newDevice.on('registered', () => {
                    logger.info('Device registered successfully');
                    setUserState(USER_STATE.READY);
                });

                newDevice.on('disconnect', (call) => {
                    logger.info('Device disconnect event', {
                        callSid: call?.parameters?.CallSid,
                        direction: call?.direction,
                        status: call?.status()
                    });
                    handleCallDisconnect();
                });

                newDevice.on('error', handleDeviceError);
            } catch (error: any) {
                logger.error('Device initialization failed:', {
                    error,
                    state: { isInitialized, isDeviceReady, userState }
                });
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

    // Modify handleCallDisconnect to trigger summary modal for manual calls
    const handleCallDisconnect = () => {
        if (activeCall) {
            const duration = callStartTime ? Date.now() - callStartTime : 0;
            const currentNumber = phoneNumber;

            activeCall.removeAllListeners();
            setActiveCall(null);
            setUserState(USER_STATE.READY);
            setCallStartTime(null);
            setIsOnCall(false);
            setErrorMessage('');
            setIsMuted(false);

            // Only show summary modal if call was actually connected
            if (duration > 0 && !autoDialState.isActive) {
                setCompletedCallDetails({
                    phoneNumber: currentNumber,
                    duration,
                    timestamp: Date.now()
                });
                setShowSummaryModal(true);
            }
        }
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

    // Enhance makeCall with retry logic
    const makeCall = async (phoneNumber: string, options?: {
        isAutoDial?: boolean,
        index?: number,
    }) => {
        // Prevent multiple simultaneous call attempts
        if (isInitiatingCall) {
            logger.warn('Call initiation blocked - already in progress', {
                phoneNumber,
                options,
                currentState: { isOnCall, userState }
            });
            return;
        }

        setIsInitiatingCall(true);
        logger.info('Initiating call', {
            phoneNumber,
            options,
            deviceState: {
                ready: isDeviceReady,
                userState,
                activeCall: !!activeCall
            }
        });

        try {
            logger.info('Attempting to make call', { phoneNumber, options });

            if (!device || !isDeviceReady) {
                logger.error('Device not ready for call');
                throw new Error('Device not ready');
            }

            const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
            if (!validatePhoneNumber(cleanNumber)) {
                logger.warn('Invalid phone number attempted', { cleanNumber });
                throw new Error('Invalid phone number');
            }

            try {
                logger.debug('Connecting call...', {
                    to: cleanNumber,
                    deviceStatus: device?.state,
                    userState
                });

                const call = await device.connect({
                    params: { To: cleanNumber },
                    rtcConstraints: { audio: true }
                });

                logger.info('Call connection initiated', {
                    callSid: call.parameters.CallSid,
                    status: call.status(),
                    direction: call.direction
                });

                setActiveCall(call);
                const startTime = Date.now();

                call.on('accept', () => {
                    logger.info('Call accepted', {
                        callSid: call.parameters.CallSid,
                        timestamp: new Date().toISOString(),
                        mediaStatus: call.status()
                    });
                    setPhoneNumber(cleanNumber);
                    handleCallConnect(call);
                    setIsMuted(false);
                });

                call.on('mute', (isMuted) => {
                    setIsMuted(isMuted);
                });

                call.on('disconnect', () => {
                    const duration = Date.now() - startTime;
                    logger.info('Call disconnected', {
                        callSid: call.parameters.CallSid,
                        duration,
                        finalStatus: call.status(),
                        autoDialState: {
                            isActive: autoDialState.isActive,
                            currentIndex: autoDialState.currentIndex
                        }
                    });

                    handleCallDisconnect();

                    if (options?.isAutoDial &&
                        options.index !== undefined) {
                        handleCallSuccess(options.index, duration);
                    }
                });

                call.on('error', (error) => {
                    logger.error('Call error occurred:', {
                        error,
                        callSid: call.parameters.CallSid,
                        isAutoDial: options?.isAutoDial
                    });

                    handleCallDisconnect();

                    if (options?.isAutoDial && options.index !== undefined) {
                        handleCallError(error, options.index);
                    } else {
                        setErrorMessage(`Call failed: ${error.message || 'Unknown error'}`);
                    }
                });

                return call;
            } catch (error: any) {
                logger.error('Error during call connection:', {
                    error,
                    phoneNumber,
                    deviceState: device?.state,
                    userState
                });
                if (options?.isAutoDial && options.index !== undefined) {
                    handleCallError(error, options.index);
                } else {
                    throw error;
                }
            }
        } finally {
            setIsInitiatingCall(false);
        }
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

    // Modify handleHangUp to not trigger next auto-dial
    const handleHangUp = () => {
        if (activeCall) {
            try {
                activeCall.disconnect();
                // Update the current number's status
                if (autoDialState.isActive) {
                    const currentIndex = autoDialState.currentIndex;
                    setTestNumbers(prev => {
                        const updated = [...prev];
                        if (currentIndex < updated.length) {
                            updated[currentIndex] = {
                                ...updated[currentIndex],
                                status: 'completed',
                                attempt: {
                                    timestamp: Date.now(),
                                    duration: callStartTime ? Date.now() - callStartTime : 0,
                                    status: 'success'
                                }
                            };
                        }
                        return updated;
                    });
                }
            } catch (error) {
                console.error('Error disconnecting call:', error);
            }

            handleCallDisconnect();
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
        logger.error('Call failed', { index, error });
        // Update status and move to next number immediately
        setTestNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status: 'failed',
                lastError: error.message,
                attempt:
                {
                    timestamp: Date.now(),
                    status: 'failed',
                    error: error.message
                }
            };
            return updated;
        });

        // Short delay for UI update before moving to next number
        await new Promise(resolve => setTimeout(resolve, AUTO_DIAL_CONFIG.TRANSITION_DELAY));
        setAutoDialState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    };

    // Improved handleCallSuccess with better state management
    // Modify handleCallSuccess to show modal
    const handleCallSuccess = async (index: number, duration: number) => {
        logger.info('Call completed successfully', { index, duration });

        setTestNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status: 'completed',
                attempt: {
                    timestamp: Date.now(),
                    duration,
                    status: 'success'
                }
            };
            return updated;
        });

        setCompletedCallDetails({
            phoneNumber: testNumbers[index].number,
            duration,
            timestamp: Date.now()
        });
        setShowSummaryModal(true);
    };

    // Enhanced auto-dial control functions
    const startAutoDial = () => {
        logger.info('Starting auto-dial sequence');
        if (!device || !isDeviceReady || testNumbers.length === 0) {
            setErrorMessage('Cannot start auto-dial: device not ready or no numbers');
            return;
        }

        // Reset all numbers to pending state
        const resetNumbers = testNumbers.map(num => ({
            ...num,
            status: 'pending' as const,
            lastError: undefined
        }));

        setTestNumbers(resetNumbers);
        setAutoDialState({
            isActive: true,
            isPaused: false,
            currentIndex: 0,
        });
    };

    const pauseAutoDial = () => {
        setAutoDialState(prev => ({ ...prev, isPaused: true }));
    };

    const resumeAutoDial = () => {
        setAutoDialState(prev => ({ ...prev, isPaused: false }));
    };

    const stopAutoDial = () => {
        setAutoDialState({
            isActive: false,
            isPaused: false,
            currentIndex: 0,
        });
    };

    // Add error dismissal handlers
    const dismissError = (type: keyof typeof errors) => {
        setErrors(prev => ({ ...prev, [type]: undefined }));
    };

    // Add new useEffect for auto-dialing logic
    useEffect(() => {
        const processNextCall = async () => {
            if (!autoDialState.isActive ||
                autoDialState.isPaused ||
                !device ||
                !isDeviceReady ||
                activeCall ||
                showSummaryModal ||  // Add this check
                isInitiatingCall  // Add this check
            ) {
                return;
            }

            const currentIndex = autoDialState.currentIndex;
            if (currentIndex >= testNumbers.length) {
                stopAutoDial();
                return;
            }

            const currentNumber = testNumbers[currentIndex];

            // Update status to in-progress
            setTestNumbers(prev => {
                const updated = [...prev];
                updated[currentIndex] = {
                    ...updated[currentIndex],
                    status: 'in-progress'
                };
                return updated;
            });

            try {
                await makeCall(currentNumber.number, {
                    isAutoDial: true,
                    index: currentIndex
                });
            } catch (error: any) {
                logger.error('Auto-dial call failed:', error);
                handleCallError(error, currentIndex);
            }
        };

        if (autoDialState.isActive && !autoDialState.isPaused) {
            processNextCall();
        }
    }, [autoDialState.isActive, autoDialState.isPaused, autoDialState.currentIndex, device, isDeviceReady, activeCall, showSummaryModal]);

    // // Call completion effect
    // useEffect(() => {
    //     if (!activeCall && autoDialState.isActive && !autoDialState.isPaused) {
    //         const timeoutId = setTimeout(() => {
    //             setAutoDialState(prev => {
    //                 if (prev.currentIndex >= testNumbers.length - 1) {
    //                     return { isActive: false, isPaused: false, currentIndex: 0 };
    //                 }
    //                 return { ...prev, currentIndex: prev.currentIndex + 1 };
    //             });
    //         }, AUTO_DIAL_CONFIG.TRANSITION_DELAY);

    //         return () => clearTimeout(timeoutId);
    //     }
    // }, [activeCall, autoDialState.isActive, autoDialState.isPaused]);

    // Add new function to handle call summary submission
    const handleCallSummarySubmit = async (summaryData: CallSummaryData) => {
        try {
            logger.info('Saving call summary:', summaryData);

            // Reset call-related states
            setActiveCall(null);
            setUserState(USER_STATE.READY);
            setCallStartTime(null);
            setIsOnCall(false);
            setErrorMessage('');
            setIsMuted(false);
            setPhoneNumber('');
            setElapsedTime(0);

            // Clear timers
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // Close modal and proceed with auto-dial
            setShowSummaryModal(false);
            setCompletedCallDetails(null);

            // Process next call in auto-dial sequence
            if (autoDialState.isActive) {
                const nextIndex = autoDialState.currentIndex + 1;
                if (nextIndex >= testNumbers.length) {
                    // End auto-dial if we've completed all numbers
                    stopAutoDial();
                } else {
                    setAutoDialState(prev => ({
                        ...prev,
                        currentIndex: nextIndex
                    }));
                }
            }
        } catch (error) {
            logger.error('Error saving call summary:', error);
            setErrorMessage('Failed to save call summary');
        }
    };

    // Add logging to auto-dial state changes
    useEffect(() => {
        if (autoDialState.isActive) {
            logger.state('AutoDial', {
                state: autoDialState,
                currentNumber: testNumbers[autoDialState.currentIndex]?.number,
                remainingCalls: testNumbers.length - autoDialState.currentIndex,
                deviceState: {
                    ready: isDeviceReady,
                    userState,
                    hasActiveCall: !!activeCall
                }
            });
        }
    }, [activeCall, autoDialState, isDeviceReady, testNumbers, userState]);

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
                                                key={item.number}
                                                className={`text-xs ${index === autoDialState.currentIndex
                                                    ? 'bg-blue-50'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <td className="py-2 px-3">{index + 1}</td>
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

            {/* Add Modal */}
            {showSummaryModal && completedCallDetails && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <CallSummaryModal
                            isOpen={showSummaryModal}
                            callDetails={completedCallDetails}
                            onClose={() => handleCallSummarySubmit({
                                notes: '', outcome: 'no-answer',
                                phoneNumber: '',
                                duration: 0,
                                timestamp: 0,
                                followUpRequired: false
                            })} // Handle close same as submit
                            onSubmit={handleCallSummarySubmit}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScreenDialer;
