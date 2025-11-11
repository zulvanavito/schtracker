// File: /api/test-auth/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No auth header" }, { status: 401 });
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    error: error?.message,
    tokenLength: authHeader.replace("Bearer ", "").length,
  });
}
