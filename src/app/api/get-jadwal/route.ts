import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    console.log("🔍 GET /api/get-jadwal called");

    // Create Supabase client dengan service role key
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    console.log("📋 Fetching jadwal data...");

    const { data: jadwalData, error: fetchError } = await supabaseServer
      .from("jadwal")
      .select("*")
      .order("tanggal_instalasi", { ascending: true })
      .order("pukul_instalasi", { ascending: true });

    if (fetchError) {
      console.error("❌ Error fetching jadwal data:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch schedule data: " + fetchError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully fetched ${jadwalData?.length || 0} records`);

    return NextResponse.json({
      success: true,
      data: jadwalData || [],
      count: jadwalData?.length || 0,
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
