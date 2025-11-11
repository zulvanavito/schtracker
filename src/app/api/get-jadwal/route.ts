import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// --- TAMBAHKAN BARIS INI UNTUK MEMAKSA API MENJADI DINAMIS ---
export const dynamic = "force-dynamic";
// --------------------------------------------------------

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
  } catch (error: unknown) {
    // Perbaikan untuk 'any'
    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
