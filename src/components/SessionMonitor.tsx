"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, AlertCircle } from "lucide-react";

export default function SessionMonitor() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        const isLoggingOut = localStorage.getItem("is_logging_out");
        
        // If the logout was NOT intentional (flag is missing or false), show popup
        if (isLoggingOut !== "true") {
          setIsOpen(true);
        }

        // Reset the flag for next time
        localStorage.removeItem("is_logging_out");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsOpen(false);
    // Trigger login flow or redirect
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
      if (error) console.error("Login failed:", error);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Session Expired
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-slate-600">
            Sesi login Anda telah berakhir. Mohon login kembali untuk melanjutkan aktivitas.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <LogIn className="h-4 w-4 mr-2" />
            Login Kembali
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
