"use client";

import { motion } from "motion/react";
import { UtensilsCrossed, CalendarClock, QrCode, CheckCircle2, TrendingDown, HandHeart, Recycle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";

export default function StaffDashboard() {
  const supabase = createClient();
  const [userName, setUserName] = useState("Staff");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    hasActiveSession: false,
    pendingMenus: 0,
    todaysWaste: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Quick name extraction
        setUserName(user.email?.split('@')[0] || "Staff");

      const { data: profile } = await supabase.from('users').select('ecosystem_id').eq('id', user.id).single();
      if (!profile?.ecosystem_id) {
         setLoading(false);
         return;
      }

      const today = new Date().toISOString().split("T")[0];

      // 1. Check for Active Session
      const { count: activeCount } = await supabase
        .from('meal_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('ecosystem_id', profile.ecosystem_id)
        .eq('date', today)
        .eq('status', 'approved');

      // 2. Check for Pending Menus
      const { count: pendingCount } = await supabase
        .from('meal_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('ecosystem_id', profile.ecosystem_id)
        .eq('status', 'pending');

      // 3. Calculate Today's Avg Waste
      const { data: feedbackData } = await supabase
        .from('dish_feedback')
        .select('waste_percent, created_at')
        .eq('ecosystem_id', profile.ecosystem_id)
        .gte('created_at', `${today}T00:00:00Z`);

      let avgWaste = 0;
      if (feedbackData && feedbackData.length > 0) {
        const total = feedbackData.reduce((sum, item) => sum + item.waste_percent, 0);
        avgWaste = Math.round(total / feedbackData.length);
      }

        setMetrics({
          hasActiveSession: (activeCount || 0) > 0,
          pendingMenus: pendingCount || 0,
          todaysWaste: avgWaste
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight capitalize">Welcome back, {userName}!</h2>
          <p className="text-muted-foreground mt-1 font-medium">Here is what's happening in your mess today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/staff/menu">
            <button className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-[1rem] text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">
              <UtensilsCrossed className="w-4 h-4" />
              Create Menu
            </button>
          </Link>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          
          {/* Quick Actions */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Active Meal Session</h3>
            <p className="text-sm font-medium text-muted-foreground mb-6">
              {metrics.hasActiveSession 
                ? "An approved meal session is currently active. Display the QR code for students to scan."
                : "No active sessions for today. Wait for an Admin to approve your menus."}
            </p>
            <Link href="/staff/qr">
              <button 
                disabled={!metrics.hasActiveSession}
                className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {metrics.hasActiveSession ? "Show QR Code" : "Awaiting Approval"}
              </button>
            </Link>
          </motion.div>

          {/* Status Card */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm"
          >
            <div className="w-12 h-12 bg-amber-50 text-warning rounded-xl flex items-center justify-center mb-4">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Upcoming Menus</h3>
            <p className="text-sm font-medium text-muted-foreground mb-4">You have <strong className="text-foreground">{metrics.pendingMenus}</strong> menus currently pending admin approval.</p>
            {metrics.pendingMenus > 0 ? (
              <div className="flex items-center gap-2 text-sm font-bold text-warning bg-warning/10 px-3 py-1.5 rounded-lg w-max">
                Waiting for Admin
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg w-max">
                <CheckCircle2 className="w-4 h-4" /> All Caught Up
              </div>
            )}
          </motion.div>

          {/* Feedback Card */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100 shadow-sm"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Today's Waste Trend</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-4xl font-black text-emerald-600 tracking-tight">{metrics.todaysWaste}%</div>
            </div>
            <p className="text-sm font-medium text-emerald-700 flex items-center gap-1 mt-4">
              {metrics.todaysWaste > 25 ? (
                 <>Warning: Missing target of 25%</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Below 25% target! Good job.
                </>
              )}
            </p>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
              <HandHeart className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Helping Hand</h3>
            <p className="text-sm font-medium text-muted-foreground mb-6">
              Raise edible leftover food tokens for NGO pickup and track claim status.
            </p>
            <Link href="/staff/leftover-food">
              <button className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Open Helping Hand
              </button>
            </Link>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
             className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
              <Recycle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">Waste2Resource</h3>
            <p className="text-sm font-medium text-muted-foreground mb-6">
              Raise non-edible waste tokens for compost, manure, and biogas recyclers.
            </p>
            <Link href="/staff/waste-collection">
              <button className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Open Waste2Resource
              </button>
            </Link>
          </motion.div>

        </div>
      )}
    </div>
  );
}
