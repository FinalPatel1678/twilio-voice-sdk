import { Device, Call } from '@twilio/voice-sdk';
import { useRef, useState } from 'react'
import usePersistor from '../../hooks/usePersistor';
import { USER_STATE, CandidateNumber, AutoDialState } from '../../types/call.types';
import { Candidate } from '../../types/candidate.type';
import LocalStorageManager from '../../services/localStorageManager';

const useAutoDialerState = ({ localStorageManager, candidates }: { localStorageManager: LocalStorageManager, candidates: Candidate[] }) => {
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
    // Update initial test numbers state without retry
    const [candidateNumbers, setCandidateNumbers] = useState<CandidateNumber[]>(candidates.map((candidate) => ({
        id: candidate.CandidateID.toString(),
        number: candidate.Mobile,
        name: `${candidate.FirstName} ${candidate.LastName}`.trim(),
        selectionId: candidate.SelectionID,
        status: 'pending'
    })));

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

    // Add this state to track if a call is being initiated
    const [isInitiatingCall, setIsInitiatingCall] = useState(false);

    const [callDetailLoading, setCallDetailLoading] = useState<{
        index: number;
        status: string;
    } | null>(null);

    // Add this near the top of the component, after the state declarations
    const [processingCandidates] = useState(() => new Set<string>());

    return {
        device,
        setDevice,
        userState,
        setUserState,
        phoneNumber,
        setPhoneNumber,
        activeCall,
        setActiveCall,
        isMuted,
        setIsMuted,
        errorMessage,
        setErrorMessage,
        isLoading,
        setIsLoading,
        isInitialized,
        setIsInitialized,
        isDeviceReady,
        setIsDeviceReady,
        timerRef,
        callStartTime,
        setCallStartTime,
        elapsedTime,
        setElapsedTime,
        isOnCall,
        setIsOnCall,
        candidateNumbers,
        setCandidateNumbers,
        autoDialState,
        setAutoDialState,
        errors,
        setErrors,
        showSummaryModal,
        setShowSummaryModal,
        isInitiatingCall,
        setIsInitiatingCall,
        callDetailLoading,
        setCallDetailLoading,
        processingCandidates
    };
}

export default useAutoDialerState