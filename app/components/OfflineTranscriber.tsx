import React, { useEffect, useRef, useState } from 'react';
import { useOfflineWhisper } from '../hooks/useOfflineWhisper';
import { Mic, Square, Loader2, Volume2, History, Zap, RefreshCw } from 'lucide-react';

interface Props {
    hookUtils: ReturnType<typeof useOfflineWhisper>;
}

export default function OfflineTranscriber({ hookUtils }: Props) {
    const { state, startRecording, stopRecording } = hookUtils;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isContinuous, setIsContinuous] = useState(false);

    // Auto-scroll removed as per user request (newest on top)

    const isRecordActive = state.status === 'recording' || state.status === 'processing';
    const hasHistory = state.transcript.length > 0;

    // Mock Audio Visualizer Level
    const [audioLevel, setAudioLevel] = useState(10);
    useEffect(() => {
        if (isRecordActive) {
            const interval = setInterval(() => {
                setAudioLevel(Math.random() * 80 + 20); // Random 20-100
            }, 100);
            return () => clearInterval(interval);
        } else {
            setAudioLevel(10);
        }
    }, [isRecordActive]);

    const handleContinuousToggle = () => {
        setIsContinuous(!isContinuous);
        if (isContinuous && isRecordActive) stopRecording();
    };

    return (
        <div className="flex-1 flex flex-col h-full relative w-full max-w-2xl mx-auto pb-32 pt-6">
            {/* Status & Visualizer Area */}
            {/* Status Area Removed for Compactness */}

            {/* Empty State */}
            {!hasHistory && !isRecordActive && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
                    <History size={48} strokeWidth={1.5} />
                    <p className="text-sm font-medium">尚無轉寫紀錄</p>
                </div>
            )}

            {/* Transcription Log */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-4 px-2 no-scrollbar"
                style={{ minHeight: '300px' }}
            >
                {[...state.transcript].reverse().map((text, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md animate-in slide-in-from-top-2">
                        {/* Source Text (Original) */}
                        <div className="mb-2">
                            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">原文</p>
                            <div className="text-lg text-slate-800 font-medium leading-relaxed">
                                {text}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Bottom Controls */}
            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-8 pt-6 px-8 flex justify-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between w-full max-w-[320px] pb-4">

                    {/* Left: Continuous Mode Button */}
                    <button
                        onClick={handleContinuousToggle}
                        className={`
                            w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 border-2
                            ${isContinuous
                                ? 'bg-violet-600 text-white border-violet-600 shadow-violet-500/40'
                                : 'bg-white text-violet-600 border-violet-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-violet-50 hover:border-violet-300 hover:-translate-y-1'
                            }
                        `}
                    >
                        {isContinuous ? (
                            <Zap size={32} className="fill-current animate-pulse" />
                        ) : (
                            <RefreshCw size={32} />
                        )}
                    </button>

                    {/* Right: Record Button */}
                    <button
                        onClick={() => {
                            if (isRecordActive) stopRecording();
                            else startRecording();
                        }}
                        disabled={state.status === 'loading' || state.status === 'downloading'}
                        className={`
                            w-20 h-20 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 border-4
                            ${isRecordActive
                                ? 'bg-red-500 text-white border-red-100 shadow-red-500/40 animate-pulse'
                                : 'bg-indigo-600 text-white border-indigo-100 shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-105'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {isRecordActive ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
                    </button>

                </div>
            </div>
        </div>
    );
}
