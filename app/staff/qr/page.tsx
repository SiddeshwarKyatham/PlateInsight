"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, ScanLine, Clock, Loader2 } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import { format } from 'date-fns';

const supabase = createClient(); // module-level singleton

export default function QRGenerator() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [ecosystemId, setEcosystemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const qrRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchActiveSession = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from('users').select('ecosystem_id').eq('id', user.id).single();
      if (profile?.ecosystem_id) {
         setEcosystemId(profile.ecosystem_id);
         
         const today = format(new Date(), 'yyyy-MM-dd');

         // Find the most recently submitted APPOVED session for today
         const { data: session } = await supabase
           .from('meal_sessions')
           .select('*')
           .eq('ecosystem_id', profile.ecosystem_id)
           .eq('date', today)
           .eq('status', 'approved')
           .order('created_at', { ascending: false })
           .limit(1)
           .single();
           
         if (session) setActiveSession(session);
      }
      setLoading(false);
    };
    fetchActiveSession();
  }, []);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  // The crucial multi-tenant routing link!
  const qrLink = activeSession
    ? `${baseUrl}/student/welcome?eco=${ecosystemId}&session=${activeSession.id}&meal=${activeSession.meal_type}`
    : "";

  const downloadQR = () => {
    if (!qrRef.current || !activeSession) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40; // Add padding
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `plateinsight-${activeSession.meal_type}-qr.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const shareLink = async () => {
    if (!qrLink) return;
    // Bug #6 FIXED: Implement Share Link using Web Share API with clipboard fallback
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PlateInsight — ${activeSession?.meal_type} Session`,
          text: "Scan this link to submit your plate feedback",
          url: qrLink,
        });
      } catch (err) {
        console.log("Share cancelled or failed, falling back to clipboard", err);
      }
    } else {
      await navigator.clipboard.writeText(qrLink);
      alert("Session link copied to clipboard!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Session Display QR</h2>
        <p className="text-muted-foreground mt-1 font-medium">Generate and display the entry QR code for the active meal session.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: QR Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center justify-center min-h-[400px]"
        >
          {loading ? (
             <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
               <Loader2 className="w-12 h-12 opacity-50 animate-spin" />
               <p className="font-bold">Checking sessions...</p>
             </div>
          ) : activeSession ? (
            <>
              <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Session Active
              </div>

              <div 
                ref={qrRef}
                className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-gray-50 relative group"
              >
                <QRCodeSVG 
                  value={qrLink} 
                  size={240}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                />
                
                {/* Decorative scanning line animation */}
                <motion.div 
                  className="absolute inset-x-6 h-1 bg-primary/50 shadow-[0_0_15px_bg-primary] blur-[1px] rounded-full z-10"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <p className="mt-8 text-sm font-bold text-gray-400 capitalize bg-gray-50 px-4 py-2 rounded-lg">
                Date: {activeSession.date} • {activeSession.meal_type}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
              <Clock className="w-16 h-16 opacity-50" />
              <p className="font-bold text-lg">No Active Session</p>
              <p className="text-sm font-medium max-w-[250px]">Create a menu for today from Menu Management and it will appear here instantly.</p>
            </div>
          )}
        </motion.div>

        {/* Right Col: Controls */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6 space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Next Steps</h3>
                <p className="text-sm font-medium text-muted-foreground">Download or share this QR code to grant student access.</p>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-50">
              <button 
                onClick={downloadQR}
                disabled={!activeSession}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>
              
              <button 
                onClick={shareLink}
                disabled={!activeSession}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5" />
                Share Link
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Entry URL Embedded in QR</p>
              <div className="text-sm font-medium text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200 break-all select-all">
                {qrLink || "Awaiting session approval..."}
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
