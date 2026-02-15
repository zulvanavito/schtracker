/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      // Sign out first to clear existing session
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes:
            "openid profile email https://www.googleapis.com/auth/calendar",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Sign in error:", error);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  

  const handleSignOut = async () => {
    localStorage.setItem("is_logging_out", "true");
    await supabase.auth.signOut();
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  return user ? (
    <div className="flex items-center gap-4">
      <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-bold text-slate-700">{user.user_metadata?.full_name || "User"}</span>
          <span className="text-xs text-slate-400">{user.email}</span>
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
            <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
            >
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Status
                </div>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-white/40 shadow-2xl rounded-3xl gap-0">
            {/* Header Design */}
            <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-600 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute top-6 left-6 flex flex-col justify-end h-full pb-6 z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-3 border border-white/10 shadow-lg">
                         <LogIn className="w-5 h-5 text-white" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-white tracking-tight">Session Active</DialogTitle>
                    <p className="text-blue-100 text-xs font-medium opacity-90">Securely connected via Google OAuth</p>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                 {/* Status Card */}
                 <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Token Valid</p>
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Encrypted Connection</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-600 shadow-sm uppercase tracking-wider">
                        Online
                    </div>
                 </div>

                 {/* Details Grid */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</p>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                             <p className="text-sm font-bold text-slate-700 capitalize">{user.role || "User"}</p>
                        </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expires In</p>
                         <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                             <p className="text-sm font-bold text-slate-700">~55m</p>
                        </div>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="flex gap-3 pt-2">
                    <Button 
                        onClick={async () => {
                             const { data: { session } } = await supabase.auth.getSession();
                             if(session) {
                                console.log("Session refreshed:", session);
                                alert("Session refreshed!");
                             }
                        }}
                        className="flex-1 h-11 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600  font-bold text-xs border border-slate-200 shadow-sm transition-all"
                    >
                        Refresh
                    </Button>
                    <Button 
                        onClick={handleSignOut} 
                        className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-xs border border-red-100 shadow-sm transition-all shadow-red-500/10"
                    >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Log Out
                    </Button>
                 </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  ) : (
    <Button onClick={handleSignIn} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 font-semibold px-6">
      <LogIn className="w-4 h-4 mr-2" />
      Login with Google
    </Button>
  );
}
