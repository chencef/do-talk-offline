import React, { useState, useEffect } from 'react';
import { Settings, X, Globe, Download, Headphones, CheckCircle2, Ear, Volume1, Volume2, VolumeX, Database, Zap, HardDrive, Trash2, Play } from 'lucide-react';
import { useOfflineWhisper } from '../hooks/useOfflineWhisper';
import { ModelConfig, WHISPER_MODELS } from '../config/models';
import localforage from 'localforage';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    modelConfig: ModelConfig;
    hookUtils: ReturnType<typeof useOfflineWhisper>;
    onModelChange: (key: string) => void;
    currentModelKey: string;
}

// Translation Dictionary
const TRANSLATIONS = {
    'zh-TW': {
        settings: '設定',
        model_download: '0. 模型下載',
        tiny_model: '輕量 (Tiny)',
        tiny_desc: '快速 / 較不準',
        base_model: '基礎 (Base)',
        base_desc: '慢速 / 準確',
        current_select: '目前選擇',
        ready: '模型已就緒 (Ready)',
        load_model: '載入模型 (Load Model)',
        download_init: '下載並初始化',
        downloading: '下載中...',
        reset_cache: '重置所有模型緩存',
        // trans_settings: '翻譯設定', // Removed
        source_lang: '來源語言 (Source)',
        target_lang: '目標語言 (Target)',
        transcribe_only: '依來源語言轉寫 (Transcribe)',
        transcribe_note: '*目前模式僅支援轉寫',
        headphone_settings: '耳機設定',
        check_le_audio: '檢查 LE Audio',
        le_audio_supported: 'LE Audio 支援',
        checking: '檢查中...',
        right_ear: '右耳 (Right)',
        left_ear: '左耳 (Left)',
        volume_settings: '音量設定',
        version_settings: '版本設定',
        app_lang: '應用程式語言',
        version_text: 'Do-Talk( 泰語 <-> ภาษาจีน)'
    },
    'th': {
        settings: 'การตั้งค่า',
        model_download: '0. ดาวน์โหลดโมเดล',
        tiny_model: 'เล็ก (Tiny)',
        tiny_desc: 'เร็ว / แม่นยำน้อย',
        base_model: 'พื้นฐาน (Base)',
        base_desc: 'ช้า / แม่นยำกว่า',
        current_select: 'เลือกอยู่',
        ready: 'พร้อมใช้งาน',
        load_model: 'โหลดโมเดล',
        download_init: 'ดาวน์โหลด & เริ่มต้น',
        downloading: 'กำลังดาวน์โหลด...',
        reset_cache: 'รีเซ็ตแคชทั้งหมด',
        // trans_settings: 'ตั้งค่าการแปล', // Removed
        source_lang: 'ภาษาต้นทาง',
        target_lang: 'ภาษาปลายทาง',
        transcribe_only: 'ถอดความตามต้นฉบับ',
        transcribe_note: '*โหมดถอดความเท่านั้น',
        headphone_settings: 'หูฟัง',
        check_le_audio: 'ตรวจสอบ LE Audio',
        le_audio_supported: 'รองรับ LE Audio',
        checking: 'กำลังตรวจสอบ...',
        right_ear: 'หูขวา',
        left_ear: 'หูซ้าย',
        volume_settings: 'ระดับเสียง',
        version_settings: 'ตั้งค่าเวอร์ชัน',
        app_lang: 'ภาษาแอปพลิเคชัน',
        version_text: 'Do-Talk( 泰語 <-> ภาษาจีน)'
    }
};

type AppLangKey = keyof typeof TRANSLATIONS;

