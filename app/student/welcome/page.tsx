"use client";

import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode, Sparkles, AlertCircle, Camera } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { getDeviceId } from "../../../lib/device";
import { canSubmit } from "../../../lib/mealWindow";
import { useSubmissionStore } from "../../../lib/submissionStore";

function QRScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setMealType = useSubmissionStore((state) => state.setMealType);
  const setEcosystemId = useSubmissionStore((state) => state.setEcosystemId);
  const setSession = useSubmissionStore((state) => state.setSession);
  const setImage = useSubmissionStore((state) => state.setImage);
  const setDishes = useSubmissionStore((state) => state.setDishes);
  const setDemo = useSubmissionStore((state) => state.setDemo);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ecoParam = searchParams.get("eco");
  const sessionParam = searchParams.get("session");
  const mealParam = searchParams.get("meal");
  const isDemoMode = searchParams.get("demo") === "1";

  useEffect(() => {
    if (isDemoMode) {
      setErrorMsg(null);
      return;
    }

    if (!ecoParam || !sessionParam) {
      setErrorMsg("Invalid QR code. Please scan a valid session QR from mess staff.");
      return;
    }

    // Check if device can submit on mount
    const deviceId = getDeviceId();
    const lastSubTime = localStorage.getItem(`last_sub_${deviceId}`);
    
    if (!canSubmit(lastSubTime)) {
      setErrorMsg("You have already submitted a plate for this meal window.");
    }
  }, [ecoParam, sessionParam, isDemoMode]);

  const handleScan = () => {
    if (errorMsg) return;

    setScanning(true);
    // Bug #4 FIXED: Do NOT record last_sub here. It is now written only after
    // a successful DB save in /student/success to avoid locking out students on failure.

    if (isDemoMode) {
      setDemo(true);
      setEcosystemId("demo-ecosystem");
      setSession("demo-session");
      setMealType("lunch");
      setImage("demo-image");
      setDishes([
        { name: "Rice", wastePercent: 32, foodType: "veg" },
        { name: "Dal", wastePercent: 12, foodType: "veg" },
        { name: "Chicken Curry", wastePercent: 44, foodType: "nonveg" },
      ]);

      setTimeout(() => {
        router.replace("/student/result");
      }, 700);
      return;
    }

    // Extract the exact ecosystem and meal session logic from the QR code
    setDemo(false);
    if (ecoParam) setEcosystemId(ecoParam);
    if (sessionParam) setSession(sessionParam);
    if (mealParam) setMealType(mealParam);

    setTimeout(() => {
      router.replace("/student/capture");
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">PlateInsight</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome to Mess</h1>
          <p className="text-muted-foreground">Help us reduce food waste</p>
        </motion.div>

        {/* Error State or Scanner */}
        {errorMsg ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl shadow-2xl p-8 mb-8 text-center"
          >
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Already Logged</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              {errorMsg}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl shadow-2xl p-8 mb-8"
          >
            <div className="relative mb-8">
              {isDemoMode ? (
                <motion.div
                  animate={scanning ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className={`w-64 h-64 mx-auto bg-gradient-to-br ${
                    scanning ? "from-primary to-primary/60" : "from-gray-100 to-gray-200"
                  } rounded-3xl flex items-center justify-center relative overflow-hidden`}
                >
                  {scanning ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-white"
                    >
                      <Sparkles className="w-16 h-16" />
                    </motion.div>
                  ) : (
                    <QrCode className="w-32 h-32 text-gray-400" />
                  )}

                  {scanning && (
                    <motion.div
                      initial={{ top: 0 }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute left-0 right-0 h-1 bg-white/50"
                    ></motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0.7 }}
                  animate={scanning ? { scale: [1, 1.02, 1], opacity: [0.85, 1, 0.9] } : { opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  className={`w-64 h-64 mx-auto rounded-3xl flex flex-col items-center justify-center gap-3 border ${
                    scanning
                      ? "bg-primary text-white border-primary"
                      : "bg-primary/5 text-primary border-primary/20"
                  }`}
                >
                  {scanning ? <Sparkles className="w-14 h-14" /> : <Camera className="w-14 h-14" />}
                  <p className="text-sm font-semibold">{scanning ? "Preparing camera..." : "Ready to capture plate"}</p>
                </motion.div>
              )}
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">
                {scanning ? "Starting..." : isDemoMode ? "Guest Demo" : "Start Submission"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {scanning 
                  ? "Setting up your session" 
                  : isDemoMode
                    ? "Start a guest walkthrough with sample plate data"
                    : "QR is already verified. Continue to capture your plate."}
              </p>
            </div>

            {/* Scan Button */}
            <motion.button
              whileHover={{ scale: scanning ? 1 : 1.02 }}
              whileTap={{ scale: scanning ? 1 : 0.98 }}
              onClick={handleScan}
              disabled={scanning}
              className={`w-full py-4 rounded-2xl font-semibold shadow-lg transition-all ${
                scanning
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:shadow-xl"
              }`}
            >
              {scanning ? "Processing..." : isDemoMode ? "Start Demo" : "Continue to Camera"}
            </motion.button>
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground space-y-2"
        >
          <p>✨ No login required</p>
          <p>⏱️ Takes less than 20 seconds</p>
        </motion.div>
      </div>
    </div>
  );
}

export default function QRScan() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex flex-col items-center justify-center"><Sparkles className="w-8 h-8 text-primary animate-spin" /></div>}>
      <QRScanContent />
    </Suspense>
  );
}
