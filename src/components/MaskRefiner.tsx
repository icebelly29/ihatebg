import { useRef, useEffect, useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MaskRefinerProps {
  originalImage: string;
  processedImage: string;
  imageSize: { width: number; height: number };
  brushSize: number;
  brushMode: 'add' | 'remove';
  onMaskUpdate: (imageData: ImageData) => void;
}

export function MaskRefiner({ originalImage, processedImage, imageSize, brushSize, brushMode, onMaskUpdate }: MaskRefinerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement>(null);
  const processedImgRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  
  // Contexts
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null); // Worker red/green strokes
  const [strokeCtx, setStrokeCtx] = useState<CanvasRenderingContext2D | null>(null); // Add mode masking
  const [previewCtx, setPreviewCtx] = useState<CanvasRenderingContext2D | null>(null); // Live display

  useEffect(() => {
    if (imageSize.width > 0 && previewCanvasRef.current) {
      const pCtx = previewCanvasRef.current.getContext('2d');
      if (pCtx) setPreviewCtx(pCtx);
      
      const memCanvas = document.createElement('canvas');
      memCanvas.width = imageSize.width;
      memCanvas.height = imageSize.height;
      const memContext = memCanvas.getContext('2d', { willReadFrequently: true });
      if (memContext) {
        memContext.lineCap = 'round';
        memContext.lineJoin = 'round';
        setCtx(memContext);
      }
      
      const sCanvas = document.createElement('canvas');
      sCanvas.width = imageSize.width;
      sCanvas.height = imageSize.height;
      setStrokeCtx(sCanvas.getContext('2d'));
    }
  }, [imageSize]);

  // Robustly draw the processed image whenever imageSize or processedImage changes, 
  // or when the image finishes loading.
  useEffect(() => {
    const pCtx = previewCanvasRef.current?.getContext('2d');
    if (pCtx && processedImgRef.current && processedImgRef.current.complete && processedImgRef.current.naturalWidth > 0 && imageSize.width > 0) {
      pCtx.clearRect(0, 0, imageSize.width, imageSize.height);
      pCtx.globalCompositeOperation = 'source-over';
      pCtx.drawImage(processedImgRef.current, 0, 0, imageSize.width, imageSize.height);
    }
  }, [imageSize, processedImage]);

  // When the worker finishes processing and updates the processed image, redraw it
  const handleProcessedLoad = () => {
    const pCtx = previewCanvasRef.current?.getContext('2d');
    if (pCtx && processedImgRef.current && imageSize.width > 0) {
      pCtx.clearRect(0, 0, imageSize.width, imageSize.height);
      pCtx.globalCompositeOperation = 'source-over';
      pCtx.drawImage(processedImgRef.current, 0, 0, imageSize.width, imageSize.height);
    }
  };

  const getScale = () => {
    if (!previewCanvasRef.current) return { scaleX: 1, scaleY: 1 };
    const rect = previewCanvasRef.current.getBoundingClientRect();
    return {
      scaleX: imageSize.width / rect.width,
      scaleY: imageSize.height / rect.height
    };
  };

  const getCoordinates = (clientX: number, clientY: number) => {
    if (!previewCanvasRef.current) return { x: 0, y: 0 };
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const { scaleX, scaleY } = getScale();
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!ctx || !previewCtx || !strokeCtx) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const { x, y } = getCoordinates(clientX, clientY);
    lastPosRef.current = { x, y };
    setIsDrawing(true);
    
    drawSegment(x, y, x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !ctx || !previewCtx || !strokeCtx) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const { x, y } = getCoordinates(clientX, clientY);
    drawSegment(lastPosRef.current.x, lastPosRef.current.y, x, y);
    lastPosRef.current = { x, y };
  };

  const drawSegment = (x0: number, y0: number, x1: number, y1: number) => {
    if (!ctx || !previewCtx || !strokeCtx || !originalImgRef.current) return;
    const { scaleX } = getScale();
    const scaledBrushSize = brushSize * scaleX;

    // 1. Draw hidden worker mask (Green/Red)
    ctx.lineWidth = scaledBrushSize;
    ctx.strokeStyle = brushMode === 'add' ? '#00FF00' : '#FF0000';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // 2. Perform live compositing preview
    if (brushMode === 'add') {
      strokeCtx.clearRect(0, 0, imageSize.width, imageSize.height);
      
      strokeCtx.globalCompositeOperation = 'source-over';
      strokeCtx.lineWidth = scaledBrushSize;
      strokeCtx.lineCap = 'round';
      strokeCtx.lineJoin = 'round';
      strokeCtx.strokeStyle = 'white';
      strokeCtx.beginPath();
      strokeCtx.moveTo(x0, y0);
      strokeCtx.lineTo(x1, y1);
      strokeCtx.stroke();
      
      strokeCtx.globalCompositeOperation = 'source-in';
      strokeCtx.drawImage(originalImgRef.current, 0, 0, imageSize.width, imageSize.height);
      
      previewCtx.globalCompositeOperation = 'source-over';
      previewCtx.drawImage(strokeCtx.canvas, 0, 0);
    } else {
      previewCtx.globalCompositeOperation = 'destination-out';
      previewCtx.lineWidth = scaledBrushSize;
      previewCtx.lineCap = 'round';
      previewCtx.lineJoin = 'round';
      previewCtx.strokeStyle = 'black';
      previewCtx.beginPath();
      previewCtx.moveTo(x0, y0);
      previewCtx.lineTo(x1, y1);
      previewCtx.stroke();
    }
  };

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !ctx) return;
    setIsDrawing(false);
    ctx.closePath();
    
    // Commit to worker
    const imageData = ctx.getImageData(0, 0, imageSize.width, imageSize.height);
    onMaskUpdate(imageData);
    
    // Clear worker memory canvas so strokes don't accumulate
    ctx.clearRect(0, 0, imageSize.width, imageSize.height);
  }, [isDrawing, ctx, imageSize, onMaskUpdate]);

  const stopDrawingRef = useRef(stopDrawing);
  
  useEffect(() => {
    stopDrawingRef.current = stopDrawing;
  }, [stopDrawing]);

  useEffect(() => {
    const handleMouseUp = () => stopDrawingRef.current();
    if (isDrawing) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDrawing]);

  const brushCursorSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
      <path d="M14.5 17.5 4.5 15"/>
    </svg>
  `.trim());

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-3xl mx-auto select-none border border-[#333333] bg-black checkerboard"
      style={{ cursor: `url('data:image/svg+xml;utf8,${brushCursorSvg}') 0 24, crosshair` }}
    >
      {/* Hidden Source Images */}
      <img ref={originalImgRef} src={originalImage} className="hidden" alt="Original" />
      <img 
        ref={processedImgRef} 
        src={processedImage || originalImage} 
        className="hidden" 
        alt="Processed"
        onLoad={handleProcessedLoad} 
      />

      {/* Live Preview Canvas replaces the img tag */}
      <canvas 
        ref={previewCanvasRef}
        width={imageSize.width}
        height={imageSize.height}
        className={cn(
          "block w-full h-auto touch-none transition-opacity duration-200",
          brushMode === 'add' ? 'opacity-80' : 'opacity-100'
        )}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchMove={draw}
      />

      {/* Reference Layer: Original image faintly visible behind the live canvas for 'add' mode */}
      {brushMode === 'add' && (
        <img 
          src={originalImage} 
          alt="Original Reference" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20 mix-blend-screen -z-10"
        />
      )}
    </div>
  );
}
