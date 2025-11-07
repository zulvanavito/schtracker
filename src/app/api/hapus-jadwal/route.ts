import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "ID jadwal tidak ditemukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("jadwal").delete().eq("id", id);

    if (error) {
      throw error;
    }
    return NextResponse.json({ message: "Jadwal berhasil dihapus!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
