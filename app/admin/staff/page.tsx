"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, CheckCircle2, ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

const supabase = createClient(); // module-level singleton

export default function StaffDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersFallback = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from("users")
      .select("ecosystem_id")
      .eq("id", user.id)
      .single();

    let ecoId = profile?.ecosystem_id as string | null;
    if (!ecoId) {
      const { data: byCreator } = await supabase
        .from("ecosystems")
        .select("id")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ecoId = byCreator?.id || null;
    }
    if (!ecoId) return [];

    const { data: staffRows, error: staffError } = await supabase
      .from("users")
      .select("id, email, verified, ecosystem_id, created_at")
      .eq("role", "staff")
      .eq("ecosystem_id", ecoId)
      .order("created_at", { ascending: false });

    if (staffError) throw new Error(staffError.message || "Fallback staff query failed");
    return staffRows || [];
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("get_staff_requests");
      if (error) {
        // Fallback path for environments where RPC is not yet deployed.
        const fallbackRows = await fetchUsersFallback();
        setUsers(fallbackRows);
        return;
      }
      const rpcRows = (data as any[]) || [];
      if (rpcRows.length === 0) {
        const fallbackRows = await fetchUsersFallback();
        setUsers(fallbackRows);
      } else {
        setUsers(rpcRows);
      }
    } catch (err) {
      const raw = (() => {
        try {
          return JSON.stringify(err);
        } catch {
          return String(err);
        }
      })();
      const message =
        err instanceof Error
          ? err.message
          : raw && raw !== "{}"
            ? raw
            : "Failed to load staff requests. Please refresh.";
      console.error("StaffDirectory fetch error:", message, err);
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('admin-staff-directory')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, () => fetchUsers())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleVerification = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic update
    setUsers(users.map(u => u.id === id ? { ...u, verified: newStatus } : u));
    
    const { error } = await supabase.rpc("set_staff_verification", {
      staff_user_id: id,
      new_status: newStatus,
    });
    if (error) {
      try {
        // Fallback update path
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: profile } = await supabase
          .from("users")
          .select("ecosystem_id")
          .eq("id", user.id)
          .single();
        if (!profile?.ecosystem_id) throw new Error("Admin ecosystem not found");

        const { error: updateError } = await supabase
          .from("users")
          .update({ verified: newStatus, ecosystem_id: profile.ecosystem_id })
          .eq("id", id);
        if (updateError) throw new Error(updateError.message || "Fallback verification update failed");
      } catch (fallbackErr: any) {
        setError(fallbackErr?.message || error.message || "Failed to update staff verification.");
      } finally {
        fetchUsers();
      }
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Staff Directory</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage mess incharges and their portal access.</p>
        </div>
        
        <button 
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}
        <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Users className="w-5 h-5 text-primary" />
             <h3 className="text-lg font-bold text-foreground">Registered Staff Accounts</h3>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{users.length} Total</span>
             <span className="text-xs font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-full border border-warning/20">{users.filter(u => !u.verified).length} Pending</span>
           </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
             <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">
            No staff accounts found. Have them sign up at /staff/login.
          </div>
        ) : (
          <div className="overflow-x-auto p-1">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tl-xl border-b border-gray-100">Staff Account</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Registered Date</th>
                  <th className="text-left px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-gray-100">Status</th>
                  <th className="text-right px-5 lg:px-6 py-5 text-xs font-black text-muted-foreground uppercase tracking-widest rounded-tr-xl border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-inner uppercase">
                          {user.email.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{user.email}</div>
                          <span className="text-xs font-bold text-gray-400">ID: {user.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      <span className="text-sm font-medium text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 lg:px-6 py-5">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
                           <ShieldAlert className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 lg:px-6 py-5 text-right">
                      <button 
                        onClick={() => toggleVerification(user.id, user.verified)}
                        className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                          user.verified 
                            ? "text-red-500 hover:bg-red-50" 
                            : "bg-primary text-white hover:shadow-lg hover:shadow-primary/20"
                        }`}
                      >
                        {user.verified ? "Revoke Access" : "Approve Staff"}
                      </button>
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
