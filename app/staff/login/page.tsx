"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { UtensilsCrossed, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

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

export default function StaffLogin() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Registration specific state
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedEco, setSelectedEco] = useState<string>("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Middleware handles the verification redirect! 
      // We just need to route them to the dashboard, and middleware will bounce them to /staff/pending if not verified.
      router.push("/staff/dashboard");
      router.refresh();
      
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEcoId = normalizeEcoInput(selectedEco);
    const normalizedCode = normalizedEcoId.toUpperCase();
    if (!normalizedEcoId) {
      setError("Invalid invite input. Paste Ecosystem Code or invite URL containing ?ecode=...");
      setLoading(false);
      return;
    }

    if (!ECO_CODE_RE.test(normalizedCode)) {
      setError("Invalid Ecosystem Code format. Expected ECO-XXXXXX.");
      setLoading(false);
      return;
    }

    try {
      const { data: resolvedEcoId, error: ecoError } = await supabase.rpc('resolve_ecosystem_id_by_code', {
        input_code: normalizedCode,
      });

      if (ecoError || !resolvedEcoId) {
        setError("Invalid Ecosystem Code. Please check with your Admin.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Ensure we are authenticated for RLS-protected self-update.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw new Error("Account created but sign-in failed. Please login once and try again.");
      }

      // Attach this staff account to the target ecosystem with retry to handle trigger delay.
      if (data.user) {
        let attached = false;
        let lastError: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'staff', verified: false, ecosystem_id: resolvedEcoId as string })
            .eq('id', data.user.id);

          if (!updateError) {
            attached = true;
            break;
          }

          lastError = updateError.message || "Failed to attach ecosystem.";
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        if (!attached) {
          throw new Error(lastError || "Failed to link staff account to ecosystem.");
        }
      }

      alert("Registration successful! You will need admin approval before accessing the dashboard.");
      router.push("/staff/pending");
      router.refresh();

    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
             <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Staff Portal</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1 text-center">Manage meal sessions, generate QR codes, and monitor feedback.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={isRegistering ? handleSignUp : handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mess.incharge@plateinsight.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-900"
              required
            />
          </div>
          
            <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-900"
              required
            />
          </div>

          {isRegistering && (
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-foreground">Organization Ecosystem Code</label>
              <input
                type="text"
                value={selectedEco}
                onChange={(e) => setSelectedEco(e.target.value)}
                placeholder="Paste ecosystem code (ECO-XXXXXX) or full URL"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-900 font-mono text-sm"
                required={isRegistering}
              />
              <p className="text-xs text-muted-foreground mt-1">Ask your admin for the unique Ecosystem Code from settings.</p>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {isRegistering ? (
              <>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(null); }}
                  className="w-full py-3.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsRegistering(true); setError(null); }}
                  className="w-full py-3.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Create Staff Account
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
