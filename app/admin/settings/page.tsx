"use client";
// Bug #1 FIXED: supabase singleton at module scope prevents stale closure in useCallback

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Settings, Bell, Lock, Users, Save, Globe, Loader2, CheckCircle2, Copy } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

const supabase = createClient(); // module-level singleton — stable reference

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    messName: "",
    adminEmail: "",
    wasteThreshold: 20
  });

  const [ecoId, setEcoId] = useState<string | null>(null);
  const [ecoCode, setEcoCode] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [schemaHint, setSchemaHint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single();
      const { data: adminEco, error: adminEcoError } = await supabase.rpc("get_admin_ecosystem");
      if (adminEcoError || !adminEco) { setLoading(false); return; }
      const ecoRow = Array.isArray(adminEco) ? adminEco[0] : adminEco;
      if (!ecoRow?.ecosystem_id) { setLoading(false); return; }
      const activeEcoId = ecoRow.ecosystem_id as string;
      setEcoId(activeEcoId);
      const ecosystem = {
        name: (ecoRow.ecosystem_name as string) || "My Organization",
        ecosystem_code: (ecoRow.ecosystem_code as string) || null,
      };

      setSchemaHint(null);
      const { data: settings } = await supabase.from('system_settings').select('waste_threshold').eq('ecosystem_id', activeEcoId).single();
      setEcoCode(ecosystem?.ecosystem_code || null);

      setFormData({
        messName: ecosystem?.name || "My Organization",
        adminEmail: profile?.email || "",
        wasteThreshold: settings?.waste_threshold || 20
      });

    } catch (err) {
       const message = String((err as any)?.message || "");
       if (message.toLowerCase().includes("ecosystem_code")) {
         setSchemaHint("Database is missing ecosystem_code. Run ecosystem_code_migration.sql once in Supabase SQL editor.");
       }
       console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!ecoId) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      // Update Ecosystem Name
      const { error: ecoError } = await supabase.from('ecosystems').update({ name: formData.messName }).eq('id', ecoId);
      if (ecoError) throw ecoError;
      
      // Update Settings
      const { error: settingsError } = await supabase.from('system_settings').update({ waste_threshold: formData.wasteThreshold }).eq('ecosystem_id', ecoId);
      if (settingsError) throw settingsError;
      
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch(err: any) {
      console.error(err);
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }
  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Admin Settings</h2>
        <p className="text-muted-foreground mt-1 font-medium">Configure application preferences and permissions.</p>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {schemaHint && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-700 text-sm font-semibold">
            {schemaHint}
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-2 lg:px-6 pt-2 overflow-x-auto overflow-y-hidden">
          <button 
            onClick={() => setActiveTab("general")}
            className={`px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            General Settings
          </button>
          <button 
            onClick={() => setActiveTab("notifications")}
            className={`px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'notifications' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Notifications
          </button>
          <button 
            onClick={() => setActiveTab("ai")}
            className={`px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'ai' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            AI Configuration
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-6 lg:p-8 space-y-8">
          
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              <motion.section 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Globe className="w-5 h-5 text-primary" /></div>
              <h3 className="text-lg font-bold text-foreground">Mess Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Mess Name (Organization)</label>
                <input 
                  type="text" 
                  value={formData.messName}
                  onChange={(e) => setFormData({...formData, messName: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Admin Account Email</label>
                <input 
                  type="email" 
                  disabled
                  value={formData.adminEmail}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-500 cursor-not-allowed" 
                />
                <p className="text-xs text-gray-400 mt-1">Managed via Supabase Auth</p>
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2 mt-2">
                <label className="text-sm font-bold text-muted-foreground">Ecosystem Code <span className="text-primary">(Share with your Staff)</span></label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={ecoCode || ""}
                    className="flex-1 px-4 py-3 bg-white border-2 border-primary/20 rounded-xl font-mono text-base font-bold text-foreground cursor-text focus:outline-none" 
                  />
                  <button
                    type="button"
                    title="Copy Ecosystem Code"
                    onClick={() => {
                        if (ecoCode) { 
                            navigator.clipboard.writeText(ecoCode); 
                            alert("Ecosystem Code copied to clipboard!"); 
                        }
                    }}
                    className="px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <Copy className="w-5 h-5 mx-auto" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 font-medium">New staff members must paste this exact code when registering.</p>
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2 mt-1">
                <label className="text-sm font-bold text-muted-foreground">Staff Signup Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={ecoCode && baseUrl ? `${baseUrl}/signup?role=staff&ecode=${ecoCode}` : ""}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm font-bold text-foreground cursor-text focus:outline-none"
                  />
                  <button
                    type="button"
                    title="Copy Staff Signup Link"
                    onClick={() => {
                      if (ecoCode && baseUrl) {
                        navigator.clipboard.writeText(`${baseUrl}/signup?role=staff&ecode=${ecoCode}`);
                        alert("Staff signup link copied!");
                      }
                    }}
                    className="px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <Copy className="w-5 h-5 mx-auto" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 font-medium">Share this link directly. Do not share the plain homepage URL.</p>
              </div>
            </div>
          </motion.section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg"><Bell className="w-5 h-5 text-warning" /></div>
              <h3 className="text-lg font-bold text-foreground">Alerts & Targets</h3>
            </div>
            <div className="pl-12 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">Waste Threshold Alert</h4>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Notify admin if average waste exceeds target.</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              
              <div className="space-y-2 max-w-sm">
                <label className="text-sm font-bold text-muted-foreground">Target Daily Waste %</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={formData.wasteThreshold}
                    onChange={(e) => setFormData({...formData, wasteThreshold: parseInt(e.target.value) || 0})}
                    className="w-24 px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                  />
                  <span className="font-bold text-foreground text-lg">%</span>
                </div>
              </div>
              </div>
            </motion.section>

            <hr className="border-gray-100" />

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-between items-center gap-4 pt-4"
            >
              <div>
                {successMsg && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fetchSettings()}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
          )}

          {/* Notifications Tab Placeholder */}
          {activeTab === 'notifications' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                 <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-gray-500">Notification Settings</h3>
                 <p className="text-gray-400 font-medium">Configure push and email alerts. (Coming soon)</p>
             </motion.div>
          )}

          {/* AI Settings Tab Placeholder */}
          {activeTab === 'ai' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                 <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-gray-500">Gemini Vision AI Configurations</h3>
                 <p className="text-gray-400 font-medium">Fine-tune detection sensitivity. (Coming soon)</p>
             </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
