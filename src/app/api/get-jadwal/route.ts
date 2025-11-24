import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    console.log("🔍 GET /api/get-jadwal called");

    // Dapatkan query parameters untuk filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const tanggal = searchParams.get("tanggal");
    const tipe_outlet = searchParams.get("tipe_outlet");

    console.log("📋 Query parameters:", {
      status,
      tanggal,
      tipe_outlet,
    });

    // Create Supabase client dengan service role key
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    console.log("📋 Fetching jadwal data...");

    // Buat query dasar
    let query = supabaseServer.from("jadwal").select("*");

    // Tambahkan filter berdasarkan query parameters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (tanggal) {
      query = query.eq("tanggal_instalasi", tanggal);
    }

    if (tipe_outlet && tipe_outlet !== "all") {
      query = query.eq("tipe_outlet", tipe_outlet);
    }

    // Eksekusi query dengan sorting
    const { data: jadwalData, error: fetchError } = await query
      .order("tanggal_instalasi", { ascending: true })
      .order("pukul_instalasi", { ascending: true });

    if (fetchError) {
      console.error("❌ Error fetching jadwal data:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch schedule data: " + fetchError.message },
        { status: 500 }
      );
    }

    // Log statistics
    const stats = {
      total: jadwalData?.length || 0,
      online: jadwalData?.filter((j) => j.tipe_outlet === "Online").length || 0,
      offline:
        jadwalData?.filter((j) => j.tipe_outlet === "Offline").length || 0,
      terjadwal:
        jadwalData?.filter((j) => j.status === "terjadwal").length || 0,
      selesai: jadwalData?.filter((j) => j.status === "selesai").length || 0,
    };

    console.log(`✅ Successfully fetched ${stats.total} records`, stats);

    return NextResponse.json({
      success: true,
      data: jadwalData || [],
      count: stats.total,
      statistics: stats,
      filters: {
        status,
        tanggal,
        tipe_outlet,
      },
    });
  } catch (error: unknown) {
    console.error("💥 Unexpected error in get-jadwal:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
