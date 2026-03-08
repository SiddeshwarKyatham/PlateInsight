"use client";

import { motion } from "motion/react";
import { Search, Info, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2 } from "lucide-react";

export default function DishAnalytics() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Highlight stats
  const [topPerformer, setTopPerformer] = useState<any>(null);
  const [criticalDish, setCriticalDish] = useState<any>(null);

  useEffect(() => {
    const fetchDishData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: profile } = await supabase.from('users').select('ecosystem_id').eq('id', user.id).single();
        if (!profile?.ecosystem_id) { setLoading(false); return; }

      // Group and aggregate feedback data
      const { data, error } = await supabase
        .from('dish_feedback')
        .select('dish_name, food_type, waste_percent, sentiment')
        .eq('ecosystem_id', profile.ecosystem_id);

      if (data && data.length > 0) {
        const dishMap: Record<string, any> = {};

        data.forEach(item => {
          if (!dishMap[item.dish_name]) {
            dishMap[item.dish_name] = {
              name: item.dish_name,
              category: item.food_type || "General",
              totalWaste: 0,
              count: 0,
              positives: 0
            };
          }
          dishMap[item.dish_name].totalWaste += item.waste_percent;
          dishMap[item.dish_name].count += 1;
          if (item.sentiment === 'positive') {
             dishMap[item.dish_name].positives += 1;
          }
        });

        // Format into array
        let formattedDishes = Object.values(dishMap).map((d: any, index: number) => {
          const avgWaste = Math.round(d.totalWaste / d.count);
          return {
            id: index,
            name: d.name,
            category: d.category === 'veg' ? 'Veg' : d.category === 'nonveg' ? 'Non-Veg' : 'General',
            waste: avgWaste,
            costLoss: `₹${(avgWaste * 15).toLocaleString()}`, // Mock calculation
            status: avgWaste > 40 ? 'Critical' : avgWaste > 25 ? 'Warning' : 'Good',
            satisfaction: Math.round((d.positives / d.count) * 100)
          };
        });

        // Sort by worst waste first
        formattedDishes.sort((a, b) => b.waste - a.waste);

        setDishes(formattedDishes);

        // Find highlights
        if (formattedDishes.length > 0) {
           const mostWasted = formattedDishes.find(d => d.waste >= 40);
           if (mostWasted) setCriticalDish(mostWasted);
           
           // Sort for best
             const sortedByBest = [...formattedDishes].sort((a, b) => a.waste - b.waste);
             setTopPerformer(sortedByBest[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDishData();
  }, []);

  const filteredDishes = useMemo(() => {
    if (!searchQuery) return dishes;
    return dishes.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dishes, searchQuery]);
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Dish Analytics</h2>
          <p className="text-muted-foreground mt-1 font-medium">Deep dive into specific menu items performance.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search dishes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Stats & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {criticalDish ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-warning/10 rounded-[1.5rem] border border-warning/20 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-warning/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <h3 className="font-bold text-warning-foreground">Action Needed</h3>
              </div>
              <p className="text-sm font-medium text-warning-foreground/80 mb-4">
                <strong>{criticalDish.name}</strong> has a critical waste level of <strong>{criticalDish.waste}%</strong>.
              </p>
              <button className="w-full py-2.5 bg-white text-warning text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all">
                Review Recipe
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-50 rounded-[1.5rem] border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-gray-500" />
                </div>
                <h3 className="font-bold text-gray-700">No Critical Alerts</h3>
              </div>
              <p className="text-sm font-medium text-gray-500">
                All dishes are currently performing under the 40% waste warning threshold.
              </p>
            </motion.div>
          )}

          {topPerformer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-primary/10 rounded-[1.5rem] border border-primary/20 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-primary-foreground">Top Performer</h3>
              </div>
              <p className="text-sm font-medium text-primary-foreground/80 mb-4">
                <strong>{topPerformer.name}</strong> has the lowest waste footprint right now.
              </p>
              <div className="flex justify-between items-center text-sm font-bold text-primary">
                <span>Waste</span>
                <span>{topPerformer.waste}%</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Dish Data Table */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="lg:col-span-3 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground">Menu Performance Directory</h3>
            <button className="text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto p-1">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tl-xl border-b border-gray-100">Dish Name</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Category</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Waste %</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Lost Revenue</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tr-xl border-b border-gray-100">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400">
                      <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    </td>
                  </tr>
                ) : filteredDishes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                      No dish data available.
                    </td>
                  </tr>
                ) : filteredDishes.map((dish, i) => (
                  <motion.tr 
                    key={dish.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="border-b border-gray-50 last:border-0 hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-5 lg:px-6 py-5">
                      <div className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{dish.name}</div>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600">{dish.category}</span>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${dish.waste > 30 ? 'bg-warning' : 'bg-primary'}`} 
                            style={{ width: `${dish.waste}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-black text-foreground">{dish.waste}%</span>
                      </div>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <span className="font-black text-foreground">{dish.costLoss}</span>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <span className={`px-3 py-1.5 text-xs font-black rounded-lg uppercase tracking-wider ${
                        dish.status === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                        dish.status === 'Warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {dish.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
