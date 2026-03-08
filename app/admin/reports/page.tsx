// Bug #8 FIXED: Reports page now fetches real data and generates downloadable CSVs
"use client";

import { motion } from "motion/react";
import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import Papa from "papaparse";
import jsPDF from "jspdf";

const supabase = createClient(); // module-level singleton

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [ecoId, setEcoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: profile } = await supabase
          .from("users")
          .select("ecosystem_id")
          .eq("id", user.id)
          .single();

        if (!profile?.ecosystem_id) { setLoading(false); return; }
        setEcoId(profile.ecosystem_id);

        // Fetch all dish feedback
        const { data: feedback } = await supabase
          .from("dish_feedback")
          .select("dish_name, food_type, waste_percent, sentiment, reason, created_at")
          .eq("ecosystem_id", profile.ecosystem_id)
          .order("created_at", { ascending: false });

        // Fetch all submissions
        const { data: subs } = await supabase
          .from("submissions")
          .select("device_id, meal_type, image_url, created_at")
          .eq("ecosystem_id", profile.ecosystem_id)
          .order("created_at", { ascending: false });

        setFeedbackData(feedback || []);
        setSubmissionsData(subs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const downloadCSV = (filename: string, rows: object[]) => {
    if (rows.length === 0) { alert("No data available to export."); return; }
    const csvContent = Papa.unparse(rows);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadPDF = (filename: string, title: string, rows: object[]) => {
    if (rows.length === 0) { alert("No data available to export."); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    let y = 50;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = 520;

    doc.setFontSize(16);
    doc.text(title, marginX, y);
    y += 24;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
    y += 20;

    const lines = rows.map((row, i) => `${i + 1}. ${JSON.stringify(row)}`);
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, maxLineWidth);
      for (const part of wrapped) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(part, marginX, y);
        y += 14;
      }
    }
    doc.save(filename);
  };

  const generateDishReport = async () => {
    setGenerating("dish");
    // Aggregate dish data
    const dishMap: Record<string, { total: number; count: number; positives: number; negatives: number }> = {};
    feedbackData.forEach(fb => {
      if (!dishMap[fb.dish_name]) dishMap[fb.dish_name] = { total: 0, count: 0, positives: 0, negatives: 0 };
      dishMap[fb.dish_name].total += fb.waste_percent;
      dishMap[fb.dish_name].count += 1;
      if (fb.sentiment === "positive") dishMap[fb.dish_name].positives++;
      if (fb.sentiment === "negative") dishMap[fb.dish_name].negatives++;
    });

    const rows = Object.entries(dishMap).map(([dish, d]) => ({
      "Dish Name": dish,
      "Avg Waste %": Math.round(d.total / d.count),
      "Total Feedbacks": d.count,
      "Positive": d.positives,
      "Negative": d.negatives,
      "Satisfaction %": Math.round((d.positives / d.count) * 100),
    })).sort((a, b) => b["Avg Waste %"] - a["Avg Waste %"]);

    downloadCSV(`plateinsight_dish_report_${new Date().toISOString().split("T")[0]}.csv`, rows);
    setGenerating(null);
  };

  const generateFeedbackReport = async () => {
    setGenerating("feedback");
    const rows = feedbackData.map(fb => ({
      "Dish Name": fb.dish_name,
      "Food Type": fb.food_type,
      "Waste %": fb.waste_percent,
      "Sentiment": fb.sentiment,
      "Reason": fb.reason || "",
      "Date": new Date(fb.created_at).toLocaleDateString(),
      "Time": new Date(fb.created_at).toLocaleTimeString(),
    }));
    downloadCSV(`plateinsight_feedback_report_${new Date().toISOString().split("T")[0]}.csv`, rows);
    setGenerating(null);
  };

  const generateSubmissionsReport = async () => {
    setGenerating("submissions");
    const rows = submissionsData.map(sub => ({
      "Meal Type": sub.meal_type,
      "Device ID": sub.device_id,
      "Date": new Date(sub.created_at).toLocaleDateString(),
      "Time": new Date(sub.created_at).toLocaleTimeString(),
    }));
    downloadCSV(`plateinsight_submissions_report_${new Date().toISOString().split("T")[0]}.csv`, rows);
    setGenerating(null);
  };

  const generateDishPdf = async () => {
    setGenerating("dish-pdf");
    const dishMap: Record<string, { total: number; count: number; positives: number; negatives: number }> = {};
    feedbackData.forEach(fb => {
      if (!dishMap[fb.dish_name]) dishMap[fb.dish_name] = { total: 0, count: 0, positives: 0, negatives: 0 };
      dishMap[fb.dish_name].total += fb.waste_percent;
      dishMap[fb.dish_name].count += 1;
      if (fb.sentiment === "positive") dishMap[fb.dish_name].positives++;
      if (fb.sentiment === "negative") dishMap[fb.dish_name].negatives++;
    });
    const rows = Object.entries(dishMap).map(([dish, d]) => ({
      "Dish Name": dish,
      "Avg Waste %": Math.round(d.total / d.count),
      "Total Feedbacks": d.count,
      "Positive": d.positives,
      "Negative": d.negatives,
      "Satisfaction %": Math.round((d.positives / d.count) * 100),
    }));
    downloadPDF(`plateinsight_dish_report_${new Date().toISOString().split("T")[0]}.pdf`, "Dish Performance Report", rows);
    setGenerating(null);
  };

  const generateFeedbackPdf = async () => {
    setGenerating("feedback-pdf");
    const rows = feedbackData.map(fb => ({
      "Dish Name": fb.dish_name,
      "Food Type": fb.food_type,
      "Waste %": fb.waste_percent,
      "Sentiment": fb.sentiment,
      "Reason": fb.reason || "",
      "Date": new Date(fb.created_at).toLocaleDateString(),
      "Time": new Date(fb.created_at).toLocaleTimeString(),
    }));
    downloadPDF(`plateinsight_feedback_report_${new Date().toISOString().split("T")[0]}.pdf`, "Student Feedback Report", rows);
    setGenerating(null);
  };

  const generateSubmissionsPdf = async () => {
    setGenerating("submissions-pdf");
    const rows = submissionsData.map(sub => ({
      "Meal Type": sub.meal_type,
      "Device ID": sub.device_id,
      "Date": new Date(sub.created_at).toLocaleDateString(),
      "Time": new Date(sub.created_at).toLocaleTimeString(),
      "Image URL": sub.image_url || "",
    }));
    downloadPDF(`plateinsight_submissions_report_${new Date().toISOString().split("T")[0]}.pdf`, "Submission Report", rows);
    setGenerating(null);
  };

  const reportTypes = [
    {
      id: "dish",
      title: "Dish Performance Report",
      desc: "Avg waste %, satisfaction score per dish",
      color: "bg-primary/10 text-primary",
      count: `${Object.keys(feedbackData.reduce((acc: any, fb) => { acc[fb.dish_name] = 1; return acc; }, {})).length} dishes`,
      action: generateDishReport,
    },
    {
      id: "feedback",
      title: "Student Feedback Log",
      desc: "All individual feedback entries with reasons",
      color: "bg-blue-50 text-blue-500",
      count: `${feedbackData.length} entries`,
      action: generateFeedbackReport,
    },
    {
      id: "submissions",
      title: "Submission History",
      desc: "All plate submissions with meal type & date",
      color: "bg-warning/10 text-warning",
      count: `${submissionsData.length} submissions`,
      action: generateSubmissionsReport,
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Reports & Exports</h2>
          <p className="text-muted-foreground mt-1 font-medium">Download real data as CSV for presentations and audits.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-16 flex justify-center items-center shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportTypes.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${report.color}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{report.title}</h3>
                <p className="text-sm font-medium text-muted-foreground mb-4">{report.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {report.count}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={report.action}
                      disabled={generating !== null}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generating === report.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      CSV
                    </button>
                    <button
                      onClick={
                        report.id === "dish"
                          ? generateDishPdf
                          : report.id === "feedback"
                            ? generateFeedbackPdf
                            : generateSubmissionsPdf
                      }
                      disabled={generating !== null}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generating === `${report.id}-pdf`
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileText className="w-4 h-4" />}
                      PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-foreground">Data Summary</h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">Overview of available data for export.</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {[
                { label: "Total Submissions", value: submissionsData.length },
                { label: "Feedback Entries", value: feedbackData.length },
                {
                  label: "Unique Dishes",
                  value: Object.keys(
                    feedbackData.reduce((acc: any, fb) => { acc[fb.dish_name] = 1; return acc; }, {})
                  ).length
                },
              ].map((stat) => (
                <div key={stat.label} className="p-6 text-center">
                  <div className="text-3xl font-black text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
