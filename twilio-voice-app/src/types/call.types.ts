export interface CallAttempt {
    timestamp: number;
    status: string;
    duration?: number;
    callSid?: string;
    error?: string;
    answerTime?: number;
    endTime?: number;
    attempts?: number;
}

export interface CandidateNumber {
    id:string,
    number: string;
    name:string,
    selectionId:string,
    multipleSelectionId:string,
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    attempt?: CallAttempt;
    lastError?: string;
}

export interface AutoDialState {
    isActive: boolean;
    isPaused: boolean;
    currentIndex: number;
}

export interface CallDetailLoading {
    index: number;
    status: string;
}

export const USER_STATE = {
    CONNECTING: "Connecting",
    READY: "Ready",
    ON_CALL: "On call",
    OFFLINE: "Offline",
} as const;
