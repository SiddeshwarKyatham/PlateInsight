"use client";

import { Clock, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { createClient } from "../../../utils/supabase/client";
import { useRouter } from "next/navigation";

export default function PendingVerification() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 text-center"
      >
        <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
           <Clock className="w-10 h-10 text-warning" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3">Account Pending Review</h1>
        
        <p className="text-sm font-medium text-muted-foreground mb-8">
          Your staff account has been created successfully, but it requires administrator approval before you can access the dashboard. Please contact your system admin.
        </p>

        <button 
          onClick={handleSignOut}
          className="w-full py-3.5 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out Returning Later
        </button>
      </motion.div>
    </div>
  );
}
