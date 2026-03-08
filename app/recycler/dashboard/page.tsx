"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

type WasteRow = {
  id: string;
  token_id: string;
  ecosystem_name: string;
  waste_description: string;
  waste_type: string;
  quantity: string;
  pickup_location: string;
  pickup_deadline: string;
  created_at: string;
  claimed_at: string | null;
};

type RecyclerProfile = {
  id: string;
  company_name: string;
  contact_person: string;
  city: string;
};

export default function RecyclerDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recycler, setRecycler] = useState<RecyclerProfile | null>(null);
  const [availableWaste, setAvailableWaste] = useState<WasteRow[]>([]);
  const [claimedWaste, setClaimedWaste] = useState<WasteRow[]>([]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/recycler/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("recyclers")
        .select("id, company_name, contact_person, city")
        .eq("id", user.id)
        .single();
      if (profileErr || !profile) throw new Error("Recycler profile not found for this user.");
      setRecycler(profile as RecyclerProfile);

      const { data: available, error: availableErr } = await supabase
        .from("waste_collection_tokens")
        .select("id, token_id, ecosystem_name, waste_description, waste_type, quantity, pickup_location, pickup_deadline, created_at, claimed_at")
        .eq("status", "available")
        .order("pickup_deadline", { ascending: true });
      if (availableErr) throw availableErr;
      setAvailableWaste((available || []) as WasteRow[]);

      const { data: claimed, error: claimedErr } = await supabase
        .from("waste_collection_tokens")
        .select("id, token_id, ecosystem_name, waste_description, waste_type, quantity, pickup_location, pickup_deadline, created_at, claimed_at")
        .eq("status", "claimed")
        .eq("claimed_by_company", user.id)
        .order("claimed_at", { ascending: false });
      if (claimedErr) throw claimedErr;
      setClaimedWaste((claimed || []) as WasteRow[]);
    } catch (err: any) {
      setError(err.message || "Failed to load recycler dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleClaim = async (rowId: string) => {
    setActionId(rowId);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/recycler/login");
        return;
      }

      const { error: claimErr } = await supabase
        .from("waste_collection_tokens")
        .update({
          status: "claimed",
          claimed_by_company: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", rowId)
        .eq("status", "available");
      if (claimErr) throw claimErr;

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to claim waste.");
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/recycler/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waste2Resource Recycler Dashboard</h1>
          {recycler && <p className="text-sm text-muted-foreground">{recycler.company_name} - {recycler.city}</p>}
        </div>
        <button onClick={handleLogout} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Available Now</p>
            <p className="text-2xl font-bold mt-1">{availableWaste.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Claimed By You</p>
            <p className="text-2xl font-bold mt-1">{claimedWaste.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Portal</p>
            <p className="text-base font-semibold mt-1">Waste2Resource</p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Available Waste</h2>
            <p className="text-sm text-muted-foreground">Claim non-edible waste batches before pickup deadlines.</p>
          </div>
          {loading ? (
            <div className="py-10 text-muted-foreground flex items-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : availableWaste.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available waste tokens right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableWaste.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{item.token_id}</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">available</span>
                  </div>
                  <p className="font-bold text-foreground">{item.ecosystem_name}</p>
                  <p className="text-sm">{item.waste_description}</p>
                  <p className="text-sm text-muted-foreground">Waste Type: {item.waste_type}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Pickup Location: {item.pickup_location}</p>
                  <p className="text-sm text-muted-foreground">Pickup before: {new Date(item.pickup_deadline).toLocaleString()}</p>
                  <button
                    onClick={() => handleClaim(item.id)}
                    disabled={actionId === item.id}
                    className="mt-2 w-full py-2.5 bg-primary text-white rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {actionId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Claim Waste
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Claimed Waste</h2>
            <p className="text-sm text-muted-foreground">Track the waste collection tokens your company has accepted.</p>
          </div>
          {loading ? null : claimedWaste.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claimed waste yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {claimedWaste.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{item.token_id}</span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">claimed</span>
                  </div>
                  <p className="font-bold text-foreground">{item.ecosystem_name}</p>
                  <p className="text-sm">{item.waste_description}</p>
                  <p className="text-sm text-muted-foreground">Waste Type: {item.waste_type}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Pickup before: {new Date(item.pickup_deadline).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Claimed at: {new Date(item.claimed_at || item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
