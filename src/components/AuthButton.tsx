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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Sign in error:", error);
        alert(`Login error: ${error.message}`);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm">Hi, {user.email}</span>
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
