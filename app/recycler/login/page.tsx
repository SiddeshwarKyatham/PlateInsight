"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Recycle } from "lucide-react";

export default function RecyclerLoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("Invalid recycler session.");

      const { data: profile, error: profileErr } = await supabase
        .from("recyclers")
        .select("id")
        .eq("id", userId)
        .single();
      if (profileErr || !profile) {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as a recycler.");
      }

      router.push("/recycler/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Recycle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Recycler Login</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">Access available waste tokens and claim pickups.</p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-semibold">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="pt-2 space-y-3">
            <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Login
            </button>
            <p className="text-sm text-center">
              New Recycler?{" "}
              <Link href="/recycler/signup" className="text-primary font-semibold hover:underline">Create account</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
