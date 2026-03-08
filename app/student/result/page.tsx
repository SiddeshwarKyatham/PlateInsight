"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, X, Sparkles } from "lucide-react";
import { useSubmissionStore } from "../../../lib/submissionStore";

const emojiMap: Record<string, string> = {
  "Rice": "🍚",
  "Dal": "🍲",
  "Sabzi": "🥘",
};

const reasons = [
  "Too spicy",
  "Too salty", 
  "Cold",
  "Bad taste",
  "Too much portion",
  "Other",
];

const sentimentModifiers: Record<string, number> = {
  "Too spicy": -30,
  "Too salty": -25,
  "Cold": -20,
  "Bad taste": -40,
  "Too much portion": -10,
  "Other": -15,
};

export default function SwipeFeedback() {
  const router = useRouter();
  const storeDishes = useSubmissionStore(state => state.dishes);
  const addFeedback = useSubmissionStore(state => state.addFeedback);
  
  const displayDishes = storeDishes;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const currentDish = displayDishes[currentIndex];

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left") {
      setShowReasonModal(true);
    } else {
      addFeedback({ dishName: currentDish.name, sentiment: "positive" });
      moveToNext();
    }
  };

  const moveToNext = () => {
    if (currentIndex < displayDishes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowReasonModal(false);
      setSelectedReason(null);
    } else {
      router.push("/student/success");
    }
  };

  const handleSubmitReason = () => {
    addFeedback({ dishName: currentDish.name, sentiment: "negative", reason: selectedReason || undefined });
    moveToNext();
  };

  const progress = displayDishes.length > 0 ? ((currentIndex + 1) / displayDishes.length) * 100 : 100;

  if (displayDishes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           transition={{ type: "spring", bounce: 0.6 }}
           className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-primary/20"
        >
          <Sparkles className="w-16 h-16 text-primary drop-shadow-md" />
        </motion.div>
        <h1 className="text-3xl font-bold text-foreground mb-4">Awesome Job!</h1>
        <p className="text-muted-foreground mb-12 max-w-sm text-lg">
          You finished your entire plate! That's <span className="text-primary font-bold">0% food waste</span>. 
          Thank you for protecting our environment.
        </p>
        <button
          onClick={() => router.push("/student/success")}
          className="w-full max-w-sm py-4 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          Confirm & Submit
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50 flex flex-col p-6 relative overflow-hidden">
      {/* Header */}
      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/student/capture")}
            className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-muted-foreground mr-2">
            {currentIndex + 1} of {displayDishes.length} dishes
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
            className="h-full bg-primary"
          ></motion.div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center relative my-4">
        <div className="relative w-full max-w-sm h-[520px]">
          {/* Background Cards (Depth Effect) */}
          {currentIndex < displayDishes.length - 2 && (
            <motion.div
              initial={false}
              animate={{ scale: 0.85, opacity: 0.3 }}
              className="absolute inset-0 bg-card rounded-[2rem] shadow-sm pointer-events-none"
              style={{ top: "30px", left: "20px", right: "20px", bottom: "-30px" }}
            ></motion.div>
          )}
          {currentIndex < displayDishes.length - 1 && (
            <motion.div
              initial={false}
              animate={{ scale: 0.92, opacity: 0.6 }}
              className="absolute inset-0 bg-card rounded-[2rem] shadow-md pointer-events-none"
              style={{ top: "15px", left: "10px", right: "10px", bottom: "-15px" }}
            ></motion.div>
          )}

          {/* Current Card */}
          <SwipeCard
            dish={currentDish}
            onSwipe={handleSwipe}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-auto mb-8 text-center pt-8">
        <div className="flex items-center justify-center gap-12 mb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shadow-sm">
              <ThumbsDown className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Swipe Left</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
              <ThumbsUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Swipe Right</span>
          </div>
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50 p-0"
          onClick={() => setShowReasonModal(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-card rounded-t-[2rem] p-6 pb-10 shadow-2xl"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>

            <h2 className="text-2xl font-bold mb-2 text-foreground">Why didn't you like this?</h2>
            <p className="text-sm text-muted-foreground mb-8 font-medium">
              Help us improve the food quality
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`px-4 py-4 rounded-2xl font-semibold transition-all duration-200 ${
                    selectedReason === reason
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-100"
                      : "bg-gray-50 text-foreground hover:bg-gray-100 scale-100 border border-gray-100"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  moveToNext();
                }}
                className="flex-1 py-4 rounded-2xl font-semibold bg-gray-50 text-foreground border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitReason}
                disabled={!selectedReason}
                className={`flex-1 py-4 rounded-2xl font-semibold transition-all duration-200 ${
                  selectedReason
                    ? "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

interface SwipeCardProps {
  dish: { name: string; wastePercent: number };
  onSwipe: (direction: "left" | "right") => void;
}

function SwipeCard({ dish, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      const direction = info.offset.x > 0 ? "right" : "left";
      onSwipe(direction);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98, cursor: "grabbing" }}
      className="absolute inset-0 bg-card rounded-[2rem] shadow-xl border border-border cursor-grab z-10 overflow-hidden"
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Swipe Indicators */}
      <motion.div
        style={{ opacity: useTransform(x, [-100, -20], [1, 0]) }}
        className="absolute top-8 right-8 bg-red-50 text-red-500 border-2 border-red-500 px-6 py-2 rounded-2xl font-black text-xl rotate-12 shadow-sm z-20 pointer-events-none tracking-widest"
      >
        NOPE
      </motion.div>

      <motion.div
        style={{ opacity: useTransform(x, [20, 100], [0, 1]) }}
        className="absolute top-8 left-8 bg-primary/10 text-primary border-2 border-primary px-6 py-2 rounded-2xl font-black text-xl -rotate-12 shadow-sm z-20 pointer-events-none tracking-widest"
      >
        LIKE
      </motion.div>

      {/* Card Content */}
      <div className="h-full flex flex-col items-center justify-center p-8 pointer-events-none">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="text-8xl mb-6 relative drop-shadow-md"
        >
          {emojiMap[dish.name] || "🍽️"}
        </motion.div>

        <h2 className="text-4xl font-black text-foreground mb-3">{dish.name}</h2>

        <div className="flex items-baseline gap-2 mb-8">
          <div className={`text-6xl font-black ${dish.wastePercent > 30 ? "text-warning" : "text-primary"}`}>
            {dish.wastePercent}%
          </div>
          <span className="text-xl font-bold text-muted-foreground uppercase tracking-wide">wasted</span>
        </div>

        <div className="w-full max-w-xs h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner mb-10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${dish.wastePercent}%` }}
            transition={{ type: "spring", bounce: 0.2, duration: 1, delay: 0.2 }}
            className={`h-full ${
              dish.wastePercent > 30 ? "bg-warning" : "bg-primary"
            }`}
          ></motion.div>
        </div>

        <div className="text-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 w-full max-w-xs">
          <p className="text-base font-semibold text-foreground mb-1">Did you enjoy this dish?</p>
          <p className="text-sm font-medium text-muted-foreground">
            Swipe left 👎 or right 👍
          </p>
        </div>
      </div>
    </motion.div>
  );
}
