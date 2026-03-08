"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { LayoutDashboard, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function CreateEcosystem() {
  const router = useRouter();
  const supabase = createClient();
  const [ecosystemName, setEcosystemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Execute the Postgres RPC function we wrote in supabase.sql
      // This handles the ecosystem insert, settings insert, and user update safely behind the RLS wall.
      const { data: ecosystemId, error: rpcError } = await supabase.rpc('create_ecosystem', {
        ecosystem_name: ecosystemName
      });

      if (rpcError) throw rpcError;

      // Force a session refresh and push directly to their new Admin Dashboard
      router.push("/admin/dashboard");
      router.refresh();

    } catch (err: any) {
      // If it throws a unique constraint error, let them know name is taken
      if (err.code === '23505' || err.message?.includes('violates unique constraint')) {
        setError("An ecosystem with this name already exists. Please pick a unique identifier.");
      } else {
        setError(err.message || "Failed to create ecosystem. Ensure you are signed into an unassigned account.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/5 shadow-inner">
             <LayoutDashboard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-center mt-2">Name Your Workspace</h1>
          <p className="text-sm font-medium text-slate-400 mt-2 text-center leading-relaxed">
            Give your ecosystem an identifiable name. This will represent your entire organization (e.g. "CMR College Mess").
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">Ecosystem Name</label>
            <input 
              type="text" 
              value={ecosystemName}
              onChange={(e) => setEcosystemName(e.target.value)}
              placeholder="e.g., IIT Hyderabad Mess 1"
              className="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-bold text-white placeholder:text-slate-600 text-lg"
              required
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading || ecosystemName.length < 3}
              className="w-full py-4 bg-primary text-slate-900 font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Launch PlateInsight"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
