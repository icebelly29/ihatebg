import { useState, useRef, useCallback, useEffect } from 'react';




interface ComparisonSliderProps {
  originalImage: string;
  processedImage: string;
}

export function ComparisonSlider({ originalImage, processedImage }: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-3xl mx-auto aspect-video select-none overflow-hidden border border-[#333333] bg-black"
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Background: Checkerboard */}
      <div className="absolute inset-0 w-full h-full checkerboard pointer-events-none" />
      
      {/* Processed Image (Background) */}
      <img 
        src={processedImage} 
        alt="Processed" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      
      {/* Original Image (Foreground, clipped) */}
      <img 
        src={originalImage} 
        alt="Original" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      />

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center transform -translate-x-1/2"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white border-2 border-black rounded-full shadow-[0_0_0_2px_white] flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-0.5 h-3 bg-black" />
            <div className="w-0.5 h-3 bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
