"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Loader2, PackageCheck, PlusCircle } from "lucide-react";

type LeftoverRow = {
  id: string;
  token_id: string;
  ecosystem_name: string;
  food_description: string;
  quantity: string;
  location: string;
  pickup_deadline: string;
  status: "available" | "claimed";
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
};

export default function StaffLeftoverFoodPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [ecosystemId, setEcosystemId] = useState<string>("");
  const [ecosystemName, setEcosystemName] = useState<string>("");
  const [rows, setRows] = useState<LeftoverRow[]>([]);
  const [ngoNames, setNgoNames] = useState<Record<string, string>>({});

  const [foodDescription, setFoodDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [pickupDeadline, setPickupDeadline] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Please login again.");
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileErr } = await supabase
        .from("users")
        .select("ecosystem_id")
        .eq("id", user.id)
        .single();
      if (profileErr || !profile?.ecosystem_id) {
        throw new Error("Staff ecosystem not found.");
      }

      setEcosystemId(profile.ecosystem_id);

      const { data: eco, error: ecoErr } = await supabase
        .from("ecosystems")
        .select("name")
        .eq("id", profile.ecosystem_id)
        .single();
      if (ecoErr || !eco?.name) {
        throw new Error("Ecosystem details not found.");
      }
      setEcosystemName(eco.name);

      const { data, error: rowsErr } = await supabase
        .from("leftover_food")
        .select("id, token_id, ecosystem_name, food_description, quantity, location, pickup_deadline, status, claimed_by, claimed_at, created_at")
        .eq("created_by_staff", user.id)
        .order("created_at", { ascending: false });
      if (rowsErr) throw rowsErr;

      const typedRows = (data || []) as LeftoverRow[];
      setRows(typedRows);

      const ngoIds = Array.from(new Set(typedRows.map((r) => r.claimed_by).filter(Boolean))) as string[];
      if (ngoIds.length > 0) {
        const { data: ngoData } = await supabase
          .from("ngos")
          .select("id, organization_name")
          .in("id", ngoIds);
        const mapped: Record<string, string> = {};
        (ngoData || []).forEach((n: any) => {
          mapped[n.id] = n.organization_name;
        });
        setNgoNames(mapped);
      } else {
        setNgoNames({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load leftover tokens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!userId || !ecosystemId || !ecosystemName) {
        throw new Error("Missing staff context. Refresh and try again.");
      }

      const { error: insertErr } = await supabase.from("leftover_food").insert({
        ecosystem_id: ecosystemId,
        ecosystem_name: ecosystemName,
        food_description: foodDescription.trim(),
        quantity: quantity.trim(),
        location: location.trim(),
        pickup_deadline: new Date(pickupDeadline).toISOString(),
        status: "available",
        created_by_staff: userId,
      });

      if (insertErr) throw insertErr;

      setFoodDescription("");
      setQuantity("");
      setLocation("");
      setPickupDeadline("");
      setSuccess("Leftover token raised successfully.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to raise leftover token.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Helping Hand</h2>
        <p className="text-sm text-muted-foreground mt-1">Raise edible leftover food tokens for NGO pickup.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Raise Leftover Food</h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Food Description</label>
            <input
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              placeholder="Rice + Dal"
              required
              className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Quantity</label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="30 plates"
              required
              className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Pickup Deadline</label>
            <input
              type="datetime-local"
              value={pickupDeadline}
              onChange={(e) => setPickupDeadline(e.target.value)}
              required
              className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mess Hall Block A"
              required
              className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Raise Leftover Food
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {success && <p className="text-sm text-emerald-600 mt-3">{success}</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 lg:p-6">
        <h3 className="text-lg font-bold mb-4">My Raised Tokens</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tokens...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leftover food tokens raised yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((row) => (
              <div key={row.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                    {row.token_id}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      row.status === "available" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="font-semibold text-foreground">{row.food_description}</p>
                <p className="text-sm text-muted-foreground">Quantity: {row.quantity}</p>
                <p className="text-sm text-muted-foreground">Location: {row.location}</p>
                <p className="text-sm text-muted-foreground">
                  Pickup before: {new Date(row.pickup_deadline).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Claimed by: {row.claimed_by ? ngoNames[row.claimed_by] || row.claimed_by : "Not claimed"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
