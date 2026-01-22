export interface TranscriptItem {
    text: string;
    lang?: string;
}

export interface WhisperState {
    status: 'idle' | 'loading' | 'downloading' | 'ready' | 'recording' | 'processing' | 'error';
    progress: number; // 0-100
    transcript: TranscriptItem[];
    error: string | null;
    logs: string[];
}

export interface TranscriberHookBase {
    state: WhisperState;
    startRecording: () => void;
    stopRecording: () => void;
    clearTranscript: () => void;
}
