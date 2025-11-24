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

    // 6. CEK DUPLIKAT: Cek apakah sudah ada log pesan dengan jadwal_id + tipe_pesan yang sama
    console.log("🔍 Checking for duplicate log...");

    const { data: existingLogs, error: checkError } = await supabaseServer
      .from("log_pesan")
      .select("id, created_at, isi_pesan")
      .eq("jadwal_id", jadwal_id)
      .eq("tipe_pesan", tipe_pesan)
      .order("created_at", { ascending: false })
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking duplicate:", checkError);
      // Lanjutkan saja, jangan block karena error cek
    }

    // 7. Jika sudah ada log dengan jadwal_id + tipe_pesan yang sama, return existing log
    if (existingLogs && existingLogs.length > 0) {
      console.log("⏭️ Log pesan sudah ada untuk tipe ini, skip penyimpanan:", {
        existing_log_id: existingLogs[0].id,
        jadwal_id: jadwal_id,
        tipe_pesan: tipe_pesan,
        created_at: existingLogs[0].created_at,
      });

      return NextResponse.json({
        success: true,
        message: "Log pesan untuk tipe ini sudah ada, tidak disimpan duplikat",
        skipped: true,
        existing_log: existingLogs[0],
        data: existingLogs[0], // Return existing data
      });
    }

    // 8. Validasi tipe_pesan (optional enhancement)
    const validTipePesan = [
      "offline_hL_reminder",
      "online_reminder_aval",
      "konfirmasi",
      "followup",
      "system",
      "other",
    ];
    if (!validTipePesan.includes(tipe_pesan)) {
      console.warn(
        `⚠️ Tipe pesan '${tipe_pesan}' tidak standar, tetap disimpan`
      );
    }

    // 9. Insert log message into database - HANYA jika belum ada kombinasi jadwal_id + tipe_pesan
    console.log("💾 Saving to database (no duplicate found)...");
    const logData = {
      jadwal_id: jadwal_id,
      tipe_pesan: tipe_pesan,
      isi_pesan: isi_pesan || null,
      created_at: new Date().toISOString(),
    };

    const { data, error: insertError } = await supabaseServer
      .from("log_pesan")
      .insert([logData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save log: " + insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ Log pesan berhasil disimpan!", {
      log_id: data.id,
      jadwal_id: data.jadwal_id,
      tipe_pesan: data.tipe_pesan,
    });

    // 10. Return success response
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
