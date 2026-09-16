import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Copy, Loader2, RefreshCw, Megaphone } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ProcessingControls } from './components/ProcessingControls';
import { MaskRefiner } from './components/MaskRefiner';
import { LegalModal } from './components/LegalModal';
import { ShareModal } from './components/ShareModal';

type ProcessingState = 'IDLE' | 'DOWNLOADING' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export default function App() {
  const [appState, setAppState] = useState<ProcessingState>('IDLE');
  const [progress, setProgress] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const [threshold, setThreshold] = useState(0.0);
  const [backgroundColor, setBackgroundColor] = useState('transparent');

  const [isRefining, setIsRefining] = useState(false);
  const [brushMode, setBrushMode] = useState<'add' | 'remove'>('remove');
  const [brushSize, setBrushSize] = useState(30);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const postProcessConfigRef = useRef({ threshold, backgroundColor });
  useEffect(() => {
    postProcessConfigRef.current = { threshold, backgroundColor };
  }, [threshold, backgroundColor]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/rmbg.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;

      switch (type) {
        case 'PROGRESS':
          setAppState('DOWNLOADING');
          setProgress(payload);
          break;
        case 'READY':
          setAppState('READY');
          break;
        case 'PROCESSING_START':
          setAppState('PROCESSING');
          break;
        case 'COMPLETED':
          setProcessedUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(payload);
          });
          setProcessedBlob(payload);
          setAppState('COMPLETED');
          break;
        case 'MODIFIER_APPLIED':
          workerRef.current?.postMessage({
            type: 'POST_PROCESS',
            payload: postProcessConfigRef.current
          });
          break;
        case 'ERROR':
          setAppState('ERROR');
          setErrorMsg(payload);
          break;
      }
    };

    workerRef.current.postMessage({ type: 'INIT' });

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
    };
  }, []);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [processedUrl]);

  useEffect(() => {
    if (appState !== 'COMPLETED' || !workerRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      workerRef.current?.postMessage({
        type: 'POST_PROCESS',
        payload: { threshold, backgroundColor }
      });
    }, 100);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [threshold, backgroundColor, appState]);

  const handleMaskUpdate = useCallback((imageData: ImageData) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_MASK_MODIFIER',
        payload: { modifierImageData: imageData }
      });
    }
  }, []);

  const handleImageSelect = useCallback(async (file: File) => {
    if (appState !== 'READY' && appState !== 'COMPLETED' && appState !== 'ERROR') return;

    setThreshold(0.0);
    setBackgroundColor('transparent');
    setIsRefining(false);

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);

    setOriginalUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setProcessedBlob(null);
    setAppState('PROCESSING');

    const bitmap = await createImageBitmap(file);
    setImageSize({ width: bitmap.width, height: bitmap.height });

    workerRef.current?.postMessage({
      type: 'PROCESS',
      payload: {
        imageBitmap: bitmap,
        width: bitmap.width,
        height: bitmap.height
      }
    }, [bitmap]);
  }, [appState, originalUrl, processedUrl]);

  const handleDownload = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = 'rmbg-result.png';
    a.click();
  }, [processedUrl]);

  const handleCopy = useCallback(async () => {
    if (!processedBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': processedBlob })
      ]);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
      alert('Failed to copy to clipboard. Note: Not all browsers support copying transparent PNGs directly.');
    }
  }, [processedBlob]);

  const resetApp = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setIsRefining(false);
    setAppState('READY');
    setErrorMsg('');
  }, [originalUrl, processedUrl]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = useCallback(async () => {
    setIsShareModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-12">
      <header className="mb-12 flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="flex gap-6 items-start">
          <img src="/favicon.svg" alt="Logo" className="w-16 h-16 md:w-24 md:h-24 mt-2 shrink-0" />
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">ihatebg</h1>
            <p className="text-xl md:text-2xl text-gray-400 font-bold tracking-tight">
              100% Free and Client-Side Background Removal without Paywall or Watermarks
            </p>
            <p className="text-sm mt-2 text-gray-500 font-medium">
              Zero uploads (your files never leave your device). Absolute privacy. Powered by WebGPU. aaaannndddddd completely Free!
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleShare}
          className="shrink-0 flex items-center gap-2 px-6 py-3 border-2 border-white bg-white text-black hover:bg-black hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          <Megaphone className="w-5 h-5" />
          Spread the word
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto">

        {appState === 'DOWNLOADING' && (
          <div className="w-full max-w-xl p-8 border border-[#333333] bg-[#0a0a0a] text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Caching AI Model</h2>
            <p className="text-gray-400 text-sm mb-4">
              Downloading RMBG-1.4 model (one-time). This stays in your browser.
            </p>
            {progress && progress.status === 'progress' && (
              <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                />
              </div>
            )}
            {progress && progress.file && (
              <p className="text-xs text-gray-500 mt-2 font-mono">{progress.file}</p>
            )}
          </div>
        )}

        {appState === 'ERROR' && (
          <div className="w-full max-w-xl p-8 border border-red-900 bg-red-950/20 text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">Initialization Error</h2>
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-900 text-white font-bold hover:bg-red-800 transition-colors"
            >
              Reload Page
            </button>
          </div>
        )}

        {(appState === 'READY' || (appState === 'IDLE' && !originalUrl)) && !originalUrl && appState !== 'DOWNLOADING' && appState !== 'ERROR' && (
          <Dropzone onImageSelect={handleImageSelect} />
        )}

        {appState === 'PROCESSING' && originalUrl && !processedUrl && (
          <div className="w-full max-w-xl p-8 border border-[#333333] text-center bg-[#0a0a0a]">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Crunching Pixels...</h2>
            <p className="text-gray-400 text-sm">
              Applying neural networks directly in your browser.
            </p>
          </div>
        )}

        {(appState === 'COMPLETED' || processedUrl) && originalUrl && processedUrl && (
          <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
            {isRefining ? (
              <MaskRefiner
                originalImage={originalUrl}
                processedImage={processedUrl}
                imageSize={imageSize}
                brushSize={brushSize}
                brushMode={brushMode}
                onMaskUpdate={handleMaskUpdate}
              />
            ) : (
              <ComparisonSlider
                originalImage={originalUrl}
                processedImage={processedUrl}
              />
            )}

            <ProcessingControls
              threshold={threshold}
              onThresholdChange={setThreshold}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              isRefining={isRefining}
              onToggleRefining={setIsRefining}
              brushMode={brushMode}
              onBrushModeChange={setBrushMode}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
            />

            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-3 border border-[#333333] hover:border-white transition-colors font-bold"
              >
                <Copy className="w-5 h-5" />
                Copy to Clipboard
              </button>

              <button
                onClick={resetApp}
                className="flex items-center gap-2 px-6 py-3 border border-[#333333] hover:border-red-500 hover:text-red-500 transition-colors font-bold"
              >
                <RefreshCw className="w-5 h-5" />
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 w-full max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-mono gap-4 pb-8">
        <p>© {new Date().getFullYear()} ihatebg. Everything runs on your machine.</p>
        <div className="flex items-center gap-4">
          <button onClick={() => setLegalModalType('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
          <button onClick={() => setLegalModalType('terms')} className="hover:text-white transition-colors">Terms of Service</button>
          <a href="https://huggingface.co/briaai/RMBG-1.4" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Model License</a>
        </div>
      </footer>

      <LegalModal 
        isOpen={legalModalType !== null} 
        type={legalModalType} 
        onClose={() => setLegalModalType(null)} 
      />

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </div>
  );
}
