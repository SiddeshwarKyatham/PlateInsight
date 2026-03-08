"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, Calendar, FileCheck, Info, Loader2 } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

export default function MenuManagement() {
  const supabase = createClient();
  const [menuItems, setMenuItems] = useState([
    { id: 1, dishName: "", foodType: "veg" }
  ]);
  const [mealType, setMealType] = useState("lunch");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addDish = () => {
    setMenuItems([...menuItems, { id: Date.now(), dishName: "", foodType: "veg" }]);
  };

  const removeDish = (id: number) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter(item => item.id !== id));
    }
  };

  const updateDish = (id: number, field: string, value: string) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Get the current staff user's ecosystem_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('users')
        .select('ecosystem_id')
        .eq('id', user.id)
        .single();
        
      if (!profile?.ecosystem_id) throw new Error("No ecosystem assigned to this account.");

      // 2. Insert the meal session
      const { data: sessionData, error: sessionError } = await supabase
        .from('meal_sessions')
        .insert({
          ecosystem_id: profile.ecosystem_id,
          date,
          meal_type: mealType,
          status: 'approved',
          approved_by_admin: user.id,
          created_by_staff: user.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 3. Format and insert the menu items linked to this session
      const formattedItems = menuItems.map(item => ({
        ecosystem_id: profile.ecosystem_id,
        session_id: sessionData.id,
        dish_name: item.dishName,
        food_type: item.foodType
      }));

      const { error: itemsError } = await supabase
        .from('menu_items')
        .insert(formattedItems);

      if (itemsError) throw itemsError;

      setSuccess(true);
      
      // Reset form
      setMenuItems([{ id: Date.now(), dishName: "", foodType: "veg" }]);
      
    } catch (err: any) {
      setError(err.message || "Failed to submit menu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Menu Management</h2>
        <p className="text-muted-foreground mt-1 font-medium">Create meal sessions and publish live menus instantly.</p>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Info Banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 p-4 px-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-emerald-800">
            Menus created here are published immediately and available for QR scanning right away.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 font-medium text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-emerald-600 font-bold text-sm">
            Menu submitted and activated successfully. You can now generate the QR code.
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-gray-100">
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Session Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-700" 
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Meal Type</label>
              <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                {['breakfast', 'lunch', 'dinner'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                      mealType === type 
                        ? 'bg-white shadow-sm text-foreground' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Menu Items</h3>
              <button 
                type="button" 
                onClick={addDish}
                className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {menuItems.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-2 pl-4 rounded-xl border border-gray-200"
                >
                  <div className="font-bold text-gray-400 w-6">{index + 1}.</div>
                  
                  <input 
                    type="text" 
                    placeholder="E.g., Mixed Veg Sabzi"
                    value={item.dishName}
                    onChange={(e) => updateDish(item.id, 'dishName', e.target.value)}
                    className="flex-1 w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />

                  <select 
                    value={item.foodType}
                    onChange={(e) => updateDish(item.id, 'foodType', e.target.value)}
                    className="w-full sm:w-32 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shrink-0"
                  >
                    <option value="veg">Veg</option>
                    <option value="nonveg">Non-Veg</option>
                  </select>

                  <button 
                    type="button" 
                    onClick={() => removeDish(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    disabled={menuItems.length === 1}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              disabled={loading || menuItems.length === 0 || !menuItems[0].dishName}
              className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
              {loading ? "Publishing..." : "Publish Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
