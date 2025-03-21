import { Device, Call } from '@twilio/voice-sdk';
import { useRef, useState } from 'react'
import usePersistor from '../../hooks/usePersistor';
import { USER_STATE, CandidateNumber, AutoDialState } from '../../types/call.types';
import { Candidate } from '../../types/candidate.type';
import LocalStorageManager from '../../services/localStorageManager';

const useAutoDialerState = ({ localStorageManager, candidates }: { localStorageManager: LocalStorageManager, candidates: Candidate[] }) => {
    // Convert to refs (these don't need re-renders)
    const deviceRef = useRef<Device | null>(null);
    const activeCallRef = useRef<Call | null>(null);
    const isInitializedRef = useRef(false);
    const isDeviceReadyRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const callStartTimeRef = useRef<number | null>(null);
    const processingCandidatesRef = useRef(new Set<string>());
    const isInitiatingCallRef = useRef(false);
    const errorMessageRef = useRef<string>('');
    const errorsRef = useRef<{
        device?: string;
        call?: string;
        validation?: string;
    }>({});
    const showSummaryModalRef = useRef<boolean>(false);

    // Keep as states (these need UI updates)
    const [userState, setUserState] = useState<string>(USER_STATE.OFFLINE);
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [isOnCall, setIsOnCall] = usePersistor<boolean>('isOnCall', false, localStorageManager);
    const [candidateNumbers, setCandidateNumbers] = useState<CandidateNumber[]>(candidates.map((candidate) => ({
        id: candidate.CandidateID.toString(),
        number: candidate.Mobile,
        name: `${candidate.FirstName} ${candidate.LastName}`.trim(),
        selectionId: candidate.SelectionID,
        multipleSelectionId: candidate.MultipleSelectionID,
        status: 'pending'
    })));
    const [autoDialState, setAutoDialState] = useState<AutoDialState>({
        isActive: false,
        isPaused: false,
        currentIndex: 0,
    });
    const [callDetailLoading, setCallDetailLoading] = useState<{
        index: number;
        status: string;
    } | null>(null);

    // Create getter/setter functions for refs to maintain consistent API
    const getDevice = () => deviceRef.current;
    const setDevice = (device: Device | null) => deviceRef.current = device;

    const getActiveCall = () => activeCallRef.current;
    const setActiveCall = (call: Call | null) => activeCallRef.current = call;

    const getIsInitialized = () => isInitializedRef.current;
    const setIsInitialized = (value: boolean) => isInitializedRef.current = value;

    const getIsDeviceReady = () => isDeviceReadyRef.current;
    const setIsDeviceReady = (value: boolean) => isDeviceReadyRef.current = value;

    const getCallStartTime = () => callStartTimeRef.current;
    const setCallStartTime = (value: number | null) => callStartTimeRef.current = value;

    const getIsInitiatingCall = () => isInitiatingCallRef.current;
    const setIsInitiatingCall = (value: boolean) => isInitiatingCallRef.current = value;

    const getErrorMessage = () => errorMessageRef.current;
    const setErrorMessage = (value: string) => errorMessageRef.current = value;

    const getErrors = () => errorsRef.current;
    const setErrors = (value: typeof errorsRef.current) => errorsRef.current = value;

    const getShowSummaryModal = () => showSummaryModalRef.current;
    const setShowSummaryModal = (value: boolean) => showSummaryModalRef.current = value;

    return {
        // Getter/setter functions for refs
        getDevice,
        setDevice,
        getActiveCall,
        setActiveCall,
        getIsInitialized,
        setIsInitialized,
        getIsDeviceReady,
        setIsDeviceReady,
        getCallStartTime,
        setCallStartTime,
        getIsInitiatingCall,
        setIsInitiatingCall,
        getErrorMessage,
        setErrorMessage,
        getErrors,
        setErrors,
        getShowSummaryModal,
        setShowSummaryModal,

        // Direct ref access where needed
        timerRef,
        processingCandidatesRef,

        // States that need UI updates
        userState,
        setUserState,
        phoneNumber,
        setPhoneNumber,
        isMuted,
        setIsMuted,
        isLoading,
        setIsLoading,
        elapsedTime,
        setElapsedTime,
        isOnCall,
        setIsOnCall,
        candidateNumbers,
        setCandidateNumbers,
        autoDialState,
        setAutoDialState,
        callDetailLoading,
        setCallDetailLoading,
    };
}

export default useAutoDialerState;