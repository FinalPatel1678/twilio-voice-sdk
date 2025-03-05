
export interface CallAttempt {
    timestamp: number;
    duration?: number;
    status:
    | 'success'
    | 'voicemail'
    | 'no-answer'
    | 'busy'
    | 'failed'
    | 'canceled'
    | 'rejected'
    | 'invalid-number'
    | 'error';
    error?: string;
    attempts?: number;
    callSid?: string;
    answerTime?: number;
    endTime?: number;
}

export interface CandidateNumber {
    id:string,
    number: string;
    name:string,
    selectionId:string,
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
