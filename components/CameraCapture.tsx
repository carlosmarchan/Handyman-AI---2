
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageFile } from '../types';
import { CameraIcon } from './icons/CameraIcon';

interface CameraCaptureProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ images, onImagesChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
          setError(null);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure permissions are granted and you are on a secure (HTTPS) connection.");
        setIsCameraOn(false);
      }
    } else {
      setError("Camera not supported on this device or browser.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  }, []);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [stopCamera]);


  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const newImage: ImageFile = {
          id: `img_${new Date().getTime()}`,
          src: dataUrl,
          mimeType: 'image/jpeg',
          selected: true,
        };
        onImagesChange([...images, newImage]);
      }
    }
  }, [images, onImagesChange]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="relative w-full aspect-video bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`} />
        {!isCameraOn && (
            <div className="text-center p-4">
                <button onClick={startCamera} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Start Camera
                </button>
                {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {isCameraOn && (
        <div className="flex justify-center mt-4 gap-4">
          <button
            onClick={capturePhoto}
            aria-label="Capture photo"
            className="w-16 h-16 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CameraIcon />
          </button>
           <button onClick={stopCamera} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              Stop Camera
            </button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
