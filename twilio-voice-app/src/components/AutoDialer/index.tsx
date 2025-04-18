import React, { useEffect, } from 'react';
import { Call, Device } from '@twilio/voice-sdk';
import { fetchCallDetails, getAccessToken, isCandidateInCall } from '../../services/twilioService';
import LocalStorageManager from '../../services/localStorageManager';
import StatusBar from '../StatusBar';
import AutoDialControls from '../AutoDialControls';
import CallQueue from '../CallQueue';
import ErrorDisplay from '../ErrorDisplay';
import logger from '../../utils/logger';
import { CandidateNumber, CallAttempt } from '../../types/call.types';
import { USER_STATE } from '../../types/call.types';
import { Candidate } from '../../types/candidate.type';
import DialedNumbersManager from '../../services/dialedNumbersManager';
import useAutoDialerState from './AutoDialer.State';

const localStorageManager = new LocalStorageManager();
const dialedNumbersManager = new DialedNumbersManager();

export interface AutoDialerProps {
    apiBaseUrl: string;
    candidates: Candidate[],
    userId: string,
    reqId: string,
    callerId: string,
    userName: string,
    jobTitleText: string,
    companyId: string
}

const AutoDialer: React.FC<AutoDialerProps> = ({ apiBaseUrl, candidates, userId, reqId, callerId, jobTitleText, userName, companyId }) => {
    const {
        // States
        userState, setUserState,
        phoneNumber, setPhoneNumber,
        isMuted, setIsMuted,
        isLoading, setIsLoading,
        elapsedTime, setElapsedTime,
        isOnCall, setIsOnCall,
        candidateNumbers, setCandidateNumbers,
        autoDialState, setAutoDialState,
        callDetailLoading, setCallDetailLoading,
        errorMessage, setErrorMessage,
        errors, setErrors,
        activeCall, setActiveCall,
        isDeviceReady, setIsDeviceReady,

        // Getter/setter functions
        getDevice, setDevice,
        getIsInitialized, setIsInitialized,
        getCallStartTime, setCallStartTime,
        getIsInitiatingCall, setIsInitiatingCall,
        getShowSummaryModal, setShowSummaryModal,

        // Direct ref access
        timerRef,
        processingCandidatesRef
    } = useAutoDialerState({ localStorageManager, candidates });

    // Replace all direct state accesses with their getter functions
    const device = getDevice();
    const isInitialized = getIsInitialized();
    const isInitiatingCall = getIsInitiatingCall();
    const callStartTime = getCallStartTime();
    const showSummaryModal = getShowSummaryModal();
    const processingCandidates = processingCandidatesRef.current

    useEffect(() => {
        window.CallDetailsModalClose = () => {
            console.log("React: CallDetailsModalClose() executed!");

            resetCallStates();
            setShowSummaryModal(false);

            if (autoDialState.isActive) {
                processNextAutoDialCall();
            }
        };
    }, [autoDialState.isActive]);

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
                const tokenData = await getAccessToken(userId);
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
                    const token = await getAccessToken(userId);
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
                setErrors((prev) => ({ ...prev, device: errorMessage }));
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
            activeCall.removeAllListeners();
        }
        resetCallStates()
    };

    const handleDeviceError = async (error: { code: number; message?: string }) => {
        console.error('Device error:', error);
        if (error?.code === 20101) {
            const token = await getAccessToken(userId);
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

    const makeCall = async (phoneNumber: string, name?: string, selectionId?: string, multipleSelectionId?: string) => {
        // Prevent multiple simultaneous call attempts
        if (isInitiatingCall) {
            logger.warn('Call initiation blocked - already in progress', {
                phoneNumber,
                currentState: { isOnCall, userState }
            });
            return;
        }

        setIsInitiatingCall(true);
        logger.info('Initiating call', {
            phoneNumber,
            deviceState: {
                ready: isDeviceReady,
                userState,
                activeCall: !!activeCall
            }
        });

        const currentIndex = autoDialState.currentIndex;

        try {
            logger.info('Attempting to make call', { phoneNumber });

            if (!device || !isDeviceReady) {
                logger.error('Device not ready for call');
                throw new Error('Device not ready');
            }

            const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
            if (!validatePhoneNumber(cleanNumber)) {
                logger.warn('Invalid phone number attempted', { cleanNumber });
                throw new Error('Invalid phone number');
            }

            // Check if candidate is already in a call
            const { isInCall, message } = await isCandidateInCall(cleanNumber);
            if (isInCall) {
                logger.warn('Candidate is already in a call', { cleanNumber });
                throw new Error(message || 'Candidate is already in a call with another recruiter');
            }

            try {
                logger.debug('Connecting call...', {
                    to: cleanNumber,
                    deviceStatus: device?.state,
                    userState
                });

                const call = await device.connect({
                    params: { To: cleanNumber, userId: userId, reqId: reqId, callerId: callerId, jobTitleText, userName, candidateName: name || '', selectionId: selectionId || '', companyId: companyId, multipleSelectionId: multipleSelectionId || '' }
                });

                logger.info('Call connection initiated', {
                    callSid: call.parameters.CallSid,
                    status: call.status(),
                    direction: call.direction
                });

                setActiveCall(call);
                setPhoneNumber(cleanNumber);
                const startTime = Date.now();

                call.on('accept', () => {
                    logger.info('Call accepted', {
                        callSid: call.parameters.CallSid,
                        mediaStatus: call.status()
                    });
                    if (currentIndex !== undefined) {
                        setCandidateNumbers(prev => {
                            const updated = [...prev];
                            updated[currentIndex] = {
                                ...updated[currentIndex],
                                attempt: { status: 'in-progress' }
                            };
                            return updated;
                        });
                    }

                    handleCallConnect(call);
                    setIsMuted(false);
                });

                call.on('mute', (isMuted) => {
                    setIsMuted(isMuted);
                });

                call.on('disconnect', async () => {
                    const callSid = call.parameters.CallSid;
                    const duration = Date.now() - startTime;
                    logger.info('Call disconnected', {
                        callSid: callSid,
                        duration,
                        finalStatus: call.status(),
                        autoDialState: {
                            isActive: autoDialState.isActive,
                            currentIndex: autoDialState.currentIndex
                        }
                    });

                    // Don't reset call states immediately for auto-dial
                    if (currentIndex !== undefined) {
                        await handleCallSuccess(callSid, currentIndex, duration);
                    }
                    handleCallDisconnect();

                });

                call.on('error', (error) => {
                    logger.error('Call error occurred:', {
                        error,
                        callSid: call.parameters.CallSid,
                    });

                    handleCallDisconnect();

                    if (currentIndex !== undefined) {
                        handleCallError(error, currentIndex);
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

                if (currentIndex !== undefined) {
                    handleCallError(error, currentIndex);
                } else {
                    setErrorMessage(error.message || 'Unknown error');
                }
            }
        } finally {
            setIsInitiatingCall(false);
        }
    };

    // Simplified handleCall for manual dialing
    // const handleCall = async () => {
    //     setErrors({});

    //     if (isLoading || isOnCall) {
    //         return;
    //     }

    //     setIsLoading(true);
    //     setErrorMessage('');

    //     try {
    //         await makeCall(phoneNumber);
    //     } catch (error: any) {
    //         console.error('Error making call:', error);
    //         setErrorMessage(`Failed to make call: ${error.message || 'Unknown error'}`);
    //         setUserState(USER_STATE.READY);
    //         setIsOnCall(false);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

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
            activeCall.disconnect();
        }
    };

    // Add new error handling functions
    const handleCallError = async (error: any, index: number) => {
        logger.error('Call failed', { index, error });

        const currentNumber = candidateNumbers[index];
        // Remove from processing set
        processingCandidates.delete(currentNumber.id);

        // Update status and move to next number immediately
        setCandidateNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status: 'error',
                lastError: error.message,
                attempt:
                {
                    status: 'failed',
                    error: error.message
                }
            };
            return updated;
        });

        setAutoDialState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        setErrorMessage(`Call failed: ${error.message || 'Unknown error'}`);
    };

    const resetCallStates = () => {
        setActiveCall(null);
        setUserState(USER_STATE.READY);
        setCallStartTime(null);
        setIsOnCall(false);
        setErrorMessage('');
        setIsMuted(false);
        setPhoneNumber('');
        setElapsedTime(0);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const processNextAutoDialCall = () => {
        const nextIndex = autoDialState.currentIndex + 1;
        if (nextIndex >= candidateNumbers.length) {
            stopAutoDial();
        } else {
            setAutoDialState(prev => ({
                ...prev,
                currentIndex: nextIndex
            }));
        }
    };

    const updateNumberStatus = (index: number, status: CandidateNumber['status'], attempt?: CallAttempt) => {
        setCandidateNumbers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                status,
                attempt
            };
            return updated;
        });
    };

    // Modify handleCallSuccess to use the external Set
    const handleCallSuccess = async (callSid: string, index: number, duration: number) => {
        logger.info('Call completed successfully', { index, duration, callSid });

        const currentNumber = candidateNumbers[index];
        // Add number to dialed numbers manager instead of the Set
        dialedNumbersManager.add(currentNumber.id, currentNumber.number);

        // Remove from processing set
        processingCandidates.delete(currentNumber.id);

        const startTime = Date.now() - duration;

        // Set initial attempt data
        const attempt: CallAttempt = {
            duration,
            status: 'completed',
            callSid,
            answerTime: startTime,
            endTime: Date.now(),
            attempts: 1
        };

        updateNumberStatus(index, 'processing', attempt);

        try {
            if (callSid) {
                setCallDetailLoading({
                    index,
                    status: 'Analyzing call details...'
                });

                const callDetails = await fetchCallDetails(apiBaseUrl, callSid);

                // Enhanced call status determination
                let callStatus: CallAttempt['status'];
                if (callDetails.answered_by?.includes('machine')) {
                    callStatus = 'voicemail';
                } else {
                    callStatus = callDetails.status;
                }

                // Update attempt with final status and details
                const finalAttempt: CallAttempt = {
                    ...attempt,
                    status: callStatus,
                    error: callDetails.error,
                };

                updateNumberStatus(index, 'finalized', finalAttempt);

                // Show summary modal for successful human-answered calls only
                if (callStatus === 'completed') {
                    window.triggerCallDetailsModal(currentNumber.selectionId)
                    setShowSummaryModal(true);
                } else {
                    resetCallStates();
                    if (autoDialState.isActive) {
                        processNextAutoDialCall();
                    }
                }
            }
        } catch (error) {
            logger.error('Error fetching call details:', error);
            const errorAttempt: CallAttempt = {
                ...attempt,
                status: 'error',
                error: 'Failed to fetch call details'
            };
            updateNumberStatus(index, 'error', errorAttempt);

            resetCallStates();
            if (autoDialState.isActive) {
                processNextAutoDialCall();
            }
        } finally {
            setCallDetailLoading(null);
        }
    };

    // Enhanced auto-dial control functions
    const startAutoDial = () => {
        logger.info('Starting auto-dial sequence');
        if (!device || !isDeviceReady || candidateNumbers.length === 0) {
            setErrorMessage('Cannot start auto-dial: device not ready or no numbers');
            return;
        }

        // Reset all numbers to pending state
        const resetNumbers: CandidateNumber[] = candidateNumbers.map(num => ({
            ...num,
            status: 'waiting',
            lastError: undefined
        }));

        // Clear the dialed numbers manager instead of the Set
        dialedNumbersManager.clear();
        setCandidateNumbers(resetNumbers);
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

    // Modify stopAutoDial to clear processing set
    const stopAutoDial = () => {
        processingCandidates.clear();
        setAutoDialState({
            isActive: false,
            isPaused: false,
            currentIndex: 0,
        });
    };

    // Add error dismissal handlers
    const dismissError = (type: keyof typeof errors | 'errorMessage') => {
        if (type === 'errorMessage') {
            setErrorMessage('');
        } else {
            setErrors((prev) => ({ ...prev, [type]: undefined }));
        }
    };

    // Add new useEffect for auto-dialing logic
    // Modify the auto-dial effect to use the external Set
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
            if (currentIndex >= candidateNumbers.length) {
                stopAutoDial();
                return;
            }

            const currentNumber = candidateNumbers[currentIndex];

            // Add check for currently processing candidates
            if (processingCandidates.has(currentNumber.id)) {
                logger.warn('Candidate already being processed, skipping', {
                    candidateId: currentNumber.id,
                    index: currentIndex
                });
                setAutoDialState(prev => ({
                    ...prev,
                    currentIndex: prev.currentIndex + 1
                }));
                return;
            }

            // Check if number has already been dialed using the external Set
            if (dialedNumbersManager.has(currentNumber.id, currentNumber.number)) {
                logger.warn('Number already dialed, skipping to next', {
                    candidateId: currentNumber.id,
                    number: currentNumber.number,
                    index: currentIndex
                });
                setAutoDialState(prev => ({
                    ...prev,
                    currentIndex: prev.currentIndex + 1
                }));
                return;
            }

            setCandidateNumbers(prev => {
                const updated = [...prev];
                updated[currentIndex] = {
                    ...updated[currentIndex],
                    status: 'processing',
                    attempt: { status: 'initiated' }
                };
                return updated;
            });

            // Add candidate to processing set
            processingCandidates.add(currentNumber.id);

            try {
                await makeCall(currentNumber.number, currentNumber.name, currentNumber.selectionId, currentNumber.multipleSelectionId);
            } catch (error: any) {
                setErrorMessage(`Failed to make call: ${error.message || 'Unknown error'}`);
                // Remove from processing set on error
                processingCandidates.delete(currentNumber.id);
                handleCallError(error, currentIndex);
            }
        };

        if (autoDialState.isActive && !autoDialState.isPaused) {
            processNextCall();
        }
    }, [autoDialState.isActive, autoDialState.isPaused, autoDialState.currentIndex, device, isDeviceReady, activeCall, showSummaryModal]);

    // Add logging to auto-dial state changes
    useEffect(() => {
        if (autoDialState.isActive) {
            logger.state('AutoDial', {
                state: autoDialState,
                currentNumber: candidateNumbers[autoDialState.currentIndex]?.number,
                remainingCalls: candidateNumbers.length - autoDialState.currentIndex,
                deviceState: {
                    ready: isDeviceReady,
                    userState,
                    hasActiveCall: !!activeCall
                }
            });
        }
    }, [activeCall, autoDialState, isDeviceReady, candidateNumbers, userState]);

    const removeNumberFromQueue = (index: number) => {
        // During auto-dial, only allow removal of numbers that haven't been processed yet
        if (autoDialState.isActive && index <= autoDialState.currentIndex) {
            return;
        }

        setCandidateNumbers(prev => prev.filter((_, i) => i !== index));
    };

    const remainingCalls = candidateNumbers.filter((num) => num.status !== 'finalized' && num.status !== 'error').length;

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Status Bar */}
                <StatusBar
                    userState={userState}
                    activeCall={activeCall}
                    phoneNumber={phoneNumber}
                    isMuted={isMuted}
                    elapsedTime={elapsedTime}
                    isDeviceReady={isDeviceReady}
                    isLoading={isLoading}
                    onToggleMute={toggleMute}
                    onHangUp={handleHangUp}
                />

                {/* Error Displays */}
                {(errors.device || errors.validation || errors.call || errorMessage) && (
                    <div className="space-y-2">
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
                        {errorMessage && (
                            <ErrorDisplay
                                message={errorMessage}
                                type="error"
                                onDismiss={() => dismissError('errorMessage')}
                            />
                        )}
                    </div>
                )}

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 space-y-4">
                        {/* Auto Dial Controls */}
                        <AutoDialControls
                            autoDialState={autoDialState}
                            isDeviceReady={isDeviceReady}
                            activeCall={!!activeCall}
                            totalNumbers={candidateNumbers.length}
                            remainingCalls={remainingCalls}
                            onStart={isInitiatingCall ? undefined : startAutoDial} // Disable if initiating a call
                            onPause={isInitiatingCall ? undefined : pauseAutoDial} // Disable if initiating a call
                            onResume={isInitiatingCall ? undefined : resumeAutoDial} // Disable if initiating a call
                            onStop={isInitiatingCall ? undefined : stopAutoDial} // Disable if initiating a call
                        />

                        {/* Call Queue */}
                        <CallQueue
                            candidateNumbers={candidateNumbers}
                            currentIndex={autoDialState.currentIndex}
                            callDetailLoading={callDetailLoading}
                            isAutoDialActive={autoDialState.isActive}
                            activeCall={activeCall}
                            onRemoveNumber={removeNumberFromQueue}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


export default AutoDialer;
