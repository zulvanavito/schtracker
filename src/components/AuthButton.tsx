/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
          <span className="text-sm font-semibold text-foreground">{user.user_metadata?.full_name || "Active User"}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">{user.email}</span>
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
            <Button 
                variant="outline" 
                size="sm"
                className="rounded-md border-input text-muted-foreground hover:text-primary hover:bg-secondary transition-all font-semibold px-4 h-9"
            >
                <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-green"></span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest">Status</span>
                </div>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white border-0 shadow-notion-elevation-4 rounded-xl gap-0 ring-1 ring-black/5">
            {/* Header Design */}
            <div className="relative h-28 bg-notion-navy overflow-hidden">
                <div className="absolute top-6 left-6 flex flex-col justify-end h-full pb-6 z-10">
                    <div className="p-2 bg-primary rounded-md w-fit mb-3 border border-white/10 shadow-sm">
                         <LogIn className="w-5 h-5 text-white" />
                    </div>
                    <DialogTitle className="text-lg font-bold text-white tracking-tight">Active Session</DialogTitle>
                    <p className="text-on-dark-muted text-[10px] font-bold uppercase tracking-widest">Connected via Google</p>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                 {/* Status Card */}
                 <div className="bg-notion-mint/40 border border-notion-mint rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-md flex items-center justify-center border border-notion-mint shadow-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Token Valid</p>
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Secure Access</p>
                        </div>
                    </div>
                    <div className="px-2.5 py-0.5 bg-white rounded border border-notion-mint text-[10px] font-bold text-brand-green uppercase tracking-widest shadow-none">
                        Active
                    </div>
                 </div>

                 {/* Details Grid */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-secondary/30 border border-border rounded-lg">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Your Role</p>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                             <p className="text-sm font-semibold text-foreground capitalize">{user.role || "Standard"}</p>
                        </div>
                    </div>
                    <div className="p-3.5 bg-secondary/30 border border-border rounded-lg">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Session Life</p>
                         <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
                             <p className="text-sm font-semibold text-foreground">~55 min</p>
                        </div>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="flex gap-3 pt-2">
                    <Button 
                        onClick={async () => {
                             const { data: { session } } = await supabase.auth.getSession();
                             if(session) {
                                toast.success("Session successfully synchronized");
                             }
                        }}
                        variant="outline"
                        className="flex-1 h-10 rounded-md border-input text-foreground hover:bg-secondary font-bold text-[11px] uppercase tracking-tight shadow-none transition-all"
                    >
                        Sync Session
                    </Button>
                    <Button 
                        onClick={handleSignOut} 
                        className="flex-1 h-10 rounded-md bg-secondary text-muted-foreground hover:bg-notion-rose hover:text-semantic-error font-bold text-[11px] uppercase tracking-tight shadow-none transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Sign Out
                    </Button>
                 </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  ) : (
    <Button 
      onClick={handleSignIn} 
      className="rounded-md bg-primary hover:bg-primary/90 text-white shadow-sm font-semibold px-6 h-11 transition-all"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign in with Google
    </Button>
  );
}
