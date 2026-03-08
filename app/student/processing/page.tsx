"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, Brain } from "lucide-react";
import { useSubmissionStore } from "../../../lib/submissionStore";
import { supabase } from "../../../lib/supabase";

export default function AIProcessing() {
  const router = useRouter();
  const setDishes = useSubmissionStore((state) => state.setDishes);
  const image = useSubmissionStore((state) => state.image);
  const sessionId = useSubmissionStore((state) => state.session);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const analyze = async () => {
      try {
        if (!image) {
          console.error("No image found in store");
          router.push("/student/capture");
          return;
        }

        if (!sessionId) {
          setAnalysisError("Session is missing. Please scan the QR again.");
          return;
        }

        const { data: menuItems, error: menuError } = await supabase
          .from("menu_items")
          .select("dish_name, food_type")
          .eq("session_id", sessionId);

        if (menuError) {
          setAnalysisError("Unable to load menu for this session.");
          return;
        }

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: image,
            menu_items: (menuItems || []).map((item) => item.dish_name),
          }),
        });

        if (res.ok) {
          const data = await res.json();

          // Keep feedback flow active even when AI detects no leftovers.
          // If AI returns empty, fall back to session menu with 0% waste cards.
          const aiDishes = Array.isArray(data?.dishes) ? data.dishes : [];
          if (aiDishes.length > 0) {
            setDishes(aiDishes);
          } else {
            const menuFallback = (menuItems || []).map((item: any) => ({
              name: item.dish_name,
              wastePercent: 0,
              foodType: item.food_type || null,
            }));
            setDishes(menuFallback);
          }
          router.push("/student/result");
        } else {
          const errData = await res.json();
          console.error("Failed to analyze image with Gemini:", errData);
          setAnalysisError(errData.error || "Failed to analyze image. Please try again.");
        }
      } catch (err) {
        console.error("Analysis network failed", err);
        setAnalysisError("Network error: Could not reach AI services.");
      }
    };
    
    analyze();
  }, [router, setDishes, image, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"
        ></motion.div>
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute bottom-20 right-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl"
        ></motion.div>
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        {/* AI Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="mb-12 relative"
        >
          {/* Outer Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          ></motion.div>

          {/* Inner Circle */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 relative z-10"
          >
            <Brain className="w-10 h-10 text-white" />
          </motion.div>

          {/* Sparkles */}
          <motion.div
            animate={{
              y: [-5, 5, -5],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-4 -right-4 z-20"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <motion.div
            animate={{
              y: [5, -5, 5],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute -bottom-4 -left-4 z-20"
          >
            <Sparkles className="w-6 h-6 text-warning" />
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold mb-2 text-foreground">Analyzing plate using AI...</h1>
          <p className="text-muted-foreground mb-10">This will take just a moment</p>

          {/* Progress Indicators */}
          <div className="space-y-4 max-w-[200px] mx-auto text-left">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-primary"
              ></motion.div>
              <span className="text-sm font-medium text-foreground">Detecting food items</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                className="w-2.5 h-2.5 rounded-full bg-primary"
              ></motion.div>
              <span className="text-sm font-medium text-foreground">Calculating waste percentage</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="flex items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                className="w-2.5 h-2.5 rounded-full bg-primary"
              ></motion.div>
              <span className="text-sm font-medium text-foreground">Preparing results</span>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Error State Overlay */}
        {analysisError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/95 backdrop-blur-md z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-red-100 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 opacity-50" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">Analysis Failed</h2>
              <p className="text-sm text-muted-foreground mb-8">
                {analysisError}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/student/capture")}
                  className="w-full py-4 rounded-2xl font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  Retake Photo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
