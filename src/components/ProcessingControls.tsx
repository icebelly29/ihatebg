
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Paintbrush, Eraser, MoveHorizontal } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProcessingControlsProps {
  threshold: number;
  onThresholdChange: (val: number) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  isRefining: boolean;
  onToggleRefining: (val: boolean) => void;
  brushMode: 'add' | 'remove';
  onBrushModeChange: (mode: 'add' | 'remove') => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

const COLORS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#ff0000' },
  { label: 'Blue', value: '#0000ff' },
  { label: 'Green', value: '#00ff00' },
];

export function ProcessingControls({
  threshold,
  onThresholdChange,
  backgroundColor,
  onBackgroundColorChange,
  isRefining,
  onToggleRefining,
  brushMode,
  onBrushModeChange,
  brushSize,
  onBrushSizeChange
}: ProcessingControlsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 p-6 border border-[#333333] bg-[#0a0a0a]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold tracking-tight">Tools & Controls</h3>
        
        {/* Mode Toggle */}
        <div className="flex bg-[#111] border border-[#333] rounded-lg p-1">
          <button
            onClick={() => onToggleRefining(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors",
              !isRefining ? "bg-white text-black" : "text-gray-400 hover:text-white"
            )}
          >
            <MoveHorizontal className="w-4 h-4" />
            Slider
          </button>
          <button
            onClick={() => onToggleRefining(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-colors",
              isRefining ? "bg-white text-black" : "text-gray-400 hover:text-white"
            )}
          >
            <Paintbrush className="w-4 h-4" />
            Refine Mask
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Brush Controls (Only visible in refine mode) */}
        {isRefining && (
          <div className="p-4 border border-[#333] bg-black mb-6">
            <h4 className="text-sm font-bold mb-4 text-white uppercase tracking-wider">Brush Settings</h4>
            
            <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => onBrushModeChange('remove')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border font-bold transition-colors",
                    brushMode === 'remove' ? "border-red-500 bg-red-500/10 text-red-500" : "border-[#333] hover:border-gray-500 text-gray-400"
                  )}
                >
                  <Eraser className="w-4 h-4" />
                  Remove
                </button>
                <button
                  onClick={() => onBrushModeChange('add')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border font-bold transition-colors",
                    brushMode === 'add' ? "border-green-500 bg-green-500/10 text-green-500" : "border-[#333] hover:border-gray-500 text-gray-400"
                  )}
                >
                  <Paintbrush className="w-4 h-4" />
                  Restore
                </button>
              </div>

              <div className="flex-1 md:ml-8 max-w-xs">
                <label className="flex justify-between text-sm font-bold mb-2">
                  <span>Brush Size</span>
                  <span className="text-gray-400">{brushSize}px</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#222] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Draw directly on the image to refine the mask. Red erases background, green restores foreground.
            </p>
          </div>
        )}

        <div>
          <label className="flex justify-between text-sm font-bold mb-2">
            <span>Alpha Threshold</span>
            <span className="text-gray-400">{threshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#222] rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Adjust edge sensitivity. Higher values remove more semitransparent pixels.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Background Color</label>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onBackgroundColorChange(c.value)}
                className={cn(
                  "w-10 h-10 rounded-full border-2 transition-transform hover:scale-110",
                  backgroundColor === c.value ? "border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "border-[#333]",
                  c.value === 'transparent' ? "checkerboard" : ""
                )}
                style={c.value !== 'transparent' ? { backgroundColor: c.value } : {}}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