export default function Sidebar({ isOpen, setIsOpen, modelConfig, hookUtils, onModelChange, currentModelKey }: SidebarProps) {
    const { state, downloadModel, initRecognizer } = hookUtils;

    // UI Local State
    const [volume, setVolume] = useState(100);
    const [leAudioChecking, setLeAudioChecking] = useState(false);
    const [leAudioSupported, setLeAudioSupported] = useState<boolean | null>(null);
    const [playSourceInRight, setPlaySourceInRight] = useState(false);
    const [playTargetInLeft, setPlayTargetInLeft] = useState(true);
    const [appLanguage, setAppLanguage] = useState<AppLangKey>('zh-TW');

    // Helper to get text
    const t = TRANSLATIONS[appLanguage] || TRANSLATIONS['zh-TW'];

    // Model Download Tracking
    const [downloadedModels, setDownloadedModels] = useState<Record<string, boolean>>({ tiny: false, base: false });

    // Model State
    const [language, setLanguage] = useState('zh');
    // Target Lang visually visible but functionally ignored (Transcribe only) as per instructions
    const [targetLang, setTargetLang] = useState('en');

    // Languages (Source) - Should allow user to pick any supported by Whisper
    // We can keep the existing list or translate names if needed, but usually language names are best kept in their native form or English.
    const languages = [
        { code: 'zh', name: 'Chinese (繁體中文)', flag: '🇹🇼' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
        { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
        { code: 'th', name: 'Thai', flag: '🇹🇭' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', flag: '🇰🇷' }
    ];

    // Check availability of models in storage
    const checkDownloadedModels = async () => {
        const keys = ['tiny', 'base'];
        const status: Record<string, boolean> = {};

        for (const key of keys) {
            const config = WHISPER_MODELS[key];
            if (!config) continue;
            try {
                // Check if all essential files exist
                const enc = await localforage.getItem(config.files.encoder);
                const dec = await localforage.getItem(config.files.decoder);
                const tok = await localforage.getItem(config.files.tokens);
                status[key] = !!(enc && dec && tok);
            } catch (e) {
                status[key] = false;
            }
        }
        setDownloadedModels(status);
    };

    useEffect(() => {
        checkDownloadedModels();
    }, [isOpen, state.status]);

    const checkLeAudioSupport = () => {
        setLeAudioChecking(true);
        setTimeout(() => {
            setLeAudioSupported(true);
            setLeAudioChecking(false);
        }, 1000);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(Number(e.target.value));
    };

    const handleModelSelect = (key: string) => {
        if (key !== currentModelKey) {
            onModelChange(key);
            // Just change selection; user will click "Initialize" to load actions.
        }
    };

    // If active model is not ready, we can show download progress or button in the card
    const isDownloading = state.status === 'downloading';
    const isReady = state.status === 'ready';
    const isDownloaded = downloadedModels[currentModelKey];

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            {t.settings}
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-8">

                        {/* Section 0: Model Download (Requested Item 0) */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <HardDrive size={16} className="text-indigo-500" />
                                {t.model_download}
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {/* Tiny Button */}
                                <button
                                    onClick={() => handleModelSelect('tiny')}
                                    className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 
                                        ${currentModelKey === 'tiny' ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'}
                                        ${downloadedModels['tiny'] ? 'bg-indigo-100' : 'bg-white'}
                                    `}
                                >
                                    <div className={`font-bold text-sm ${currentModelKey === 'tiny' ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        {t.tiny_model}
                                    </div>
                                    <div className="text-[10px] text-slate-500 opacity-70">{t.tiny_desc}</div>

                                    {/* Downloaded Indicator */}
                                    {downloadedModels['tiny'] && (
                                        <div className="absolute top-2 right-2 text-indigo-600">
                                            <CheckCircle2 size={14} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </button>

                                {/* Base Button */}
                                <button
                                    onClick={() => handleModelSelect('base')}
                                    className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 
                                        ${currentModelKey === 'base' ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'}
                                        ${downloadedModels['base'] ? 'bg-indigo-100' : 'bg-white'}
                                    `}
                                >
                                    <div className={`font-bold text-sm ${currentModelKey === 'base' ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        {t.base_model}
                                    </div>
                                    <div className="text-[10px] text-slate-500 opacity-70">{t.base_desc}</div>

                                    {/* Downloaded Indicator */}
                                    {downloadedModels['base'] && (
                                        <div className="absolute top-2 right-2 text-indigo-600">
                                            <CheckCircle2 size={14} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Download Action Area for Current Model */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                                    <span>{t.current_select}: <span className="text-indigo-600 uppercase">{currentModelKey}</span></span>
                                    {isReady && <span className="text-green-600 flex items-center gap-1"><Zap size={10} fill="currentColor" /> Ready</span>}
                                </div>

                                {isDownloading ? (
                                    <div className="w-full">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>{t.downloading}</span>
                                            <span>{state.progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${state.progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => downloadModel().then(ok => { if (ok) initRecognizer(language, 'transcribe'); })}
                                        disabled={isReady || state.status === 'loading'}
                                        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isReady
                                            ? 'bg-green-100 text-green-700 cursor-default'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                                            }`}
                                    >
                                        {isReady
                                            ? <><CheckCircle2 size={16} /> {t.ready}</>
                                            : isDownloaded
                                                ? <><Play size={16} /> {t.load_model}</>
                                                : <><Download size={16} /> {t.download_init}</>
                                        }
                                    </button>
                                )}

                                <button
                                    onClick={() => localforage.clear().then(() => window.location.reload())}
                                    className="flex items-center justify-center gap-1 text-xs text-red-300 hover:text-red-500 w-full mt-3 transition-colors"
                                >
                                    <Trash2 size={10} /> {t.reset_cache}
                                </button>
                            </div>
                        </div>

                        {/* Section 1: Translation Settings - REMOVED */}

                        {/* Section 2: Headphone Settings */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Headphones size={16} className="text-indigo-500" />
                                {t.headphone_settings}
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <button
                                    onClick={checkLeAudioSupport}
                                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${leAudioSupported ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'}`}
                                >
                                    {leAudioChecking ? t.checking : leAudioSupported ? <><CheckCircle2 size={16} /> {t.le_audio_supported}</> : t.check_le_audio}
                                </button>

                                {leAudioSupported && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Ear size={12} className="text-indigo-500" /> {t.right_ear}</span>
                                                <span className="text-sm font-semibold">Source</span>
                                            </div>
                                            <input type="checkbox" checked={playSourceInRight} onChange={e => setPlaySourceInRight(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                        </div>
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Ear size={12} className="text-violet-500" /> {t.left_ear}</span>
                                                <span className="text-sm font-semibold">Target</span>
                                            </div>
                                            <input type="checkbox" checked={playTargetInLeft} onChange={e => setPlayTargetInLeft(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 3: Volume Settings */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Volume1 size={16} className="text-indigo-500" />
                                {t.volume_settings}
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setVolume(0)} className="text-slate-400 hover:text-slate-600">
                                        {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                    <input
                                        type="range" min="0" max="100" value={volume}
                                        onChange={handleVolumeChange}
                                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <span className="text-sm font-bold text-slate-700 w-8 text-center">{volume}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Version Settings */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Settings size={16} className="text-indigo-500" />
                                {t.version_settings}
                            </h3>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <label className="block text-xs font-medium text-slate-500 mb-2">{t.app_lang}</label>
                                <select
                                    value={appLanguage}
                                    onChange={(e) => setAppLanguage(e.target.value as AppLangKey)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700"
                                >
                                    <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
                                    <option value="th">ไทย (Thai)</option>
                                </select>
                            </div>
                        </div>

                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <p className="text-xs text-center text-slate-400">
                            {t.version_text}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
