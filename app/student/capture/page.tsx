"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSubmissionStore } from "../../../lib/submissionStore";
import { supabase } from "../../../lib/supabase";
import { getDeviceId } from "../../../lib/device";

export default function PlateCapture() {
  const router = useRouter();
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const setImage = useSubmissionStore((state) => state.setImage);
  const ecosystemId = useSubmissionStore((state) => state.ecosystemId);
  const sessionId = useSubmissionStore((state) => state.session);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (err) {
        console.error("Camera access denied or failed", err);
        setCameraError(true);
      }
    }
    startCamera();

    return () => {
      // Clean up camera stream to prevent memory leaks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    setCapturing(true);
    setUploadError(false);

    if (!ecosystemId || !sessionId) {
      setUploadError(true);
      setCapturing(false);
      return;
    }

    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const deviceId = getDeviceId();
        const fileName = `${ecosystemId}/${sessionId}/${deviceId}/${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from("plates")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from("plates")
            .getPublicUrl(fileName);
          setImage(publicUrl);
          
          // Clean up camera before navigation
          if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          
          router.push("/student/processing");
        } else {
          console.error("Upload failed", error);
          setUploadError(true);
        }
      }, "image/jpeg", 0.8);
    } else {
      router.push("/student/processing");
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6 pb-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              // Clean up camera before navigation
              if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
              }
              router.push("/student/welcome");
            }}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-white shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-white text-base font-semibold tracking-wide">FoodTrace</div>
          <div className="w-10"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mt-8"
        >
          <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-md">
            Take photo before leaving
          </h1>
          <p className="text-sm text-white/80 font-medium drop-shadow-sm">
            Position your plate within the circle
          </p>
        </motion.div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {/* Live Camera Feed */}
        <div className="absolute inset-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          ></video>

          {/* Camera Grid Overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-white/10"></div>
            ))}
          </div>
          
          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/90 z-40 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-sm w-full"
              >
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Camera Access Denied</h3>
                <p className="text-sm text-red-200 mb-6">
                  Please allow camera permissions in your browser settings to scan your plate.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 rounded-2xl font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  Confirm Settings & Retry
                </button>
              </motion.div>
            </div>
          )}

          {/* Upload Error State */}
          {uploadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/90 z-40 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-sm w-full"
              >
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Failed</h3>
                <p className="text-sm text-red-200 mb-6">
                  Failed to upload your plate photo. Please check your connection and try again.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setUploadError(false);
                      setCapturing(false);
                    }}
                    className="w-full py-4 rounded-2xl font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      // Clean up camera before navigation
                      if (videoRef.current?.srcObject) {
                        const stream = videoRef.current.srcObject as MediaStream;
                        stream.getTracks().forEach(track => track.stop());
                      }
                      router.push("/student/welcome");
                    }}
                    className="w-full py-4 rounded-2xl font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Focus Circle */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-[3px] border-primary pointer-events-none"
          style={{
            boxShadow: capturing
              ? "0 0 0 9999px rgba(0, 0, 0, 0.9)"
              : "0 0 0 9999px rgba(0, 0, 0, 0.45)",
            transition: "box-shadow 0.3s ease-in-out",
          }}
        >
          {/* Corner Markers */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl opacity-80"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl opacity-80"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl opacity-80"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl opacity-80"></div>
        </motion.div>

        {/* Flash Effect */}
        {capturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white z-30"
          ></motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 pb-12">
        <div className="flex items-center justify-center gap-12">
          {/* Placeholder Left */}
          <div className="w-14 h-14"></div>

          {/* Capture Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCapture}
            disabled={capturing}
            className="relative focus:outline-none"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white bg-black/20 backdrop-blur-sm flex items-center justify-center shadow-lg transition-colors hover:bg-black/30">
              <motion.div
                animate={
                  capturing
                    ? { scale: 0, opacity: 0 }
                    : { scale: [1, 1.05, 1], opacity: 1 }
                }
                transition={
                  capturing
                    ? { duration: 0.2 }
                    : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-inner"
              >
                {!capturing && <Camera className="w-7 h-7 text-black/80" />}
              </motion.div>
            </div>
          </motion.button>

          {/* Placeholder Right */}
          <div className="w-14 h-14"></div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-4"
        >
          <p className="text-xs text-white/60">
            Tap the button to capture your plate
          </p>
        </motion.div>
      </div>
    </div>
  );
}
