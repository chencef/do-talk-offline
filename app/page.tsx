'use client';

import { WHISPER_MODELS } from './config/models';
import { useOfflineWhisper } from './hooks/useOfflineWhisper';
import Sidebar from './components/Sidebar';
import OfflineTranscriber from './components/OfflineTranscriber';
import ErrorBoundary from './components/ErrorBoundary';
import { Menu, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
    const [modelKey, setModelKey] = useState<string>('base');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const modelConfig = WHISPER_MODELS[modelKey];
    const hookUtils = useOfflineWhisper(modelConfig);
    const { state } = hookUtils;

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden">

                {/* Sidebar Component */}
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    modelConfig={modelConfig}
                    hookUtils={hookUtils}
                    onModelChange={setModelKey}
                    currentModelKey={modelKey}
                />

                {/* Header */}
                <header className="w-full bg-white shadow-sm py-4 px-4 sticky top-0 z-20">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <h1 className="text-2xl font-bold text-slate-800 tracking-wide whitespace-nowrap">
                            Do-Talk <span className="text-sm font-semibold text-slate-500 ml-1">( 泰語 &lt;-&gt; ภาษาจีน)</span>
                        </h1>

                        <div className="flex items-center justify-end gap-3">
                            {/* Network Status */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-100" title={isOnline ? "Online" : "Offline"}>
                                {isOnline ? (
                                    <Wifi size={18} className="text-green-500" />
                                ) : (
                                    <WifiOff size={18} className="text-slate-400" />
                                )}
                            </div>

                            {/* Clear Transcript Button */}
                            <button
                                onClick={hookUtils.clearTranscript}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="清除紀錄"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 w-full max-w-2xl px-4 flex flex-col">
                    {/* Error Message */}
                    {state.error && (
                        <div className="mb-4 mt-6 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center justify-center">
                            {state.error}
                        </div>
                    )}

                    <OfflineTranscriber hookUtils={hookUtils} />
                </main>
            </div>
        </ErrorBoundary>
    );
}
