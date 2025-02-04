import React, { useEffect, useRef, useState } from 'react';
import { Phone, X, Mic, MicOff, Minimize2, Maximize2 } from 'lucide-react';
import { Call, Device } from '@twilio/voice-sdk';
import { getAccessToken } from '../services/twilioService';
import LocalStorageManager from '../services/localStorageManager';
import usePersistor from '../hooks/usePersistor';

type DialerState = 'button' | 'expanded' | 'mini';

const USER_STATE = {
    CONNECTING: "Connecting",
    READY: "Ready",
    ON_CALL: "On call",
    OFFLINE: "Offline",
};

const numberList = [1, 2, 3, 4, 5, 6, 7, 8, 9, '+', 0, '⌫'];
const localStorageManager = new LocalStorageManager();

const FloatingDialer = () => {
    const [dialerState, setDialerState] = useState<DialerState>('button');
    const [isInitialized, setIsInitialized] = useState(false);
    const [device, setDevice] = useState<Device | null>(null);
    const [userState, setUserState] = useState<string>(USER_STATE.OFFLINE);
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Timer states
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    const [isOnCall, setIsOnCall] = usePersistor<boolean>('isOnCall', false, localStorageManager);

    useEffect(() => {
        initializeDevice();
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
                const tokenData = await getAccessToken();
                const newDevice = new Device(tokenData.token, {
                    edge: 'ashburn',
                    closeProtection: 'You have an active call. Leaving or reloading this page will disconnect the call. Are you sure you want to continue?',
                    logLevel: 4,
                });
                newDevice.register();
                setDevice(newDevice);
                setIsInitialized(true);

                newDevice.on('tokenWillExpire', async () => {
                    const token = await getAccessToken();
                    newDevice.updateToken(token.token);
                });

                newDevice.on('registered', () => setUserState(USER_STATE.READY));
                newDevice.on('disconnect', handleCallDisconnect);
                newDevice.on('error', handleDeviceError);
            } catch (error) {
                console.error('Error initializing device:', error);
                setErrorMessage('Failed to initialize the device. Please try again later.');
                setUserState(USER_STATE.OFFLINE);
            }
        }
    };

    const handleCallConnect = (call: Call) => {
        setActiveCall(call);
        setUserState(USER_STATE.ON_CALL);
        setCallStartTime(Date.now());
        setIsOnCall(true);
        setErrorMessage('');
    };

    const handleCallDisconnect = () => {
        setActiveCall(null);
        setUserState(USER_STATE.READY);
        setDialerState('button');
        setCallStartTime(null);
        setIsOnCall(false);
        setErrorMessage('');
    };

    const handleDeviceError = async (error: { code: number; message?: string }) => {
        console.error('Device error:', error);
        if (error?.code === 20101) {
            const token = await getAccessToken();
            device?.updateToken(token.token);
        }
        setUserState(USER_STATE.OFFLINE);
    };

    const validatePhoneNumber = (number: string) => {
        const phoneRegex = /^[+]?[0-9]{7,15}$/;
        return phoneRegex.test(number);
    };

    const handleCall = async () => {
        if (!device) {
            setErrorMessage('Device not initialized. Please try again later.');
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            setErrorMessage('Invalid phone number. Please enter a valid number.');
            return;
        }

        if (isOnCall) {
            setErrorMessage('You are already on a call in another tab.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const call = await device.connect({ params: { To: phoneNumber }, rtcConstraints: { audio: true } });
            handleCallConnect(call);

            call.on('disconnect', handleCallDisconnect);
            call.on('error', (error) => {
                console.error('Call error:', error);
                setErrorMessage('Call failed. Please try again.');
                handleCallDisconnect();
            });
        } catch (error) {
            console.error('Error making call:', error);
            setErrorMessage('Failed to make the call. Please check your connection and try again.');
            setUserState(USER_STATE.READY);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMute = () => {
        if (activeCall) {
            activeCall.mute(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const handleHangUp = () => {
        if (activeCall) {
            activeCall.disconnect();
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

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {dialerState === 'button' && !activeCall && (
                <button
                    onClick={() => setDialerState('expanded')}
                    className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all duration-200"
                >
                    <Phone className="w-5 h-5 text-white" />
                </button>
            )}

            {dialerState === 'expanded' && (
                <div className="w-72 bg-white rounded-xl shadow-xl overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStateColor(userState)}`} />
                            <span className="text-sm font-medium text-gray-700">{userState}</span>
                        </div>
                        <button
                            onClick={() => setDialerState(activeCall ? 'mini' : 'button')}
                            className="p-1 hover:bg-gray-200 rounded-full"
                        >
                            <Minimize2 className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <div className="p-4">
                        {activeCall ? (
                            <div className={`w-full px-3 py-2 rounded-lg text-sm font-semibold bg-blue-100 text-blue-600 flex items-center gap-2`}>
                                <Phone className="w-5 h-5 text-blue-600" /> {phoneNumber}
                            </div>
                        ) : (
                            <input
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter phone number"
                            />
                        )}

                        {errorMessage && (
                            <div className="mt-2 text-xs text-red-500 text-center">{errorMessage}</div>
                        )}

                        {activeCall ? (
                            <div className="mt-4 space-y-4">
                                <div className="text-lg font-semibold text-center text-gray-700">
                                    {formatElapsedTime(elapsedTime)}
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        onClick={toggleMute}
                                        className={`p-3 rounded-full ${isMuted ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {numberList.map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            if (value === '⌫') {
                                                setPhoneNumber(phoneNumber.slice(0, -1));
                                            } else {
                                                setPhoneNumber(phoneNumber + value);
                                            }
                                        }}
                                        className="w-full h-10 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={activeCall ? handleHangUp : handleCall}
                            disabled={isLoading || !phoneNumber}
                            className={`mt-4 w-full py-2 px-4 rounded-lg font-medium text-white ${activeCall
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Connecting...' : activeCall ? 'End Call' : 'Call'}
                        </button>
                    </div>
                </div>
            )}

            {dialerState === 'mini' && activeCall && (
                <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-4">
                    <div>
                        <div className="text-sm font-medium text-gray-700">{phoneNumber}</div>
                        <div className="text-xs text-gray-500">{formatElapsedTime(elapsedTime)}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded-full ${isMuted ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleHangUp}
                            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDialerState('expanded')}
                            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingDialer;
