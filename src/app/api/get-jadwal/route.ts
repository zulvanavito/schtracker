import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("jadwal")
      .select("*, log_pesan(*)") // Tetap ambil log pesan
      .order("tanggal_instalasi", { ascending: true });

    if (error) {
      throw error;
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
