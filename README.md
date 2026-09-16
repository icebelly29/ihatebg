# ihateimg

A client-side background removal tool. It processes images directly in the browser without uploading them to a server.

## Overview

ihateimg uses WebGPU and WebAssembly to run background removal models locally. This ensures user privacy and eliminates server hosting costs for inference.

Features include:
- Local processing via Transformers.js
- Mask refinement brush to manually add/remove regions
- Alpha threshold and background color replacement
- Off-thread inference using Web Workers

## Tech Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Transformers.js (`@huggingface/transformers`)
- Model: `briaai/RMBG-1.4`

## How it works

1. The app downloads the ONNX model on first load and caches it in the browser.
2. Images are passed to a Web Worker as zero-copy `ImageBitmap` objects.
3. The worker runs inference and composites the resulting mask into the image's alpha channel using an `OffscreenCanvas`.
4. The brush refinement tool merges user stroke data directly into the cached mask buffer, allowing instant updates without re-running the model.

## Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The Vite dev server is configured with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers to enable `SharedArrayBuffer` for WebAssembly/WebGPU performance.
