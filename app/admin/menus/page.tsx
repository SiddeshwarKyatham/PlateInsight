"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Search, Clock, ChevronDown } from "lucide-react";

import { useEffect } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2 } from "lucide-react";

const supabase = createClient(); // module-level singleton

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('users').select('ecosystem_id').eq('id', user.id).single();
      if (!profile?.ecosystem_id) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('meal_sessions')
        .select(`
          id, 
          date, 
          meal_type, 
          status, 
          users!meal_sessions_created_by_staff_fkey(email),
          menu_items(id, dish_name, food_type)
        `)
        .eq('ecosystem_id', profile.ecosystem_id)
        .order('created_at', { ascending: false });

      if (data) {
        const formatted = data.map((session: any) => ({
          id: session.id,
          date: session.date,
          mealType: session.meal_type,
          staff: session.users?.email?.split('@')[0] || "Staff",
          status: session.status,
          items: session.menu_items.map((item: any) => ({
             id: item.id,
             name: item.dish_name,
             type: item.food_type
          }))
        }));
        setMenus(formatted);
        if (formatted.length > 0) setExpandedId(formatted[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();

    // Real-time: update list on any new/updated meal session
    const channel = supabase
      .channel('menus-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meal_sessions' },
        () => { fetchMenus(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meal_sessions' },
        () => { fetchMenus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Menu Monitor</h2>
          <p className="text-muted-foreground mt-1 font-medium">View published staff menus and session history.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search menus..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[1rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-12 flex flex-col items-center justify-center shadow-sm">
           <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
           <p className="text-muted-foreground font-medium">Loading menu sessions...</p>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 p-12 flex flex-col items-center justify-center text-center shadow-sm">
           <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
           <h3 className="text-xl font-bold text-foreground">No Menus Yet</h3>
           <p className="text-muted-foreground font-medium mt-2">Staff has not published any menu sessions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <Clock className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-bold text-foreground">Published Sessions ({menus.length})</h3>
          </div>

          <div className="divide-y divide-gray-50">
            {menus.map((menu) => (
              <div key={menu.id} className="transition-colors hover:bg-gray-50/50">
                {/* Accordion Header */}
                <button 
                  onClick={() => setExpandedId(expandedId === menu.id ? null : menu.id)}
                  className="w-full flex items-center justify-between p-5 lg:px-6 focus:outline-none"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold uppercase">
                      {menu.mealType[0]}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-foreground capitalize">{menu.mealType} Session</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                          menu.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {menu.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {menu.date} • Submitted by <span className="text-foreground">{menu.staff}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === menu.id ? 'rotate-180' : ''}`} />
                </button>

                {/* Accordion Content */}
                {expandedId === menu.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 lg:px-6 pb-6 pt-2 pl-24 pr-8 border-t border-gray-50">
                      <h5 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-4">Menu Items</h5>
                      <div className="bg-white border text-sm border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 mb-6">
                        {menu.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 px-4">
                            <span className="font-bold text-foreground">{item.name}</span>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${item.type === 'veg' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {item.type}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="text-right text-xs font-semibold text-gray-500">
                        Read-only: Staff publishes menus directly.
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
