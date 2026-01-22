'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { WhisperState, TranscriptItem } from '../types/whisper';

const WS_URL = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || 'ws://localhost:9090';

export function useOnlineWhisper() {
    const [state, setState] = useState<WhisperState>({
        status: 'idle',
        progress: 0,
        transcript: [],
        error: null,
        logs: [],
    });

    const wsRef = useRef<WebSocket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    const log = useCallback((msg: string) => {
        console.log(`[OnlineWhisper] ${msg}`);
        setState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
    }, []);

    const clearTranscript = useCallback(() => {
        setState(prev => ({ ...prev, transcript: [] }));
    }, []);

    const stopRecording = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setState(prev => ({ ...prev, status: 'ready' }));
        log('Stopped recording');
    }, [log]);

    const startRecording = useCallback(async () => {
        try {
            log('Starting recording...');
            setState(prev => ({ ...prev, status: 'loading', error: null }));

            // 1. Setup Audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioCtx.destination);

            // 2. Setup WebSocket
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                log('WebSocket connected');
                setState(prev => ({ ...prev, status: 'recording' }));

                // Optional: Send config if server expects it
                // ws.send(JSON.stringify({ type: 'config', ... }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Expected format: { text: "segment", segment: 0, finished: true/false } 
                    // Adjust based on actual server protocol
                    if (data.text) {
                        setState(prev => {
                            // Simple append: In real WhisperLive, we might need to update the last segment if incomplete
                            // Assuming simpler "append finalized" logic for now unless we know the protocol handles partials.
                            // If partials: check segment ID.

                            // Let's assume the server sends final text segments or accumulated text.
                            // Case A: Incremental update?

                            // For safety, let's just append new non-empty text or robustly handle it.
                            // If specific protocol is needed, we'd need user input.
                            // Using a simple append for now.

                            const newHelper = [...prev.transcript];
                            // Check if last item is partial? 
                            // This depends entirely on the server.
                            // Let's assume { text: "Hello", is_final: true }

                            // Simulating standard behavior:
                            return {
                                ...prev,
                                transcript: [...prev.transcript, { text: data.text, lang: data.language || 'auto' }]
                            };
                        });
                    }
                } catch (e) {
                    console.error('JSON parse error', e);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket error', e);
                setState(prev => ({ ...prev, error: 'Connection error' }));
                stopRecording(); // Safety stop
            };

            ws.onclose = () => {
                log('WebSocket closed');
                if (state.status === 'recording') {
                    stopRecording();
                }
            };

            // 3. Audio Processing Loop
            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert Float32 to Int16 PCM if needed by server, or send Float32 bytes.
                    // Most Python servers expect 16-bit PCM bytes or Float32.
                    // WhisperLive usually expects 32-bit float? Or 16-bit?
                    // Standard is often 16-bit PCM for bandwidth.

                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }

                    ws.send(pcmData.buffer);
                }
            };

        } catch (err: any) {
            console.error(err);
            setState(prev => ({ ...prev, status: 'error', error: err.message }));
        }
    }, [log, stopRecording, state.status]);

    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    // Return interface matching useOfflineWhisper for compatibility
    return {
        state,
        startRecording,
        stopRecording,
        clearTranscript,
        // Mock offline-specific methods
        downloadModel: async () => true,
        checkModelInStorage: async () => true,
        initRecognizer: async () => { },
    };
}
