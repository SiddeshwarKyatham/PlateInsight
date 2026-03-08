"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

type FoodRow = {
  id: string;
  token_id: string;
  ecosystem_name: string;
  food_description: string;
  quantity: string;
  location: string;
  pickup_deadline: string;
  created_at: string;
  claimed_at: string | null;
};

type NgoProfile = {
  id: string;
  organization_name: string;
  contact_person: string;
  city: string;
};

export default function NgoDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ngo, setNgo] = useState<NgoProfile | null>(null);
  const [availableFood, setAvailableFood] = useState<FoodRow[]>([]);
  const [pickedFood, setPickedFood] = useState<FoodRow[]>([]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/ngo/login");
        return;
      }

      const { data: ngoData, error: ngoErr } = await supabase
        .from("ngos")
        .select("id, organization_name, contact_person, city")
        .eq("id", user.id)
        .single();
      if (ngoErr || !ngoData) {
        throw new Error("NGO profile not found for this user.");
      }
      setNgo(ngoData as NgoProfile);

      const { data: available, error: availableErr } = await supabase
        .from("leftover_food")
        .select("id, token_id, ecosystem_name, food_description, quantity, location, pickup_deadline, created_at, claimed_at")
        .eq("status", "available")
        .order("pickup_deadline", { ascending: true });
      if (availableErr) throw availableErr;
      setAvailableFood((available || []) as FoodRow[]);

      const { data: picked, error: pickedErr } = await supabase
        .from("leftover_food")
        .select("id, token_id, ecosystem_name, food_description, quantity, location, pickup_deadline, created_at, claimed_at")
        .eq("status", "claimed")
        .eq("claimed_by", user.id)
        .order("claimed_at", { ascending: false });
      if (pickedErr) throw pickedErr;
      setPickedFood((picked || []) as FoodRow[]);
    } catch (err: any) {
      setError(err.message || "Failed to load NGO dashboard.");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/ngo/login");
        return;
      }

      const { error: claimErr } = await supabase
        .from("leftover_food")
        .update({
          status: "claimed",
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", rowId)
        .eq("status", "available");

      if (claimErr) throw claimErr;

      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to claim food.");
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/ngo/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Helping Hand NGO Dashboard</h1>
          {ngo && (
            <p className="text-sm text-muted-foreground">
              {ngo.organization_name} - {ngo.city}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Available Now</p>
            <p className="text-2xl font-bold mt-1">{availableFood.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Claimed By You</p>
            <p className="text-2xl font-bold mt-1">{pickedFood.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Portal</p>
            <p className="text-base font-semibold mt-1">Helping Hand</p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Available Food</h2>
            <p className="text-sm text-muted-foreground">Claim edible leftovers before pickup deadlines.</p>
          </div>

          {loading ? (
            <div className="py-10 text-muted-foreground flex items-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : availableFood.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available leftover food right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableFood.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      {item.token_id}
                    </span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">available</span>
                  </div>
                  <p className="font-bold text-foreground">{item.ecosystem_name}</p>
                  <p className="text-sm">{item.food_description}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Location: {item.location}</p>
                  <p className="text-sm text-muted-foreground">Pickup before: {new Date(item.pickup_deadline).toLocaleString()}</p>
                  <button
                    onClick={() => handleClaim(item.id)}
                    disabled={actionId === item.id}
                    className="mt-2 w-full py-2.5 bg-primary text-white rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {actionId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Claim Food
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Picked Food</h2>
            <p className="text-sm text-muted-foreground">History of food tokens your NGO has already claimed.</p>
          </div>

          {loading ? null : pickedFood.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claimed food yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pickedFood.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                      {item.token_id}
                    </span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">claimed</span>
                  </div>
                  <p className="font-bold text-foreground">{item.ecosystem_name}</p>
                  <p className="text-sm">{item.food_description}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Pickup before: {new Date(item.pickup_deadline).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    Claimed at: {new Date(item.claimed_at || item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
