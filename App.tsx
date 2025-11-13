
import React, { useState, useCallback, useRef } from 'react';
import { convertFile, ConversionFormat } from './services/geminiService';

// --- Helper Components & Icons ---

const FileConvertIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M9 14l-2 2 2 2"></path>
        <path d="M15 14l2 2-2 2"></path>
    </svg>
);

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const PdfIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-700 rounded-full h-2.5">
    <div
      className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-linear"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

const Header: React.FC = () => (
    <header className="p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4">
            <FileConvertIcon />
            <h1 className="text-2xl font-bold tracking-tight text-white">Gemini PDF Converter</h1>
        </div>
    </header>
);

const formats: { id: ConversionFormat; name: string }[] = [
    { id: 'txt', name: 'Text (.txt)' },
    { id: 'word', name: 'Word (.docx)' },
    { id: 'excel', name: 'Excel (.csv)' },
    { id: 'html', name: 'HTML (.html)' },
    { id: 'markdown', name: 'Markdown (.md)' },
    { id: 'json', name: 'JSON (.json)' },
];

const App: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [outputFormat, setOutputFormat] = useState<ConversionFormat>('txt');
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<number | null>(null);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPdfFile(file);
            setResult('');
            setError(null);
        }
    };
    
    const handleUploaderClick = () => {
        fileInputRef.current?.click();
    };

    const handleConvertClick = useCallback(async () => {
        if (!pdfFile) {
            setError("Please upload a PDF file.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult('');
        setProgress(0);

        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = window.setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 95;
                }
                return prev + 5;
            });
        }, 200);

        try {
            const conversionResult = await convertFile(outputFormat, pdfFile);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            setResult(conversionResult);
        } catch (e: any) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setError(e.message || "An unexpected error occurred.");
        } finally {
            setTimeout(() => {
                setIsLoading(false);
            }, 500);
        }
    }, [pdfFile, outputFormat]);
    
    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setError('Failed to copy text to clipboard.');
        });
    };

    const handleDownload = () => {
        if (!result || !pdfFile) return;

        let mimeType = '';
        let fileExtension = '';

        switch (outputFormat) {
            case 'txt':
                mimeType = 'text/plain';
                fileExtension = 'txt';
                break;
            case 'word':
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                fileExtension = 'docx';
                break;
            case 'excel':
                mimeType = 'text/csv';
                fileExtension = 'csv';
                break;
            case 'html':
                mimeType = 'text/html';
                fileExtension = 'html';
                break;
            case 'markdown':
                mimeType = 'text/markdown';
                fileExtension = 'md';
                break;
            case 'json':
                mimeType = 'application/json';
                fileExtension = 'json';
                break;
        }

        const blob = new Blob([result], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const originalName = pdfFile.name.substring(0, pdfFile.name.lastIndexOf('.')) || pdfFile.name;
        a.download = `${originalName}-${outputFormat}.${fileExtension}`;
        
        a.href = url;
        document.body.appendChild(a);
a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const canConvert = pdfFile && !isLoading;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Inputs */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-3 text-blue-300">1. Upload PDF</h2>
                            <input
                                type="file"
                                accept="application/pdf"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div 
                                className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:border-blue-400 hover:bg-gray-800/50 transition-colors"
                                onClick={handleUploaderClick}
                            >
                                {pdfFile ? (
                                    <div className="text-center p-4">
                                        <PdfIcon />
                                        <p className="mt-2 text-gray-300 font-medium break-all">{pdfFile.name}</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <UploadIcon />
                                        <p className="mt-2 text-gray-400">Click to upload a PDF file</p>
                                    </div>
                                )}
                            </div>
                            {pdfFile && (
                                <button
                                    onClick={handleUploaderClick}
                                    className="w-full mt-3 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
                                >
                                    Change PDF
                                </button>
                            )}
                        </div>
                        
                        <div>
                             <h2 className="text-xl font-semibold mb-3 text-blue-300">2. Select Output Format</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {formats.map((format) => (
                                    <button
                                        key={format.id}
                                        onClick={() => setOutputFormat(format.id)}
                                        disabled={isLoading}
                                        className={`w-full py-3 px-4 rounded-md transition-all duration-200 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                                            outputFormat === format.id
                                                ? 'bg-blue-600 ring-2 ring-blue-400 shadow-md'
                                                : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                    >
                                        {format.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleConvertClick}
                            disabled={!canConvert}
                            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center ${
                                canConvert
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-700/50'
                                    : 'bg-gray-700 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? 'Converting...' : 'Convert File'}
                        </button>
                    </div>

                    {/* Right Column: Output */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                             <h2 className="text-xl font-semibold text-blue-300">3. Converted Content</h2>
                             <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleCopy}
                                    disabled={!result || isLoading}
                                    className="py-1 px-3 text-sm bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={!result || isLoading}
                                    className="py-1 px-3 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                >
                                    <DownloadIcon />
                                    Download
                                </button>
                             </div>
                        </div>
                         <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex-grow min-h-[30rem] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <ProgressBar progress={progress} />
                                    <p className="text-gray-400 text-sm">{`Converting... ${progress}%`}</p>
                                </div>
                            ) : error ? (
                                <p className="text-red-400">{error}</p>
                            ) : result ? (
                                <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                                    {result}
                                </pre>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Your converted content will appear here.</p>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
