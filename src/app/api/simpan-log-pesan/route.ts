// app/api/simpan-log-pesan/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // Parse request body
    const { jadwal_id, tipe_pesan, isi_pesan } = await request.json();

    console.log("📝 Data diterima untuk simpan-log-pesan:", {
      jadwal_id,
      tipe_pesan,
      isi_pesan_length: isi_pesan?.length || 0,
    });

    // 1. Check Authorization Header
    const authHeader = request.headers.get("Authorization");
    console.log(
      "🔑 Authorization Header:",
      authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required (Bearer token)" },
        { status: 401 }
      );
    }

    // 2. Extract token
    const token = authHeader.replace("Bearer ", "");

    // 3. Create Supabase client with service role key for server-side operations
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 4. Verify the token and get user
    console.log("👤 Verifying token...");
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError) {
      console.error("❌ Token verification failed:", userError.message);
      return NextResponse.json(
        { error: "Invalid token: " + userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("❌ No user found for token");
      return NextResponse.json(
        { error: "User not found. Token may be expired." },
        { status: 401 }
      );
    }

    console.log("✅ User verified:", user.email);

    // 5. Validate required fields
    if (!jadwal_id) {
      return NextResponse.json(
        { error: "jadwal_id is required" },
        { status: 400 }
      );
    }

    if (!tipe_pesan) {
      return NextResponse.json(
        { error: "tipe_pesan is required" },
        { status: 400 }
      );
    }

    // 6. Insert log message into database
    console.log("💾 Saving to database...");
    const { data, error: insertError } = await supabaseServer
      .from("log_pesan")
      .insert([
        {
          jadwal_id: jadwal_id,
          tipe_pesan: tipe_pesan,
          isi_pesan: isi_pesan || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save log: " + insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ Log pesan berhasil disimpan! ID:", data.id);

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: "Log pesan berhasil disimpan!",
      data: data,
    });
  } catch (error: unknown) {
    console.error("💥 Unexpected error in simpan-log-pesan:", error);

    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
