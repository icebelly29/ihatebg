
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | null;
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#333333] shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#333333]">
          <h2 className="text-xl font-bold">
            {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-[#222] transition-colors rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto font-mono text-sm text-gray-300 space-y-4">
          {type === 'privacy' ? (
            <>
              <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
              <h3 className="font-bold text-white mt-4 text-base">1. Data Processing</h3>
              <p>This application operates entirely within your web browser. When you select an image for background removal, the image is processed locally on your device using WebGPU and WebAssembly technologies. <strong>Your images are never uploaded, transmitted, or stored on any external servers.</strong></p>
              
              <h3 className="font-bold text-white mt-4 text-base">2. Data Collection</h3>
              <p>We do not collect, store, or share any personal information, images, or telemetry data. There are no tracking cookies, analytics, or third-party tracking scripts installed on this application.</p>
              
              <h3 className="font-bold text-white mt-4 text-base">3. Local Storage</h3>
              <p>The AI model (RMBG-1.4) required for background removal is downloaded directly from a content delivery network (CDN) to your browser's local cache. This is a one-time download to allow the app to function offline or without repeated network requests.</p>

              <h3 className="font-bold text-white mt-4 text-base">4. Third-Party Services</h3>
              <p>The site is hosted on standard static hosting platforms. These platforms may collect standard connection logs (such as IP addresses) as part of their basic infrastructure operations, which are outside of our direct control.</p>
            </>
          ) : (
            <>
              <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
              <h3 className="font-bold text-white mt-4 text-base">1. Acceptance of Terms</h3>
              <p>By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement.</p>
              
              <h3 className="font-bold text-white mt-4 text-base">2. Use License</h3>
              <p>This tool is provided completely free of charge. You may use this tool to remove backgrounds from images for personal or commercial purposes, subject to the licensing terms of the underlying AI model (RMBG-1.4).</p>
              
              <h3 className="font-bold text-white mt-4 text-base">3. AI Model Licensing</h3>
              <p>This application utilizes the RMBG-1.4 model by Bria AI. Users must ensure their use of the output complies with the specific licensing terms set by Bria AI for the RMBG-1.4 model. We do not claim ownership over the model weights or architecture.</p>
              
              <h3 className="font-bold text-white mt-4 text-base">4. Disclaimer of Warranties</h3>
              <p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
              
              <h3 className="font-bold text-white mt-4 text-base">5. Limitations</h3>
              <p>Since all processing is performed locally on your hardware, the performance, quality, and capability of the application are strictly dependent on your device's GPU and browser capabilities. We are not responsible for browser crashes, lost work, or system instability.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
