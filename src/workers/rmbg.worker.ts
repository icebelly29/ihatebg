import { AutoModel, AutoProcessor, env, RawImage } from '@huggingface/transformers';

// Skip local model check since we are running in browser
env.allowLocalModels = false;
env.backends.onnx.wasm.proxy = false; // Disable proxy to use worker directly

class RMBGModel {
  static model: any = null;
  static processor: any = null;

  static async getInstance(onProgress: (info: any) => void) {
    if (!this.model) {
      this.model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
        progress_callback: onProgress,
        config: {
          model_type: 'custom'
        },
        device: 'wasm' // Using wasm explicitly for broad compatibility
      });
      this.processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
        progress_callback: onProgress,
      });
    }
    return { model: this.model, processor: this.processor };
  }
}

let cachedImageData: ImageData | null = null;
let cachedMaskData: Uint8Array | null = null;
let cachedWidth: number = 0;
let cachedHeight: number = 0;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      await RMBGModel.getInstance((progress) => {
        self.postMessage({ type: 'PROGRESS', payload: progress });
      });
      self.postMessage({ type: 'READY' });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', payload: error.message });
    }
  }

  if (type === 'PROCESS') {
    try {
      const { imageBitmap, width, height } = payload;
      
      self.postMessage({ type: 'PROCESSING_START' });

      // Convert ImageBitmap to OffscreenCanvas to extract raw pixels
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);

      const rawImage = new RawImage(imageData.data, width, height, 4);

      const { model, processor } = await RMBGModel.getInstance(() => {});

      // Preprocess image
      const { pixel_values } = await processor(rawImage);

      // Predict mask
      const { output } = await model({ input: pixel_values });
      
      // Resize mask
      const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(width, height);
      
      cachedImageData = imageData;
      cachedMaskData = mask.data;
      cachedWidth = width;
      cachedHeight = height;
      
      // Apply default alpha compositing
      const finalCanvas = new OffscreenCanvas(width, height);
      const finalCtx = finalCanvas.getContext('2d')!;
      
      // Make a copy to avoid mutating the original
      const resultImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
      );
      
      for (let i = 0; i < mask.data.length; i++) {
        resultImageData.data[i * 4 + 3] = mask.data[i];
      }
      
      finalCtx.putImageData(resultImageData, 0, 0);
      const blob = await finalCanvas.convertToBlob({ type: 'image/png' });
      
      self.postMessage({ type: 'COMPLETED', payload: blob });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', payload: error.message });
    }
  }
  
  if (type === 'POST_PROCESS') {
    try {
      if (!cachedImageData || !cachedMaskData) return;
      
      const { threshold = 0.5, backgroundColor = 'transparent', bgBlur = false } = payload;
      
      const width = cachedWidth;
      const height = cachedHeight;
      const finalCanvas = new OffscreenCanvas(width, height);
      const finalCtx = finalCanvas.getContext('2d')!;
      
      // If we have a background color or blur
      if (backgroundColor !== 'transparent') {
        finalCtx.fillStyle = backgroundColor;
        finalCtx.fillRect(0, 0, width, height);
      }
      
      // We will do a manual composite in the ImageData
      const resultImageData = new ImageData(
        new Uint8ClampedArray(cachedImageData.data),
        width,
        height
      );
      
      const thresholdVal = threshold * 255;
      
      for (let i = 0; i < cachedMaskData.length; i++) {
        let alpha = cachedMaskData[i];
        
        // Apply thresholding: if alpha < threshold, make it 0.
        // We can do a smoothstep or sharp cutoff. Let's do a sharp cutoff for simplicity, or scale it.
        if (alpha < thresholdVal) {
          alpha = 0;
        } else if (thresholdVal > 0) {
          // Normalize the remaining alpha range
          alpha = Math.min(255, ((alpha - thresholdVal) / (255 - thresholdVal)) * 255);
        }
        
        resultImageData.data[i * 4 + 3] = alpha;
      }
      
      // If there's a background, we draw the background first, then put the image over it
      // Wait, putImageData ignores globalCompositeOperation and overwrites pixels.
      // So if backgroundColor is set, we need to draw it using context, then draw the image data over it using an intermediate canvas.
      
      const tempCanvas = new OffscreenCanvas(width, height);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(resultImageData, 0, 0);
      
      if (backgroundColor !== 'transparent') {
        finalCtx.drawImage(tempCanvas, 0, 0);
      } else {
        finalCtx.putImageData(resultImageData, 0, 0);
      }
      
      const blob = await finalCanvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ type: 'COMPLETED', payload: blob });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', payload: error.message });
    }
  }
  if (type === 'UPDATE_MASK_MODIFIER') {
    try {
      if (!cachedMaskData) return;
      
      const { modifierImageData } = payload;
      // modifierImageData is an ImageData object representing the drawn paths
      // Green (0,255,0,255) = Add
      // Red (255,0,0,255) = Remove
      
      const modData = modifierImageData.data;
      
      // Update cachedMaskData directly based on the drawn strokes
      for (let i = 0; i < modData.length; i += 4) {
        const r = modData[i];
        const g = modData[i + 1];
        const a = modData[i + 3];
        
        if (a > 0) {
          const pixelIndex = i / 4;
          if (g > r) {
            // Add mode (green)
            cachedMaskData[pixelIndex] = 255;
          } else if (r > g) {
            // Remove mode (red)
            cachedMaskData[pixelIndex] = 0;
          }
        }
      }
      
      // Trigger post process immediately to reflect changes
      self.postMessage({ type: 'MODIFIER_APPLIED' });
    } catch (error: any) {
      self.postMessage({ type: 'ERROR', payload: error.message });
    }
  }
};
