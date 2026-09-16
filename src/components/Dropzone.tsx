import { useCallback, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DropzoneProps {
  onImageSelect: (file: File) => void;
}

export function Dropzone({ onImageSelect }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          onImageSelect(file);
        }
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onImageSelect(files[0]);
      }
    },
    [onImageSelect]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) onImageSelect(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSelect]);

  return (
    <div
      className={cn(
        "relative w-full max-w-4xl mx-auto min-h-[400px] border-4 flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300",
        isDragging 
          ? "border-white bg-[#111] scale-[1.02] shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] border-solid" 
          : "border-dashed border-[#333333] hover:border-white hover:bg-[#0a0a0a] bg-black hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input
        id="file-upload"
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-6 pointer-events-none">
        <div className={cn(
          "p-6 transition-all duration-300 border-2",
          isDragging ? "bg-white text-black border-white" : "bg-transparent text-white border-[#333]"
        )}>
          <Upload className="w-12 h-12" />
        </div>
        <div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter text-white mb-3">
            {isDragging ? 'Drop it like it\'s hot!' : 'Click or Drag Image Here'}
          </p>
          <p className="text-sm md:text-base font-mono text-gray-500">
            Supports PNG, JPEG, WEBP. Or paste from clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}
