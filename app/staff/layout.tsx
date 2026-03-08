"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  QrCode, 
  MessageSquareHeart, 
  HandHeart,
  Recycle,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/staff/dashboard" },
  { icon: UtensilsCrossed, label: "Menu Management", href: "/staff/menu" },
  { icon: QrCode, label: "QR Generator", href: "/staff/qr" },
  { icon: MessageSquareHeart, label: "Dish Feedback", href: "/staff/feedback" },
  { icon: HandHeart, label: "Helping Hand", href: "/staff/leftover-food" },
  { icon: Recycle, label: "Waste2Resource", href: "/staff/waste-collection" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("Staff");

  useEffect(() => {
    const fetchUser = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (user?.email) {
          setUserEmail(user.email);
       }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                PlateInsight
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Staff Portal</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-[1rem] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
             onClick={handleLogout}
             className="flex items-center gap-3 px-4 py-3.5 w-full rounded-[1rem] text-red-500 hover:bg-red-50 hover:text-red-600 font-medium transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5" />
            <span>Staff Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-foreground rounded-xl lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold hidden sm:block text-foreground tracking-tight">
              {navItems.find((item) => item.href === pathname)?.label || "Staff Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-foreground">{userEmail.split('@')[0]}</div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">Mess Incharge</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner uppercase">
                {userEmail.substring(0, 2)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
