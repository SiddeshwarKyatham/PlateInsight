"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MessageSquareHeart, Frown, Filter, ThumbsUp, Loader2 } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

const supabase = createClient(); // module-level singleton

export default function StaffFeedback() {
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    positive: 0,
    negative: 0,
    mostComplained: "N/A",
    complaintCount: 0
  });

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      // Bug #5 FIXED: Added setLoading(false) before early returns to prevent infinite spinner
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('users').select('ecosystem_id').eq('id', user.id).single();
      if (!profile?.ecosystem_id) { setLoading(false); return; }

      // Fetch feedback for this ecosystem, ordering by newest
      const { data, error } = await supabase
        .from('dish_feedback')
        .select('*')
        .eq('ecosystem_id', profile.ecosystem_id)
        .order('created_at', { ascending: false });

      if (data) {
        setFeedbackData(data);
        
        // Compute stats
        let pos = 0;
        let neg = 0;
        const complaintsMap: Record<string, number> = {};

        data.forEach(fb => {
          if (fb.sentiment === 'positive') pos++;
          if (fb.sentiment === 'negative') {
            neg++;
            complaintsMap[fb.dish_name] = (complaintsMap[fb.dish_name] || 0) + 1;
          }
        });

        // Find most complained
        let maxDish = "None";
        let maxCount = 0;
        Object.entries(complaintsMap).forEach(([dish, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxDish = dish;
          }
        });

        setStats({
          positive: pos,
          negative: neg,
          mostComplained: maxDish,
          complaintCount: maxCount
        });
      }
      setLoading(false);
    };

    fetchFeedback();

    // Real-time: new dish_feedback rows appear instantly
    const channel = supabase
      .channel('staff-feedback-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dish_feedback' },
        () => { fetchFeedback(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Dish Feedback</h2>
          <p className="text-muted-foreground mt-1 font-medium">Monitor real-time student sentiment for active meal sessions.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filter by Meal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground">Positive Swipes</p>
            <p className="text-2xl font-black text-foreground">{loading ? "-" : stats.positive}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
            <Frown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground">Negative Swipes</p>
            <p className="text-2xl font-black text-foreground">{loading ? "-" : stats.negative}</p>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
          <p className="text-sm font-bold text-muted-foreground mb-2">Most Complained</p>
          <div className="flex items-center justify-between">
             <span className="font-black text-foreground truncate max-w-[150px]">{loading ? "-" : stats.mostComplained}</span>
             {stats.complaintCount > 0 && (
               <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2 py-1 rounded-md shrink-0">
                 {stats.complaintCount} issues
               </span>
             )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <MessageSquareHeart className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-bold text-foreground">Recent Feedback Log</h3>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
             <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : feedbackData.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">
             No feedback recorded yet. Check back after a meal session!
          </div>
        ) : (
          <div className="overflow-x-auto p-1">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tl-xl border-b border-gray-100">Dish Name</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Sentiment</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Waste Level</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Written Reason</th>
                  <th className="text-right px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tr-xl border-b border-gray-100">Time</th>
                </tr>
              </thead>
              <tbody>
                {feedbackData.map((feedback, i) => (
                  <motion.tr 
                    key={feedback.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-5">
                      <div className="font-bold text-foreground">{feedback.dish_name}</div>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${feedback.food_type === 'veg' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {feedback.food_type || 'veg'}
                      </span>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        feedback.sentiment === 'negative' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                      }`}>
                        {feedback.sentiment}
                      </span>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full ${feedback.waste_percent > 40 ? 'bg-rose-500' : feedback.waste_percent > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${feedback.waste_percent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-black text-foreground">{feedback.waste_percent}%</span>
                      </div>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <p className="text-sm font-medium text-gray-600 italic">
                        {feedback.reason ? `"${feedback.reason}"` : <span className="text-gray-400 not-italic">No comment left</span>}
                      </p>
                    </td>
                    <td className="px-5 lg:px-6 py-5 text-right">
                      <span className="text-sm font-bold text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
