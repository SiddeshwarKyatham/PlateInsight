import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { format, startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const { data: submissions, error: subErr } = await supabase
      .from('submissions')
      .select('id, created_at');

    if (subErr) throw subErr;

    const { data: feedback, error: fbErr } = await supabase
      .from('dish_feedback')
      .select('dish_name, waste_percent, sentiment');

    if (fbErr) throw fbErr;

    // Calculate basic analytics
    const totalSubmissions = submissions.length;
    let totalWaste = 0;
    const dishStats: Record<string, { count: number; totalWaste: number; negativeCount: number }> = {};

    feedback.forEach(f => {
      totalWaste += f.waste_percent;
      
      if (!dishStats[f.dish_name]) {
        dishStats[f.dish_name] = { count: 0, totalWaste: 0, negativeCount: 0 };
      }
      dishStats[f.dish_name].count++;
      dishStats[f.dish_name].totalWaste += f.waste_percent;
      if (f.sentiment === 'negative') {
        dishStats[f.dish_name].negativeCount++;
      }
    });

    const averageWaste = totalSubmissions > 0 ? Math.round(totalWaste / feedback.length) : 0;

    const dishWasteData = Object.entries(dishStats).map(([dish, stats]) => ({
      dish,
      waste: Math.round(stats.totalWaste / stats.count),
      negative: Math.round((stats.negativeCount / stats.count) * 100),
      complaint: "Various" // Placeholder until we fetch real complaints
    })).sort((a, b) => b.waste - a.waste);

    return NextResponse.json({
      metrics: {
        totalSubmissions,
        averageWaste,
        topWastedDish: dishWasteData[0]?.dish || "None",
        savingsToday: totalSubmissions * 4.3 // Mock ₹ value
      },
      dishWasteData
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
