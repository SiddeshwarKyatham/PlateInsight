"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TrendingDown, Home } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSubmissionStore } from "../../../lib/submissionStore";
import { supabase } from "../../../lib/supabase";
import { getDeviceId } from "../../../lib/device";
import { startOfDay, endOfDay } from 'date-fns';

export default function Success() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const targetCount = 23;
  const storeState = useSubmissionStore();
  const hasSaved = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [realMetrics, setRealMetrics] = useState({
    todaysParticipants: 0,
    todaysSavings: 0
  });

  useEffect(() => {
    const saveSubmission = async () => {
      if (hasSaved.current) return;
      hasSaved.current = true;

      try {
        if (storeState.isDemo) {
          setRealMetrics({
            todaysParticipants: 128,
            todaysSavings: 640
          });
          return;
        }

        const deviceId = getDeviceId();
        if (!storeState.ecosystemId || !storeState.session) {
          setSaveError("Session expired. Please scan the QR and submit again.");
          return;
        }

        // 1. Insert Submission
        const { data: submission, error: subErr } = await supabase
          .from("submissions")
          .insert({
            ecosystem_id: storeState.ecosystemId,
            device_id: deviceId,
            session_id: storeState.session,
            meal_type: storeState.mealType || "unknown",
            image_url: storeState.image, // Mock image URL or real uploaded URL
          })
          .select("id")
          .single();

        if (subErr || !submission) throw subErr;

        // 2. Insert Feedback (if any dish-level feedback exists)
        const feedbackRows = storeState.feedback.map(fb => {
          const dishData = storeState.dishes.find(d => d.name === fb.dishName);
          return {
            ecosystem_id: storeState.ecosystemId,
            submission_id: submission.id,
            dish_name: fb.dishName,
            food_type: dishData?.foodType || null,
            waste_percent: dishData?.wastePercent || 0,
            sentiment: fb.sentiment,
            reason: fb.reason
          };
        });

        if (feedbackRows.length > 0) {
          const { error: fbErr } = await supabase
            .from("dish_feedback")
            .insert(feedbackRows);
          
          if (fbErr) throw fbErr;
        }

        console.log("Successfully saved submission");
        // Bug #4 FIXED: Only record submission time AFTER a successful DB save.
        // This ensures a failed AI/upload attempt doesn't lock out the student.
        const storedDeviceId = getDeviceId();
        localStorage.setItem(`last_sub_${storedDeviceId}`, new Date().toISOString());

        // Calculate real metrics for today
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        // Get today's participants count
        const { count: participantsCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('ecosystem_id', storeState.ecosystemId)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString());

        // Calculate today's savings (waste reduction × food cost per kg)
        const { data: todayFeedback } = await supabase
          .from('dish_feedback')
          .select('waste_percent')
          .eq('ecosystem_id', storeState.ecosystemId)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString());

        let totalWasteReduction = 0;
        if (todayFeedback) {
          totalWasteReduction = todayFeedback.reduce((sum, fb) => sum + fb.waste_percent, 0);
        }
        const foodCostPerKg = 20; // ₹20 per kg
        const savingsToday = Math.round((totalWasteReduction / 100) * foodCostPerKg);

        setRealMetrics({
          todaysParticipants: participantsCount || 0,
          todaysSavings: savingsToday
        });
      } catch (err: any) {
        const message = String(err?.message || "").toLowerCase();
        const isDuplicate =
          err?.code === "23505" ||
          message.includes("duplicate");
        const isRlsBlocked =
          err?.code === "42501" ||
          message.includes("row-level security policy");

        if (isDuplicate) {
          setSaveError("This device already submitted for the current session.");
        } else if (isRlsBlocked) {
          setSaveError("Session is closed or invalid. Please rescan the latest QR from staff.");
        } else {
          setSaveError(err?.message || "Failed to save your submission. Please retry.");
        }
        // Use warn instead of error to avoid noisy Next.js dev overlay for handled states.
        console.warn("Submission save handled:", err);
      }
    };

    saveSubmission();

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev < targetCount) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-3xl"
        ></motion.div>
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 3.5, repeat: Infinity }}
          className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-500 rounded-full blur-3xl"
        ></motion.div>
      </div>

      <div className="relative z-10 text-center max-w-md">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="mb-6"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <CheckCircle2 className="w-32 h-32 text-primary mx-auto" />
          </motion.div>
        </motion.div>

        {/* Confetti Effect */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 0, opacity: 1, scale: 0 }}
            animate={{
              y: [-20, -100, -150],
              opacity: [1, 1, 0],
              scale: [0, 1, 0.5],
              x: Math.sin(i) * 100,
            }}
            transition={{
              duration: 2,
              delay: 0.3 + i * 0.1,
              ease: "easeOut",
            }}
            className="absolute"
            style={{
              left: "50%",
              top: "30%",
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: i % 3 === 0 ? "#10B981" : i % 3 === 1 ? "#F59E0B" : "#3B82F6",
              }}
            ></div>
          </motion.div>
        ))}

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-4xl font-black mb-4 text-foreground tracking-tight">
            Thanks! You helped
            <br />
            reduce waste.
          </h1>

          <p className="text-muted-foreground mb-10 font-medium text-lg">
            Your feedback helps improve food quality and reduce waste in our mess
          </p>
          {saveError && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl py-3 px-4 mb-8">
              {saveError}
            </p>
          )}
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="bg-card rounded-[2rem] shadow-xl border border-border p-8 mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-primary/10 p-2 rounded-xl">
              <TrendingDown className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Campus Impact Today</h2>
          </div>

          <div className="flex items-baseline justify-center gap-2 mb-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-7xl font-black text-primary tracking-tighter"
            >
              {count}%
            </motion.div>
          </div>

          <p className="text-sm font-medium text-muted-foreground mb-8 uppercase tracking-widest">
            Reduction in food waste today
          </p>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            <div>
              <div className="text-3xl font-black text-foreground mb-1">{realMetrics.todaysParticipants}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students participated</div>
            </div>
            <div>
              <div className="text-3xl font-black text-foreground mb-1">₹{realMetrics.todaysSavings}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved today</div>
            </div>
          </div>
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-7xl mb-8"
        >
          🌱
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <button
            onClick={() => {
              storeState.reset();
              router.push(storeState.isDemo ? "/student/welcome?demo=1" : "/student/welcome");
            }}
            className="w-full px-8 py-4 bg-primary text-white rounded-[1.25rem] font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Submit Another Plate
          </button>

          <button
            onClick={() => {
              storeState.reset();
              router.push("/");
            }}
            className="w-full px-8 py-4 bg-card border-2 border-gray-100 text-foreground rounded-[1.25rem] font-bold text-lg hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-3"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
        </motion.div>

        {/* Footer Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-muted-foreground mt-6"
        >
          Together, we're building a sustainable future 🌍
        </motion.p>
      </div>
    </div>
  );
}
