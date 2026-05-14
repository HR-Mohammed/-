import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, RefreshCw, Scan, Loader2 } from 'lucide-react';

interface ScannerModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bestContour, setBestContour] = useState<number[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Dynamic Loader for OpenCV
    const scriptId = 'opencv-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const onScriptLoad = () => {
      const cv = (window as any).cv;
      if (cv && cv.Mat) {
        setIsOpenCVReady(true);
      } else if (cv) {
        cv.onRuntimeInitialized = () => {
          setIsOpenCVReady(true);
        };
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://docs.opencv.org/4.5.4/opencv.js'; // Using 4.5.4
      script.async = true;
      script.crossOrigin = 'anonymous'; // Critical for getting error details instead of generic "Script error"
      
      script.onload = onScriptLoad;
      script.onerror = () => {
        console.error("Failed to load OpenCV script");
        setError("تعذر تحميل محرك المسح الضوئي. يرجى التحقق من الاتصال بالإنترنت.");
      };
      
      document.body.appendChild(script);
    } else {
      // Script already exists, check if CV is ready
      if ((window as any).cv && (window as any).cv.Mat) {
        setIsOpenCVReady(true);
      } else {
        script.onload = onScriptLoad;
      }
    }

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isCameraReady && isOpenCVReady && !capturedImage) {
      processFrame();
    }
  }, [isCameraReady, isOpenCVReady, capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraReady(true);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن.");
    }
  };

  const processFrame = () => {
    // Real-time detection disabled as per request to detect after capture
  };

  // Function to find document contour in an image
  const findDocumentContour = (src: any) => {
    try {
      const cv = (window as any).cv;
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      
      const thresholded = new cv.Mat();
      cv.adaptiveThreshold(blurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let bestPoints: number[] | null = null;

      for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        // Minimum area 10% of image
        if (area > (src.rows * src.cols) * 0.1) {
          const perimeter = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

          if (approx.rows === 4 && area > maxArea) {
            maxArea = area;
            bestPoints = [];
            for (let j = 0; j < 4; j++) {
              bestPoints.push(approx.data32S[j * 2], approx.data32S[j * 2 + 1]);
            }
          }
          approx.delete();
        }
      }

      gray.delete(); blurred.delete(); thresholded.delete(); 
      contours.delete(); hierarchy.delete();
      
      return bestPoints;
    } catch (e) {
      console.error("OpenCV processing error:", e);
      return null;
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      setIsProcessing(true);
      
      setTimeout(() => {
        try {
          const video = videoRef.current!;
          const canvas = canvasRef.current!;
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          
          const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          
          if (isOpenCVReady) {
            const img = new Image();
            img.onload = () => {
              try {
                const cv = (window as any).cv;
                const src = cv.imread(img);
                const detectedPoints = findDocumentContour(src);
                
                if (detectedPoints) {
                  const pts = [];
                  for (let i = 0; i < 4; i++) pts.push({ x: detectedPoints[i*2], y: detectedPoints[i*2+1] });
                  
                  pts.sort((a, b) => a.y - b.y);
                  const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
                  const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
                  
                  const sortedPoints = [top[0].x, top[0].y, top[1].x, top[1].y, bottom[1].x, bottom[1].y, bottom[0].x, bottom[0].y];
                  
                  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, sortedPoints);
                  
                  const width = Math.max(
                    Math.hypot(top[1].x - top[0].x, top[1].y - top[0].y),
                    Math.hypot(bottom[1].x - bottom[0].x, bottom[1].y - bottom[0].y)
                  );
                  const height = Math.max(
                    Math.hypot(bottom[0].x - top[0].x, bottom[0].y - top[0].y),
                    Math.hypot(bottom[1].x - top[1].x, bottom[1].y - top[1].y)
                  );

                  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
                  const M = cv.getPerspectiveTransform(srcTri, dstTri);
                  const dst = new cv.Mat();
                  const dsize = new cv.Size(width, height);
                  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

                  cv.imshow(canvas, dst);
                  setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
                  
                  srcTri.delete(); dstTri.delete(); M.delete(); dst.delete();
                } else {
                  setCapturedImage(rawDataUrl);
                }
                src.delete();
              } catch (err) {
                console.error("OpenCV Processing error:", err);
                setCapturedImage(rawDataUrl);
              } finally {
                setIsProcessing(false);
              }
            };
            img.src = rawDataUrl;
          } else {
            setCapturedImage(rawDataUrl);
            setIsProcessing(false);
          }
        } catch (err) {
          console.error("Capture error:", err);
          setIsProcessing(false);
        }
      }, 300);
    }
  };

  const handleDone = () => {
    if (capturedImage) {
      // Manual conversion from Data URL to Blob to avoid using global fetch
      try {
        const parts = capturedImage.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      } catch (e) {
        console.error("Error converting image:", e);
        // Fallback or alert user
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setBestContour(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl p-4 transition-colors">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white transition-colors">الماسح الضوئي الذكي (Auto-Detect)</h3>
          </div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 transition-colors">
               {(isProcessing || !isOpenCVReady) && <Loader2 className="w-4 h-4 animate-spin" />}
               <span className="text-[10px] font-black">
                 {!isOpenCVReady ? 'جاري تهيئة المعالج...' : isProcessing ? 'جاري اكتشاف الحدود ومعالجة الصورة...' : 'المعالج جاهز'}
               </span>
            </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 relative bg-slate-950 overflow-hidden min-h-[300px]">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {isCameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Smart Boundary Overlay */}
                  {bestContour && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${videoRef.current?.videoWidth || 100} ${videoRef.current?.videoHeight || 100}`}>
                      <polygon 
                        points={`${bestContour[0]},${bestContour[1]} ${bestContour[2]},${bestContour[3]} ${bestContour[4]},${bestContour[5]} ${bestContour[6]},${bestContour[7]}`}
                        className="fill-indigo-500/20 stroke-indigo-400 dark:stroke-indigo-500 stroke-[5]"
                      />
                    </svg>
                  )}
                  
                  {/* Finder UI */}
                  <div className="absolute inset-8 border-2 border-indigo-500/20 dark:border-indigo-500/10 rounded-2xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                    
                    {!bestContour && (
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10"
                      />
                    )}
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <p className="text-[10px] font-black text-white whitespace-nowrap">
                      قم بمحاذاة الكتاب داخل الإطار ثم اضغط تصوير
                    </p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-10 text-center">
                  <p className="text-white font-bold">{error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full p-4 flex items-center justify-center">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white dark:border-slate-800"
              />
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 flex items-center justify-center gap-6 transition-colors">
          {!capturedImage ? (
            <button 
              onClick={capture}
              disabled={!isCameraReady || isProcessing}
              className="w-20 h-20 rounded-full border-8 border-indigo-50 dark:border-indigo-900 bg-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center group active:scale-90 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white transition-all group-hover:scale-125" />
              )}
            </button>
          ) : (
            <>
              <button 
                onClick={retake}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
              <button 
                onClick={handleDone}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                حفظ النسخة الممسوحة
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
