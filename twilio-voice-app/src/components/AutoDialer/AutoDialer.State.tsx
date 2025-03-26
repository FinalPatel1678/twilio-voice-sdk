import { Device, Call } from '@twilio/voice-sdk';
import { useRef, useState } from 'react'
import usePersistor from '../../hooks/usePersistor';
import { USER_STATE, CandidateNumber, AutoDialState } from '../../types/call.types';
import { Candidate } from '../../types/candidate.type';
import LocalStorageManager from '../../services/localStorageManager';

const useAutoDialerState = ({ localStorageManager, candidates }: { localStorageManager: LocalStorageManager, candidates: Candidate[] }) => {
    // Convert to refs (these don't need re-renders)
    const deviceRef = useRef<Device | null>(null);
    const isInitializedRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const callStartTimeRef = useRef<number | null>(null);
    const processingCandidatesRef = useRef(new Set<string>());
    const isInitiatingCallRef = useRef(false);
    const showSummaryModalRef = useRef<boolean>(false);

    // Keep as states (these need UI updates)
    const [isDeviceReady, setIsDeviceReady] = useState<boolean>(false)
    const [activeCall, setActiveCall] = useState<Call | null>(null)
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
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [errors, setErrors] = useState<{
        device?: string;
        call?: string;
        validation?: string;
    }>({});

    // Create getter/setter functions for refs to maintain consistent API
    const getDevice = () => deviceRef.current;
    const setDevice = (device: Device | null) => deviceRef.current = device;

    const getIsInitialized = () => isInitializedRef.current;
    const setIsInitialized = (value: boolean) => isInitializedRef.current = value;

    const getCallStartTime = () => callStartTimeRef.current;
    const setCallStartTime = (value: number | null) => callStartTimeRef.current = value;

    const getIsInitiatingCall = () => isInitiatingCallRef.current;
    const setIsInitiatingCall = (value: boolean) => isInitiatingCallRef.current = value;

    const getShowSummaryModal = () => showSummaryModalRef.current;
    const setShowSummaryModal = (value: boolean) => showSummaryModalRef.current = value;

    return {
        // Getter/setter functions for refs
        getDevice,
        setDevice,
        getIsInitialized,
        setIsInitialized,
        getCallStartTime,
        setCallStartTime,
        getIsInitiatingCall,
        setIsInitiatingCall,
        getShowSummaryModal,
        setShowSummaryModal,

        // Direct ref access where needed
        timerRef,
        processingCandidatesRef,

        // States that need UI updates
        isDeviceReady,
        setIsDeviceReady,
        activeCall,
        setActiveCall,
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
        errorMessage,
        setErrorMessage,
        errors,
        setErrors,
    };
}

export default useAutoDialerState;