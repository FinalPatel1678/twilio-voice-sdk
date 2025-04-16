export type CallStatus = 'initiated' | 'completed' | 'voicemail' | 'no-answer' | 'busy' | 'failed' |
    'canceled' | 'rejected' | 'error' | 'ringing' | 'in-progress'

export interface CallAttempt {
    status: CallStatus;
    duration?: number;
    callSid?: string;
    error?: string;
    answerTime?: number;
    endTime?: number;
    attempts?: number;
}

export type QueueStatus = 'queue-completed' | 'queue-processing' | 'queue-failed' | 'queue-pending';

export interface CandidateNumber {
    id: string,
    number: string;
    name: string,
    selectionId: string,
    multipleSelectionId: string,
    status: QueueStatus;
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
