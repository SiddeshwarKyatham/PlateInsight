"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  Users,
  IndianRupee,
  MessageSquareWarning,
  AlertTriangle,
  Utensils,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2 } from "lucide-react";
import { startOfDay, endOfDay } from 'date-fns';
import ErrorBoundary from "../../../src/app/components/ErrorBoundary";

const supabase = createClient(); // module-level singleton

function AdminDashboardContent() {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    averageWaste: 0,
    topWastedDish: "-",
    savingsToday: 0,
    totalSubmissions: 0
  });
  
  const [wasteData, setWasteData] = useState<any[]>([]);
  const [dishWasteData, setDishWasteData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [insights, setInsights] = useState({
    mostReportedIssue: "-",
    issueCount: 0,
    mostComplainedDish: "-",
    highRiskDishCount: 0,
    highRiskDishList: "None",
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: adminEco, error: adminEcoError } = await supabase.rpc("get_admin_ecosystem");
        if (adminEcoError || !adminEco) { setLoading(false); return; }
        const ecoRow = Array.isArray(adminEco) ? adminEco[0] : adminEco;
        if (!ecoRow?.ecosystem_id) { setLoading(false); return; }
        const ecoId = ecoRow.ecosystem_id as string;
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

      // Bug #2 FIXED: submissions table has no waste_percent column.
      // Use submissions for count, dish_feedback for waste percentage aggregation.

      // Fetch today's submission count
      const { count: subsTodayCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('ecosystem_id', ecoId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Fetch total participation count (all-time for this ecosystem)
      const { count: totalSubmissionsCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('ecosystem_id', ecoId);

      // Fetch today's dish feedback for waste stats
      const { data: todayFeedback } = await supabase
        .from('dish_feedback')
        .select('dish_name, waste_percent, sentiment, reason')
        .eq('ecosystem_id', ecoId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Fetch ALL historical dish feedback for dish-level analytics
      const { data: feedbackData } = await supabase
        .from('dish_feedback')
        .select('dish_name, waste_percent, sentiment, reason')
        .eq('ecosystem_id', ecoId);

      // --- Calculate Top Metrics ---
      let avgWaste = 0;
      const submissionsToday = subsTodayCount || 0;
      
      if (todayFeedback && todayFeedback.length > 0) {
        avgWaste = Math.round(todayFeedback.reduce((acc, fb) => acc + fb.waste_percent, 0) / todayFeedback.length);
      }

      // --- Calculate Dish Table & Sentiment Data ---
      const dishMap: Record<string, { waste: number, counts: number, negatives: number, reasons: Record<string, number> }> = {};
      const issueCounts: Record<string, number> = {};
      
      if (feedbackData) {
        feedbackData.forEach(fb => {
          if (!dishMap[fb.dish_name]) {
             dishMap[fb.dish_name] = { waste: 0, counts: 0, negatives: 0, reasons: {} };
          }
          dishMap[fb.dish_name].waste += fb.waste_percent;
          dishMap[fb.dish_name].counts++;
          const sentiment = String(fb.sentiment || "").toLowerCase();
          const isNegative =
            sentiment === "negative" || sentiment === "bad" || sentiment === "terrible";

          if (isNegative) {
             dishMap[fb.dish_name].negatives++;
             const reason = String((fb as any).reason || "").trim();
             if (reason) {
               issueCounts[reason] = (issueCounts[reason] || 0) + 1;
               dishMap[fb.dish_name].reasons[reason] =
                 (dishMap[fb.dish_name].reasons[reason] || 0) + 1;
             }
          }
        });
      }

      const formattedDishes = Object.keys(dishMap).map(dish => {
         const data = dishMap[dish];
         const topComplaintEntry = Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0];
         return {
            dish: dish,
            waste: Math.round(data.waste / data.counts),
            negative: Math.round((data.negatives / data.counts) * 100),
            samples: data.counts,
            complaint: topComplaintEntry?.[0] || (data.negatives > 0 ? "General dissatisfaction" : "None")
         };
      }).sort((a, b) => b.waste - a.waste);

      const topIssueEntry = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
      const mostComplainedDish = [...formattedDishes].sort(
        (a, b) => b.negative - a.negative || b.samples - a.samples
      )[0]?.dish || "-";
      const highRiskDishes = formattedDishes.filter((dish) => dish.waste >= 30 && dish.negative >= 40);

      // Bug #7 FIXED: Build a real 7-day trend from historical dish_feedback data
      // instead of the previous hardcoded Mon-Thu mock array.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const { data: trendFeedback } = await supabase
        .from('dish_feedback')
        .select('waste_percent, created_at')
        .eq('ecosystem_id', ecoId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Group by date
      const trendMap: Record<string, { total: number; count: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
        trendMap[key] = { total: 0, count: 0 };
      }

      (trendFeedback || []).forEach(fb => {
        const day = new Date(fb.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (trendMap[day]) {
          trendMap[day].total += fb.waste_percent;
          trendMap[day].count += 1;
        }
      });

      const realTrend = Object.entries(trendMap).map(([date, { total, count }]) => ({
        date,
        waste: count > 0 ? Math.round(total / count) : 0,
      }));

      setMetrics({
        averageWaste: avgWaste,
        topWastedDish: formattedDishes.length > 0 ? formattedDishes[0].dish : "-",
        savingsToday: (50 - avgWaste) * 10, // Fun mock calculation for savings
        totalSubmissions: totalSubmissionsCount || submissionsToday
      });

      setDishWasteData(formattedDishes);
      setWasteData(realTrend);
      setPriorityData(
        formattedDishes.length > 0
          ? formattedDishes
              .map((dish) => ({
                dish: dish.dish.length > 18 ? `${dish.dish.slice(0, 18)}...` : dish.dish,
                fullDish: dish.dish,
                waste: dish.waste,
                negative: dish.negative,
                samples: dish.samples,
                actionScore: Math.round(dish.waste * 0.65 + dish.negative * 0.35),
              }))
              .sort((a, b) => b.actionScore - a.actionScore)
              .slice(0, 8)
          : [{ dish: "No data", fullDish: "No data", waste: 0, negative: 0, samples: 0, actionScore: 0 }]
      );
      setInsights({
        mostReportedIssue: topIssueEntry?.[0] || "No recurring issue",
        issueCount: topIssueEntry?.[1] || 0,
        mostComplainedDish,
        highRiskDishCount: highRiskDishes.length,
        highRiskDishList: highRiskDishes.slice(0, 3).map((dish) => dish.dish).join(", ") || "None",
      });
        
      } catch (err) {
         console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
     return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div className="bg-background">

      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Operations Overview</h2>
          <p className="text-muted-foreground mt-1 font-medium">Monitor waste patterns, savings, and dish-level performance across your ecosystem.</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <MetricCard
            title="Waste Avg"
            value={`${metrics.averageWaste}%`}
            icon={<TrendingDown className="w-5 h-5" />}
            trend={{ value: -12, isPositive: true }}
            color="primary"
          />
          <MetricCard
            title="Top Wasted"
            value={metrics.topWastedDish}
            icon={<TrendingUp className="w-5 h-5" />}
            subtitle="Current highest"
            color="warning"
          />
          <MetricCard
            title="Saved Today"
            value={`Rs ${metrics.savingsToday.toFixed(0)}`}
            icon={<IndianRupee className="w-5 h-5" />}
            trend={{ value: 8, isPositive: true }}
            color="primary"
          />
          <MetricCard
            title="Participation"
            value={metrics.totalSubmissions.toString()}
            icon={<Users className="w-5 h-5" />}
            subtitle="students"
            color="primary"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Waste Trend */}
          <ChartCard title="Waste Trend" subtitle="Last 7 days">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={wasteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any) => [`${value}%`, "Waste"]}
                />
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Dish-wise Waste */}
          <ChartCard title="Dish-wise Waste" subtitle="Current week average">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dishWasteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="dish"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any) => [`${value}%`, "Waste"]}
                />
                <Bar
                  dataKey="waste"
                  fill="#F59E0B"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Dish Action Priority */}
        <div className="mb-6 lg:mb-8">
          <ChartCard
            title="Dish Action Priority"
            subtitle="Simple ranking of dishes that need immediate attention"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={priorityData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  type="category"
                  dataKey="dish"
                  width={120}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any, name: string, data: any) => {
                    if (name === "actionScore") return [`${value}/100`, "Action Score"];
                    if (name === "waste") return [`${value}%`, "Avg Waste"];
                    if (name === "negative") return [`${value}%`, "Negative Feedback"];
                    return [value, name];
                  }}
                  labelFormatter={(_, payload: any) =>
                    payload?.[0]?.payload?.fullDish
                      ? `Dish: ${payload[0].payload.fullDish} (${payload[0].payload.samples} samples)`
                      : ""
                  }
                />
                <Legend />
                <Bar dataKey="actionScore" name="Action Score" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-muted-foreground">
              Action Score = 65% waste + 35% negative feedback. Higher score means higher intervention priority.
            </p>
          </ChartCard>
        </div>

        {/* Admin Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <InsightCard
            title="Most Reported Issue"
            value={insights.mostReportedIssue}
            subValue={`${insights.issueCount} negative reports`}
            icon={<MessageSquareWarning className="w-5 h-5" />}
          />
          <InsightCard
            title="Most Complained Dish"
            value={insights.mostComplainedDish}
            subValue="Highest negative feedback rate"
            icon={<Utensils className="w-5 h-5" />}
          />
          <InsightCard
            title="High-Risk Dishes"
            value={insights.highRiskDishCount.toString()}
            subValue={insights.highRiskDishList}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-lg lg:text-xl font-bold text-foreground">Dish Performance</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Detailed waste analysis by dish
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 lg:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Dish
                  </th>
                  <th className="text-left px-5 lg:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Waste %
                  </th>
                  <th className="text-left px-5 lg:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Negative %
                  </th>
                  <th className="text-left px-5 lg:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Top Complaint
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dishWasteData.map((row, index) => (
                  <motion.tr
                    key={row.dish}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-5 lg:px-6 py-4">
                      <div className="font-semibold text-foreground">{row.dish}</div>
                    </td>
                    <td className="px-5 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            row.waste > 30
                              ? "bg-warning/10 text-warning"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {row.waste}%
                        </div>
                      </div>
                    </td>
                    <td className="px-5 lg:px-6 py-4">
                      <span className="font-semibold text-foreground">{row.negative}%</span>
                    </td>
                    <td className="px-5 lg:px-6 py-4">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {row.complaint}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  color: "primary" | "warning";
}

function MetricCard({ title, value, icon, trend, subtitle, color }: MetricCardProps) {
  const bgColor = color === "primary" ? "bg-primary/10" : "bg-warning/10";
  const iconColor = color === "primary" ? "text-primary" : "text-warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 lg:p-6 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-[1rem] ${bgColor} flex items-center justify-center ${iconColor} shadow-inner`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              trend.isPositive ? "bg-primary/10 text-primary" : "bg-red-50 text-red-500"
            }`}
          >
            {trend.isPositive ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="text-3xl lg:text-4xl font-black mb-1.5 tracking-tight text-foreground">{value}</div>
      <div className="text-sm font-medium text-muted-foreground">{subtitle || title}</div>
    </motion.div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

interface InsightCardProps {
  title: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
}

function InsightCard({ title, value, subValue, icon }: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 lg:p-6"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{title}</p>
      <p className="text-xl lg:text-2xl font-black text-foreground mt-2">{value}</p>
      <p className="text-sm text-muted-foreground mt-1 font-medium">{subValue}</p>
    </motion.div>
  );
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 lg:p-6"
    >
      <div className="mb-6 lg:mb-8">
        <h3 className="text-lg lg:text-xl font-bold mb-1.5 text-foreground">{title}</h3>
        <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

export default function AdminDashboard() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}
