"use client";

import { motion } from "motion/react";
import { TrendingDown, Calendar, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2 } from "lucide-react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

type MonthlyPoint = {
  month: string;
  waste: number;
  target: number;
  count: number;
};

type WeeklyPoint = {
  week: string;
  waste: number;
  label: string;
  count: number;
};

const supabase = createClient();

export default function WasteTrends() {
  const [loading, setLoading] = useState(true);
  const [monthlyWasteData, setMonthlyWasteData] = useState<MonthlyPoint[]>([]);
  const [weeklyWasteData, setWeeklyWasteData] = useState<WeeklyPoint[]>([]);
  const [overallReduction, setOverallReduction] = useState(0);
  const [isReductionPositive, setIsReductionPositive] = useState(true);
  const [reductionLabel, setReductionLabel] = useState("Compared with 6 months ago");
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: adminEco, error: adminEcoError } = await supabase.rpc("get_admin_ecosystem");
        if (adminEcoError || !adminEco) {
          setLoading(false);
          return;
        }
        const ecoRow = Array.isArray(adminEco) ? adminEco[0] : adminEco;
        if (!ecoRow?.ecosystem_id) {
          setLoading(false);
          return;
        }
        const ecoId = ecoRow.ecosystem_id as string;

        const now = new Date();
        const sixMonthStart = startOfMonth(subMonths(now, 5));
        const fourWeekStart = startOfDay(subDays(now, 27));

        const [settingsResult, feedbackResult] = await Promise.all([
          supabase
            .from("system_settings")
            .select("waste_threshold")
            .eq("ecosystem_id", ecoId)
            .single(),
          supabase
            .from("dish_feedback")
            .select("waste_percent, created_at")
            .eq("ecosystem_id", ecoId)
            .gte("created_at", sixMonthStart.toISOString())
            .lte("created_at", now.toISOString()),
        ]);

        if (settingsResult.error) throw settingsResult.error;
        if (feedbackResult.error) throw feedbackResult.error;

        const targetWaste = settingsResult.data?.waste_threshold ?? 20;
        const feedbackRows = feedbackResult.data || [];

        const monthOrder: string[] = [];
        const monthBuckets: Record<string, { label: string; total: number; count: number }> = {};
        for (let i = 5; i >= 0; i -= 1) {
          const monthDate = startOfMonth(subMonths(now, i));
          const key = format(monthDate, "yyyy-MM");
          monthOrder.push(key);
          monthBuckets[key] = {
            label: format(monthDate, "MMM"),
            total: 0,
            count: 0,
          };
        }

        const weekBuckets: Array<{ label: string; total: number; count: number }> = [];
        for (let i = 0; i < 4; i += 1) {
          const start = addDays(fourWeekStart, i * 7);
          const end = addDays(start, 6);
          weekBuckets.push({
            label: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
            total: 0,
            count: 0,
          });
        }

        feedbackRows.forEach((row) => {
          const createdAt = new Date(row.created_at);
          const waste = row.waste_percent || 0;

          const monthKey = format(createdAt, "yyyy-MM");
          if (monthBuckets[monthKey]) {
            monthBuckets[monthKey].total += waste;
            monthBuckets[monthKey].count += 1;
          }

          if (createdAt >= fourWeekStart) {
            const weekIndex = Math.floor(differenceInCalendarDays(createdAt, fourWeekStart) / 7);
            if (weekIndex >= 0 && weekIndex < 4) {
              weekBuckets[weekIndex].total += waste;
              weekBuckets[weekIndex].count += 1;
            }
          }
        });

        const monthlyData: MonthlyPoint[] = monthOrder.map((key) => {
          const bucket = monthBuckets[key];
          return {
            month: bucket.label,
            waste: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
            target: targetWaste,
            count: bucket.count,
          };
        });

        const weeklyData: WeeklyPoint[] = weekBuckets.map((bucket, index) => ({
          week: `W${index + 1}`,
          waste: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
          label: bucket.label,
          count: bucket.count,
        }));

        const monthsWithData = monthlyData.filter((month) => month.count > 0);
        const firstMonth = monthsWithData[0];
        const latestMonth = monthsWithData[monthsWithData.length - 1];

        let reduction = 0;
        if (firstMonth && latestMonth && firstMonth.waste > 0) {
          reduction = Number((((firstMonth.waste - latestMonth.waste) / firstMonth.waste) * 100).toFixed(1));
        }
        const reductionPositive = reduction >= 0;

        const insightLines: string[] = [];
        if (latestMonth) {
          const deltaToTarget = latestMonth.waste - targetWaste;
          if (deltaToTarget <= 0) {
            insightLines.push(
              `Latest month (${latestMonth.month}) is ${Math.abs(deltaToTarget)} pts below target (${targetWaste}%).`
            );
          } else {
            insightLines.push(
              `Latest month (${latestMonth.month}) is ${deltaToTarget} pts above target (${targetWaste}%).`
            );
          }
        }

        if (monthsWithData.length >= 2) {
          const previous = monthsWithData[monthsWithData.length - 2];
          if (latestMonth && previous) {
            const monthChange = latestMonth.waste - previous.waste;
            if (monthChange < 0) {
              insightLines.push(
                `Waste improved by ${Math.abs(monthChange)} pts from ${previous.month} to ${latestMonth.month}.`
              );
            } else if (monthChange > 0) {
              insightLines.push(`Waste increased by ${monthChange} pts from ${previous.month} to ${latestMonth.month}.`);
            } else {
              insightLines.push(`Waste remained flat from ${previous.month} to ${latestMonth.month}.`);
            }
          }
        }

        const peakWeek = weeklyData.reduce<WeeklyPoint | null>((best, current) => {
          if (current.count === 0) return best;
          if (!best || current.waste > best.waste) return current;
          return best;
        }, null);
        if (peakWeek) {
          insightLines.push(`Highest 4-week average was ${peakWeek.waste}% during ${peakWeek.label}.`);
        }

        if (insightLines.length === 0) {
          insightLines.push("No dish feedback records available yet for trend analysis.");
        }

        setMonthlyWasteData(monthlyData);
        setWeeklyWasteData(weeklyData);
        setOverallReduction(reduction);
        setIsReductionPositive(reductionPositive);
        setReductionLabel(
          firstMonth ? `Compared with ${firstMonth.month}` : "Compared with previous records"
        );
        setInsights(insightLines);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Waste Trends</h2>
          <p className="text-muted-foreground mt-1 font-medium">Analyze long-term sustainability metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
            <Calendar className="w-4 h-4" />
            Last 6 Months
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Auto-calculated
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 lg:p-6"
      >
        <div className="mb-6 lg:mb-8 flex justify-between items-start">
          <div>
            <h3 className="text-lg lg:text-xl font-bold mb-1.5 text-foreground">Monthly Waste vs Targets</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Monitoring actual waste against your configured target threshold.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm font-semibold text-muted-foreground">Actual Waste</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-semibold text-muted-foreground">Target</span>
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyWasteData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: "#6B7280", fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: "#6B7280", fontWeight: 500 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ fontWeight: 600 }}
                formatter={(value: any, name: string) => [
                  `${value}%`,
                  name === "waste" ? "Actual Waste" : "Target",
                ]}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorTarget)"
              />
              <Area
                type="monotone"
                dataKey="waste"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorWaste)"
                activeDot={{ r: 8, fill: "#10B981", stroke: "#fff", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-[1.5rem] p-6 border ${
              isReductionPositive
                ? "bg-primary/5 border-primary/10"
                : "bg-red-50 border-red-100"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-xl ${
                  isReductionPositive ? "bg-primary/20" : "bg-red-100"
                }`}
              >
                <TrendingDown className={`w-5 h-5 ${isReductionPositive ? "text-primary" : "text-red-500"}`} />
              </div>
              <h3 className="font-bold text-foreground">6-Month Reduction</h3>
            </div>
            <div
              className={`text-4xl font-black tracking-tight mb-2 ${
                isReductionPositive ? "text-primary" : "text-red-500"
              }`}
            >
              {Math.abs(overallReduction).toFixed(1)}%
            </div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {isReductionPositive ? (
                <ArrowDownRight className="w-4 h-4 text-primary" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-red-500" />
              )}
              {reductionLabel}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm"
          >
            <h3 className="font-bold text-foreground mb-4">Insights</h3>
            <ul className="space-y-4">
              {insights.map((insight, index) => (
                <li key={insight} className="flex gap-3">
                  <div
                    className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                      index === 0 ? "bg-primary" : "bg-warning"
                    }`}
                  ></div>
                  <p className="text-sm text-foreground font-medium">{insight}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 lg:p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg lg:text-xl font-bold mb-1.5 text-foreground">
              Current Month: Weekly Breakdown
            </h3>
            <p className="text-sm font-medium text-muted-foreground">Rolling 4-week averages from feedback data.</p>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyWasteData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "#6B7280", fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "#6B7280", fontWeight: 500 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: any) => [`${value}%`, "Waste"]}
                  labelFormatter={(_, payload: any) => payload?.[0]?.payload?.label || ""}
                />
                <Line
                  type="stepAfter"
                  dataKey="waste"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, r: 4, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
