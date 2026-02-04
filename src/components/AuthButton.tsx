/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import { useState, useEffect } from "react";

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
      <span className="text-sm">Hi, {user.email}</span>
      <Button 
        onClick={async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (session) {
                 const expiresAt = new Date(session.expires_at! * 1000);
                 const now = new Date();
                 const diffMs = expiresAt.getTime() - now.getTime();
                 const diffMins = Math.round(diffMs / 60000);
                 
                 alert(
                    `Token Status: VALID\n` +
                    `Expires at: ${expiresAt.toLocaleTimeString()}\n` +
                    `Remaining: ~${diffMins} minutes\n\n` + 
                    `(Auto-refresh is active)`
                 );
                 console.log("Current Session:", session);
             } else {
                 alert("No active session found!");
             }
        }} 
        variant="ghost" 
        size="sm"
        className="text-xs text-slate-400 hover:text-blue-500"
      >
        Check Token
      </Button>
      <Button onClick={handleSignOut} variant="outline" size="sm">
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
    </div>
  ) : (
    <Button onClick={handleSignIn}>
      <LogIn className="w-4 h-4 mr-2" />
      Login with Google
    </Button>
  );
}
