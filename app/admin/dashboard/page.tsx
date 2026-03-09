"use client";

import { motion } from "motion/react";
import {
  TrendingDown,
  TrendingUp,
  Users,
  MessageSquareWarning,
  AlertTriangle,
  Utensils,
  Target,
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
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import ErrorBoundary from "../../../src/app/components/ErrorBoundary";

const supabase = createClient();

type TrendPoint = {
  date: string;
  waste: number;
};

type DishWasteRow = {
  dish: string;
  waste: number;
  negative: number;
  samples: number;
  complaint: string;
};

type PriorityRow = {
  dish: string;
  fullDish: string;
  waste: number;
  negative: number;
  samples: number;
  actionScore: number;
};

type MetricState = {
  averageWaste: number;
  averageWasteTrend: number;
  topWastedDish: string;
  topWastedWaste: number;
  targetWaste: number;
  targetGap: number;
  targetGapTrend: number;
  totalSubmissions: number;
  todaySubmissions: number;
  submissionsTrend: number;
  hasYesterdayWaste: boolean;
  hasYesterdaySubmissions: boolean;
};

type InsightState = {
  mostReportedIssue: string;
  issueCount: number;
  mostComplainedDish: string;
  highRiskDishCount: number;
  highRiskDishList: string;
};

const emptyMetrics: MetricState = {
  averageWaste: 0,
  averageWasteTrend: 0,
  topWastedDish: "-",
  topWastedWaste: 0,
  targetWaste: 20,
  targetGap: 0,
  targetGapTrend: 0,
  totalSubmissions: 0,
  todaySubmissions: 0,
  submissionsTrend: 0,
  hasYesterdayWaste: false,
  hasYesterdaySubmissions: false,
};

const emptyInsights: InsightState = {
  mostReportedIssue: "-",
  issueCount: 0,
  mostComplainedDish: "-",
  highRiskDishCount: 0,
  highRiskDishList: "None",
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function formatTrendValue(value: number) {
  return Number.isInteger(value) ? Math.abs(value).toString() : Math.abs(value).toFixed(1);
}

function AdminDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricState>(emptyMetrics);
  const [wasteData, setWasteData] = useState<TrendPoint[]>([]);
  const [dishWasteData, setDishWasteData] = useState<DishWasteRow[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityRow[]>([]);
  const [insights, setInsights] = useState<InsightState>(emptyInsights);

  useEffect(() => {
    const fetchAdminData = async () => {
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
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const yesterday = subDays(now, 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);
        const sevenDayStart = startOfDay(subDays(now, 6));

        const [
          settingsResult,
          subsTodayResult,
          subsYesterdayResult,
          subsTotalResult,
          todayFeedbackResult,
          yesterdayFeedbackResult,
          allFeedbackResult,
          trendFeedbackResult,
        ] = await Promise.all([
          supabase
            .from("system_settings")
            .select("waste_threshold")
            .eq("ecosystem_id", ecoId)
            .single(),
          supabase
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("ecosystem_id", ecoId)
            .gte("created_at", todayStart.toISOString())
            .lte("created_at", todayEnd.toISOString()),
          supabase
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("ecosystem_id", ecoId)
            .gte("created_at", yesterdayStart.toISOString())
            .lte("created_at", yesterdayEnd.toISOString()),
          supabase
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("ecosystem_id", ecoId),
          supabase
            .from("dish_feedback")
            .select("waste_percent")
            .eq("ecosystem_id", ecoId)
            .gte("created_at", todayStart.toISOString())
            .lte("created_at", todayEnd.toISOString()),
          supabase
            .from("dish_feedback")
            .select("waste_percent")
            .eq("ecosystem_id", ecoId)
            .gte("created_at", yesterdayStart.toISOString())
            .lte("created_at", yesterdayEnd.toISOString()),
          supabase
            .from("dish_feedback")
            .select("dish_name, waste_percent, sentiment, reason")
            .eq("ecosystem_id", ecoId),
          supabase
            .from("dish_feedback")
            .select("waste_percent, created_at")
            .eq("ecosystem_id", ecoId)
            .gte("created_at", sevenDayStart.toISOString())
            .lte("created_at", todayEnd.toISOString()),
        ]);

        const queryErrors = [
          settingsResult.error,
          subsTodayResult.error,
          subsYesterdayResult.error,
          subsTotalResult.error,
          todayFeedbackResult.error,
          yesterdayFeedbackResult.error,
          allFeedbackResult.error,
          trendFeedbackResult.error,
        ].filter(Boolean);

        if (queryErrors.length > 0) {
          throw queryErrors[0];
        }

        const targetWaste = settingsResult.data?.waste_threshold ?? 20;
        const todaySubmissions = subsTodayResult.count || 0;
        const yesterdaySubmissions = subsYesterdayResult.count || 0;
        const totalSubmissions = subsTotalResult.count || 0;

        const todayWasteValues = (todayFeedbackResult.data || []).map((row) => row.waste_percent || 0);
        const yesterdayWasteValues = (yesterdayFeedbackResult.data || []).map(
          (row) => row.waste_percent || 0
        );

        const averageWaste = average(todayWasteValues);
        const yesterdayAverageWaste = average(yesterdayWasteValues);
        const averageWasteTrend = percentDelta(averageWaste, yesterdayAverageWaste);
        const submissionsTrend = percentDelta(todaySubmissions, yesterdaySubmissions);

        const targetGap = Number((targetWaste - averageWaste).toFixed(1));
        const yesterdayTargetGap = Number((targetWaste - yesterdayAverageWaste).toFixed(1));
        const targetGapTrend = Number((targetGap - yesterdayTargetGap).toFixed(1));

        const feedbackData = allFeedbackResult.data || [];
        const dishMap: Record<
          string,
          { waste: number; counts: number; negatives: number; reasons: Record<string, number> }
        > = {};
        const issueCounts: Record<string, number> = {};

        feedbackData.forEach((feedback) => {
          const dishName = String(feedback.dish_name || "").trim();
          if (!dishName) return;
          if (!dishMap[dishName]) {
            dishMap[dishName] = { waste: 0, counts: 0, negatives: 0, reasons: {} };
          }

          dishMap[dishName].waste += feedback.waste_percent || 0;
          dishMap[dishName].counts += 1;

          const sentiment = String(feedback.sentiment || "").toLowerCase();
          const isNegative =
            sentiment === "negative" || sentiment === "bad" || sentiment === "terrible";

          if (isNegative) {
            dishMap[dishName].negatives += 1;
            const reason = String(feedback.reason || "").trim();
            if (reason) {
              issueCounts[reason] = (issueCounts[reason] || 0) + 1;
              dishMap[dishName].reasons[reason] = (dishMap[dishName].reasons[reason] || 0) + 1;
            }
          }
        });

        const formattedDishes: DishWasteRow[] = Object.keys(dishMap)
          .map((dish) => {
            const data = dishMap[dish];
            const topComplaintEntry = Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0];
            return {
              dish,
              waste: Math.round(data.waste / data.counts),
              negative: Math.round((data.negatives / data.counts) * 100),
              samples: data.counts,
              complaint:
                topComplaintEntry?.[0] || (data.negatives > 0 ? "General dissatisfaction" : "None"),
            };
          })
          .sort((a, b) => b.waste - a.waste);

        const topIssueEntry = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
        const mostComplainedDish =
          [...formattedDishes].sort((a, b) => b.negative - a.negative || b.samples - a.samples)[0]
            ?.dish || "-";
        const highRiskDishes = formattedDishes.filter(
          (dish) => dish.waste >= targetWaste && dish.negative >= 40
        );

        const trendMap: Record<string, { date: string; total: number; count: number }> = {};
        for (let i = 6; i >= 0; i -= 1) {
          const date = subDays(now, i);
          const key = format(date, "yyyy-MM-dd");
          trendMap[key] = {
            date: format(date, "MMM d"),
            total: 0,
            count: 0,
          };
        }

        (trendFeedbackResult.data || []).forEach((feedback) => {
          const key = format(new Date(feedback.created_at), "yyyy-MM-dd");
          const bucket = trendMap[key];
          if (!bucket) return;
          bucket.total += feedback.waste_percent || 0;
          bucket.count += 1;
        });

        const realTrend: TrendPoint[] = Object.values(trendMap).map((bucket) => ({
          date: bucket.date,
          waste: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
        }));

        setMetrics({
          averageWaste,
          averageWasteTrend,
          topWastedDish: formattedDishes[0]?.dish || "-",
          topWastedWaste: formattedDishes[0]?.waste || 0,
          targetWaste,
          targetGap,
          targetGapTrend,
          totalSubmissions,
          todaySubmissions,
          submissionsTrend,
          hasYesterdayWaste: yesterdayWasteValues.length > 0,
          hasYesterdaySubmissions: yesterdaySubmissions > 0,
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
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Operations Overview
          </h2>
          <p className="text-muted-foreground mt-1 font-medium">
            Monitor waste patterns, target adherence, and dish-level performance across your ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <MetricCard
            title="Waste Avg"
            value={`${metrics.averageWaste}%`}
            icon={<TrendingDown className="w-5 h-5" />}
            trend={
              metrics.hasYesterdayWaste
                ? {
                    value: metrics.averageWasteTrend,
                    isPositive: metrics.averageWasteTrend <= 0,
                    direction: metrics.averageWasteTrend <= 0 ? "down" : "up",
                  }
                : undefined
            }
            subtitle="vs yesterday"
            color="primary"
          />
          <MetricCard
            title="Top Wasted"
            value={metrics.topWastedDish}
            icon={<TrendingUp className="w-5 h-5" />}
            subtitle={
              metrics.topWastedDish === "-"
                ? "No feedback yet"
                : `Avg ${metrics.topWastedWaste}% waste`
            }
            color="warning"
          />
          <MetricCard
            title="Target Gap"
            value={`${metrics.targetGap >= 0 ? "+" : ""}${metrics.targetGap}%`}
            icon={<Target className="w-5 h-5" />}
            trend={
              metrics.hasYesterdayWaste
                ? {
                    value: metrics.targetGapTrend,
                    isPositive: metrics.targetGapTrend >= 0,
                    direction: metrics.targetGapTrend >= 0 ? "up" : "down",
                  }
                : undefined
            }
            subtitle={`Against ${metrics.targetWaste}% threshold`}
            color="primary"
          />
          <MetricCard
            title="Participation"
            value={metrics.totalSubmissions.toString()}
            icon={<Users className="w-5 h-5" />}
            trend={
              metrics.hasYesterdaySubmissions
                ? {
                    value: metrics.submissionsTrend,
                    isPositive: metrics.submissionsTrend >= 0,
                    direction: metrics.submissionsTrend >= 0 ? "up" : "down",
                  }
                : undefined
            }
            subtitle={`${metrics.todaySubmissions} today`}
            color="primary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <ChartCard title="Waste Trend" subtitle="Last 7 days">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={wasteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(value) => `${value}%`} />
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

          <ChartCard title="Dish-wise Waste" subtitle="Average across all feedback">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dishWasteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dish" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any) => [`${value}%`, "Waste"]}
                />
                <Bar dataKey="waste" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mb-6 lg:mb-8">
          <ChartCard
            title="Dish Action Priority"
            subtitle="Simple ranking of dishes that need immediate attention"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={priorityData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis type="category" dataKey="dish" width={120} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "14px",
                  }}
                  formatter={(value: any, name: string) => {
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
              Action Score = 65% waste + 35% negative feedback. Higher score means higher intervention
              priority.
            </p>
          </ChartCard>
        </div>

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
                            row.waste > metrics.targetWaste
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
  trend?: { value: number; isPositive: boolean; direction: "up" | "down" };
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
        <div
          className={`w-12 h-12 lg:w-14 lg:h-14 rounded-[1rem] ${bgColor} flex items-center justify-center ${iconColor} shadow-inner`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              trend.isPositive ? "bg-primary/10 text-primary" : "bg-red-50 text-red-500"
            }`}
          >
            {trend.direction === "down" ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {formatTrendValue(trend.value)}%
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
