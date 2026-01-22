'use client';

import { WHISPER_MODELS } from './config/models';
import { useOfflineWhisper } from './hooks/useOfflineWhisper';
import { useOnlineWhisper } from './hooks/useOnlineWhisper';
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
    const offlineHook = useOfflineWhisper(modelConfig);
    const onlineHook = useOnlineWhisper();

    // Switch logic: Use online hook if network available, otherwise offline hook
    const activeHook = isOnline ? onlineHook : offlineHook;
    const { state } = activeHook;

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden">

                {/* Sidebar Component */}
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    modelConfig={modelConfig}
                    hookUtils={offlineHook}
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
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-100 relative group" title={isOnline ? "Online Mode (WhisperLive)" : "Offline Mode (Local WASM)"}>
                                {isOnline ? (
                                    <>
                                        <Wifi size={18} className="text-green-500" />
                                        <div className="absolute top-9 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                            Online Mode
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff size={18} className="text-slate-400" />
                                        <div className="absolute top-9 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                            Offline Mode
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Clear Transcript Button */}
                            <button
                                onClick={activeHook.clearTranscript}
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

                    <OfflineTranscriber hookUtils={activeHook} />
                </main>
            </div>
        </ErrorBoundary>
    );
}
