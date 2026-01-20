'use client';

interface LogViewerProps {
    logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
    return (
        <div className="w-full max-w-3xl mt-8 p-4 bg-gray-900 rounded-lg text-xs font-mono text-green-400 overflow-y-auto max-h-48 border border-gray-700">
            <h3 className="text-gray-400 mb-2 border-b border-gray-700 pb-1">Debug Logs</h3>
            {logs.length === 0 ? (
                <div className="text-gray-600 italic">No logs yet...</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap font-mono mb-0.5">
                        <span className="text-gray-500 mr-2">[{i}]</span>
                        {log}
                    </div>
                ))
            )}
        </div>
    );
}
