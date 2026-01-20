'use client';

import { useOfflineWhisper } from '../hooks/useOfflineWhisper';
import { useState } from 'react';
import { ModelConfig } from '../config/models';
import localforage from 'localforage';

interface ModelManagerProps {
    modelConfig: ModelConfig;
    hookUtils: ReturnType<typeof useOfflineWhisper>;
    onModelChange: (key: string) => void;
    currentModelKey: string;
}

export default function ModelManager({ modelConfig, hookUtils, onModelChange, currentModelKey }: ModelManagerProps) {
    const { state, downloadModel, initRecognizer } = hookUtils;

    const [language, setLanguage] = useState('zh');
    const [translateToEnglish, setTranslateToEnglish] = useState(false);

    // Specific languages requested by user:
    // Chinese (zh), English (en), Vietnamese (vi), Indonesian (id), Thai (th)
    const languages = [
        { code: 'zh', name: '繁體中文' },
        { code: 'en', name: 'English' },
        { code: 'vi', name: 'Vietnamese' },
        { code: 'id', name: 'Indonesian' },
        { code: 'th', name: 'Thai' },
    ];

    if (state.status === 'ready' || state.status === 'recording' || state.status === 'processing') {
        return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <div className="flex flex-col gap-1">
                    <span className="font-medium">Model Ready: {modelConfig.name}</span>
                    <div className="flex gap-2 text-sm mt-1">
                        <span className="bg-green-100 px-2 py-0.5 rounded border border-green-200">
                            Lang: {languages.find(l => l.code === language)?.name || language}
                        </span>
                        {translateToEnglish && (
                            <span className="bg-blue-100 px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                                Translate to English
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (state.status === 'downloading') {
        return (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Downloading Model...</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${state.progress}%` }}
                    ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{state.progress.toFixed(0)}%</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-center">
            <h3 className="font-semibold text-lg mb-2">{modelConfig.name}</h3>
            <p className="text-gray-500 mb-4 text-sm">Download the model to use offline</p>

            <div className="mb-4 text-left max-w-xs mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Model</label>
                <select
                    value={currentModelKey}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-3"
                    disabled={state.status !== 'idle' && state.status !== 'error'}
                >
                    <option value="tiny">Tiny (Faster, Less Accurate)</option>
                    <option value="base">Base (Slower, More Accurate)</option>
                </select>

                <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-3"
                >
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>

                <div className="flex items-center">
                    <input
                        id="translate-checkbox"
                        type="checkbox"
                        checked={translateToEnglish}
                        onChange={(e) => setTranslateToEnglish(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="translate-checkbox" className="ml-2 block text-sm text-gray-900">
                        Translate to English
                    </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                    If checked, the output will be translated to English regardless of the spoken language.
                </p>
            </div>

            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => {
                        console.log('Download button clicked');
                        downloadModel()
                            .then((ok) => {
                                console.log('Download finished, ok:', ok);
                                if (ok) initRecognizer(language, translateToEnglish ? 'translate' : 'transcribe');
                            })
                            .catch(err => {
                                console.error('Button error:', err);
                                alert('Error: ' + err.message);
                            });
                    }}
                    disabled={state.status !== 'idle' && state.status !== 'error'}
                    className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Download & Initialize
                </button>

                {state.status === 'error' && (
                    <button
                        onClick={() => {
                            console.log('Retry button clicked');
                            initRecognizer(language, translateToEnglish ? 'translate' : 'transcribe');
                        }}
                        className="mt-2 w-full py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Retry Init
                    </button>
                )}

                <button
                    onClick={() => {
                        console.log('Reset button clicked');
                        if (confirm('Clear all cached models?')) {
                            localforage.clear()
                                .then(() => {
                                    console.log('Cache cleared');
                                    alert('Cache cleared. Please refresh.');
                                    window.location.reload();
                                })
                                .catch(err => {
                                    console.error('Reset error:', err);
                                    alert('Reset failed: ' + err.message);
                                });
                        }
                    }}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                >
                    Reset/Clear Cache
                </button>
            </div>

            {state.status === 'error' && (
                <p className="mt-4 text-red-500 text-sm">{state.error}</p>
            )}
        </div>
    );
}
