"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Activity, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

function normalizeEcoInput(input: string): string {
  const value = input.trim();
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const fromUrl =
        url.searchParams.get("ecode")?.trim() ||
        url.searchParams.get("eco")?.trim();
      return fromUrl || "";
    } catch {
      return "";
    }
  }
  return value;
}

const ECO_CODE_RE = /^ECO-[A-Z0-9]{6}$/;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [role, setRole] = useState<"admin" | "staff">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ecosystemId, setEcosystemId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    const codeParam = searchParams.get("ecode");
    if (roleParam === "staff") setRole("staff");
    if (codeParam) setEcosystemId(codeParam);
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let targetEcosystemId: string | null = null;

      // For staff, validate ecosystem code BEFORE creating auth user to avoid orphan requests.
      if (role === "staff") {
        const normalizedEcoId = normalizeEcoInput(ecosystemId);
        const normalizedCode = normalizedEcoId.toUpperCase();
        if (!normalizedEcoId) {
          throw new Error("Invalid invite input. Paste Ecosystem Code or an invite URL containing ?ecode=...");
        }

        if (!ECO_CODE_RE.test(normalizedCode)) {
          throw new Error("Invalid Ecosystem Code format. Expected ECO-XXXXXX.");
        }

        const { data: resolvedEcoId, error: ecoError } = await supabase.rpc("resolve_ecosystem_id_by_code", {
          input_code: normalizedCode,
        });

        if (ecoError || !resolvedEcoId) {
          throw new Error("Invalid Ecosystem Code. Please verify with your admin.");
        }
        targetEcosystemId = resolvedEcoId as string;
      }

      // 1. Authenticate with Supabase Auth
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Check if we need email confirmation, or if sign in works
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        throw new Error("Account exists, please sign in."); 
      }
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (signInError) {
        throw new Error("Supabase requires Email Confirmation! Go to your Supabase Dashboard -> Authentication -> Providers -> Email, and turn OFF 'Confirm email', then try again.");
      }

      if (role === "admin") {
        // Admin onboarding: create ecosystem in step 2
        router.push("/create-ecosystem");
      } else {
        if (!targetEcosystemId) throw new Error("Missing target ecosystem. Please retry.");

        // Attach staff to selected ecosystem as pending verification
        const { error: profileError } = await supabase
          .from("users")
          .update({ role: "staff", verified: false, ecosystem_id: targetEcosystemId })
          .eq("id", signInData.user.id);

        if (profileError) throw profileError;

        router.push("/staff/pending");
      }

      router.refresh();
      
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 -left-64 w-96 h-96 bg-primary/5 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-0 -right-64 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
             <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-center mt-2">Create Your Account</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 text-center leading-relaxed">
            Sign up as an Admin to launch an ecosystem, or as Staff to join an existing one.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Role</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === "admin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Mess Manager (Admin)
              </button>
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                Mess Staff
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@college.edu"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          {role === "staff" && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Organization Ecosystem Code</label>
              <input
                type="text"
                value={ecosystemId}
                onChange={(e) => setEcosystemId(e.target.value)}
                placeholder="Paste ecosystem code (ECO-XXXXXX) or full URL"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-900 placeholder:text-slate-400"
                required={role === "staff"}
              />
            </div>
          )}
          
           <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Secure Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading || !email || !password || (role === "staff" && !ecosystemId.trim())}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : role === "admin" ? "Continue to Step 2" : "Create Staff Account"}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          Already have an organization? <Link href="/admin/login" className="text-primary font-bold hover:underline">Sign In Instead</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-sm text-slate-600">Loading signup...</div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
