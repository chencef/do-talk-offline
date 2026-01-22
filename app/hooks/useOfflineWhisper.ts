'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import localforage from 'localforage';
import { ModelConfig } from '../config/models';

interface SherpaModule {
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
    lengthBytesUTF8: (str: string) => number;
    FS?: {
        writeFile: (path: string, data: Uint8Array) => void;
        unlink: (path: string) => void;
    };
    FS_createDataFile?: (parent: string, name: string, data: Uint8Array, canRead: boolean, canWrite: boolean, canOwn: boolean) => void;
    FS_unlink?: (path: string) => void;
    onRuntimeInitialized: () => void;
}

declare global {
    interface Window {
        Module: any;
        SherpaOnnxModule: any;
    }
}

import { WhisperState } from '../types/whisper';

export function useOfflineWhisper(modelConfig: ModelConfig) {
    const [state, setState] = useState<WhisperState>({
        status: 'idle',
        progress: 0,
        transcript: [],
        error: null,
        logs: [],
    });

    // ... refs ...
    const moduleRef = useRef<SherpaModule | null>(null);
    const recognizerRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

    // Initialize LocalForage
    useEffect(() => {
        localforage.config({
            name: 'offline-whisper',
            storeName: 'models'
        });
    }, []);

    // Reset state when modelConfig changes
    useEffect(() => {
        setState(prev => ({
            ...prev,
            status: 'idle',
            error: null,
            progress: 0
        }));
    }, [modelConfig.name]); // Depend on name to trigger reset

    const log = useCallback((msg: string) => {
        console.log(`[Whisper] ${msg}`);
        setState(prev => ({ ...prev, logs: [...prev.logs, msg] })); // Append to logs
    }, []);

    // Check if model files exist in storage
    const checkModelInStorage = useCallback(async () => {
        try {
            const enc = await localforage.getItem(modelConfig.files.encoder);
            const dec = await localforage.getItem(modelConfig.files.decoder);
            const tok = await localforage.getItem(modelConfig.files.tokens);
            const vad = await localforage.getItem(modelConfig.files.vad);
            return enc && dec && tok && vad;
        } catch (e) {
            return false;
        }
    }, [modelConfig]);

    // Download Logic
    const downloadModel = useCallback(async () => {
        console.log('[Whisper] downloadModel called');
        setState(prev => ({ ...prev, status: 'downloading', progress: 0, error: null }));
        log('Starting model check/download...');

        try {
            log('Initializing storage...');
            await localforage.ready();

            const files = [
                { url: modelConfig.urls.encoder, name: modelConfig.files.encoder },
                { url: modelConfig.urls.decoder, name: modelConfig.files.decoder },
                { url: modelConfig.urls.tokens, name: modelConfig.files.tokens },
                { url: modelConfig.urls.vad, name: modelConfig.files.vad },
            ];

            let completed = 0;
            for (const file of files) {
                log(`Checking ${file.name}...`);
                const existing = await localforage.getItem<Blob>(file.name);

                let valid = false;
                if (existing) {
                    if (existing.size > 1024) {
                        log(`Found existing ${file.name} (${(existing.size / 1024 / 1024).toFixed(2)} MB)`);
                        valid = true;
                    } else {
                        log(`Found corrupted ${file.name} (${existing.size} bytes). Re-downloading.`);
                        await localforage.removeItem(file.name);
                    }
                }

                if (!valid) {
                    log(`Fetching ${file.name} from ${file.url}...`);
                    try {
                        const res = await fetch(file.url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

                        const blob = await res.blob();
                        if (blob.size < 1024) throw new Error(`Downloaded file too small: ${blob.size} bytes`);

                        await localforage.setItem(file.name, blob);
                        log(`Saved ${file.name} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
                    } catch (fetchErr: any) {
                        console.error('[Whisper] Fetch error:', fetchErr);
                        throw new Error(`Failed to download ${file.name}: ${fetchErr.message}`);
                    }
                }
                completed++;
                setState(prev => ({ ...prev, progress: (completed / files.length) * 100 }));
            }
            log('All files ready.');
            setState(prev => ({ ...prev, status: 'idle', progress: 100 }));
            return true;
        } catch (err: any) {
            console.error('[Whisper] Download error:', err);
            let msg = err.message;
            if (err.name === 'QuotaExceededError' || msg.includes('not enough space')) {
                msg = '手機儲存空間不足，無法下載模型。請嘗試：1. 清除瀏覽器快取 2. 關閉無痕模式 (空間限制較嚴) 3. 刪除手機不用的檔案。';
            }
            log(`ERROR: ${msg}`);
            setState(prev => ({ ...prev, status: 'error', error: msg }));
            return false;
        }
    }, [modelConfig, log]);

    // Load scripts dynamically
    const loadScripts = useCallback(async () => {
        if (window.Module) return;

        return new Promise<void>((resolve) => {
            window.Module = {
                onRuntimeInitialized: () => {
                    log('WASM Runtime Initialized');
                    moduleRef.current = window.Module;
                    resolve();
                },
                locateFile: (path: string) => {
                    log(`Locate File: ${path}`);
                    if (path.endsWith('.data')) {
                        return '/proxy-model/wasm-data';
                    }
                    return '/' + path; // Load from public root
                },
                print: (text: string) => log(`[WASM] ${text}`),
                printErr: (text: string) => console.error(`[WASM Err] ${text}`),
            };

            const scripts = [
                '/sherpa-onnx-wasm-main-vad-asr.js',
                '/sherpa-onnx-asr.js',
                '/sherpa-onnx-vad.js'
            ];

            let loaded = 0;
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.async = false; // Maintain order
                script.onload = () => {
                    loaded++;
                    if (loaded === scripts.length) {
                        log('All scripts loaded');
                    }
                };
                document.body.appendChild(script);
            });
        });
    }, [log]);

    // Init Logic
    const initRecognizer = useCallback(async (language: string = 'en', task: 'transcribe' | 'translate' = 'transcribe') => {
        if (!moduleRef.current) {
            await loadScripts();
        }

        // Wait a bit for Module to be fully ready if needed, though onRuntimeInitialized handles it.
        // But we need to ensure the wrapper classes (OfflineRecognizer) are available from the other scripts.
        // Since we set async=false, they should execute in order.

        const Module = window.Module;
        setState(prev => ({ ...prev, status: 'loading' }));

        try {
            // Check storage first
            const hasModel = await checkModelInStorage();
            if (!hasModel) {
                setState(prev => ({ ...prev, status: 'error', error: 'Model not downloaded' }));
                return;
            }

            // Read from storage and write to Emscripten FS
            const files = [
                modelConfig.files.encoder,
                modelConfig.files.decoder,
                modelConfig.files.tokens,
                modelConfig.files.vad
            ];
            for (const name of files) {
                const blob = await localforage.getItem<Blob>(name);
                if (!blob) throw new Error(`${name} not found in storage`);
                const arrayBuffer = await blob.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);

                // Wait for FS methods availability (race condition fix)
                let fsRetries = 0;
                const checkForFS = () => {
                    return (Module.FS && Module.FS.writeFile) || Module.FS_createDataFile;
                };

                while (!checkForFS() && fsRetries < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Wait up to 5s
                    fsRetries++;
                }

                if (Module.FS && Module.FS.writeFile) {
                    Module.FS.writeFile(name, data);
                } else if (Module.FS_createDataFile) {
                    // Fallback for when FS is not directly exposed
                    try {
                        Module.FS_unlink && Module.FS_unlink(name);
                    } catch (e) { /* ignore if not exists */ }

                    Module.FS_createDataFile('/', name, data, true, true, true);
                } else {
                    console.error('[WASM] Module keys:', Object.keys(Module));
                    throw new Error('No filesystem methods found on Module (FS.writeFile or FS_createDataFile missing). Traces: ' + Object.keys(Module).join(', '));
                }

                log(`Wrote ${name} to MEMFS`);
            }

            // Config for Recognizer
            // We assume it's the tiny multilingual model which maps to 'whisper' type or similar.
            // Based on app-vad-asr.js:
            const config = {
                modelConfig: {
                    whisper: {
                        encoder: modelConfig.files.encoder,
                        decoder: modelConfig.files.decoder,
                        language: '', // Auto detect
                        task: task,
                        tailPaddings: -1,
                    },
                    tokens: modelConfig.files.tokens,
                    debug: 0,
                }
            };

            // Initialize Global Objects
            // These global classes come from sherpa-onnx-asr.js / sherpa-onnx-vad.js
            // Since they are loaded via script tags, there might be a race condition.
            let retries = 0;
            const checkWrappers = () => {
                return typeof window.OfflineRecognizer !== 'undefined' &&
                    typeof window.createVad !== 'undefined' &&
                    typeof window.CircularBuffer !== 'undefined';
            };

            while (!checkWrappers() && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
                retries++;
            }

            if (!checkWrappers()) {
                throw new Error('Sherpa JS wrappers not loaded after timeout');
            }

            // Ensure AudioContext is available (handle browser policies)
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) {
                throw new Error('AudioContext not supported in this browser');
            }

            recognizerRef.current = new window.OfflineRecognizer(config, Module);
            log(`Recognizer Initialized (Language: ${language}, Task: ${task})`);

            setState(prev => ({ ...prev, status: 'ready' }));

        } catch (e: any) {
            console.error(e);
            setState(prev => ({ ...prev, status: 'error', error: e.message }));
        }
    }, [modelConfig, log, checkModelInStorage, loadScripts]);

    const startRecording = useCallback(async () => {
        if (!recognizerRef.current || !moduleRef.current) return;
        const Module = moduleRef.current;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            // Use ScriptProcessor for max compatibility as per original code, though AudioWorklet is better.
            // Sticking to original implementation for stability.
            const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptNodeRef.current = scriptNode;

            const vad = window.createVad(Module);
            const buffer = new window.CircularBuffer(30 * 16000, Module); // 30s buffer

            scriptNode.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Downsample if needed? AudioContext is 16k so likely no.
                // Original code does downsampling. We forced ctx to 16k.

                buffer.push(inputData);
                while (buffer.size() > vad.config.sileroVad.windowSize) {
                    const windowSize = vad.config.sileroVad.windowSize;
                    const s = buffer.get(buffer.head(), windowSize);
                    vad.acceptWaveform(s);
                    buffer.pop(windowSize);

                    if (vad.isDetected()) {
                        // Speech detected handle
                    }

                    while (!vad.isEmpty()) {
                        const segment = vad.front();
                        vad.pop();

                        // ASR
                        const recognizer = recognizerRef.current;
                        const stream = recognizer.createStream();
                        stream.acceptWaveform(16000, segment.samples);
                        recognizer.decode(stream);
                        const result = recognizer.getResult(stream);

                        if (result.text.trim()) {
                            setState(prev => ({
                                ...prev,
                                transcript: [...prev.transcript, {
                                    text: result.text,
                                    lang: result.lang || result.language || 'auto'
                                }]
                            }));
                        }
                        stream.free();
                    }
                }
            };

            source.connect(scriptNode);
            scriptNode.connect(audioCtx.destination);
            setState(prev => ({ ...prev, status: 'recording' }));

        } catch (error: any) {
            console.error('[Microphone Error]', error);
            let errorMessage = error.message;

            if (error.name === 'NotFoundError' || error.message.includes('The object can not be found here')) {
                errorMessage = '無法存取麥克風：找不到裝置。請確認手機權限已開啟，且並非使用 App 內建瀏覽器 (請使用 Chrome/Safari)。';
            } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = '無法存取麥克風：權限被拒絕。請至瀏覽器設定開啟權限。';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = '無法存取麥克風：裝置可能被其他應用程式佔用。';
            }

            setState(prev => ({ ...prev, error: errorMessage }));
        }

    }, []);

    const stopRecording = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
        }
        if (scriptNodeRef.current) {
            scriptNodeRef.current.disconnect();
        }
        setState(prev => ({ ...prev, status: 'ready' }));
    }, []);


    const clearTranscript = useCallback(() => {
        setState(prev => ({ ...prev, transcript: [] }));
    }, []);

    return {
        state,
        downloadModel,
        initRecognizer,
        startRecording,
        stopRecording,
        checkModelInStorage,
        clearTranscript,
    };
}
