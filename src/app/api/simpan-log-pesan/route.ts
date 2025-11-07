import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { jadwal_id, tipe_pesan, isi_pesan } = await request.json();

    if (!jadwal_id || !tipe_pesan || !isi_pesan) {
      return NextResponse.json(
        { error: "Data log tidak lengkap" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("log_pesan")
      .insert([{ jadwal_id, tipe_pesan, isi_pesan }])
      .select();

    if (error) {
      throw error;
    }
    return NextResponse.json({ message: "Log pesan berhasil disimpan!", data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
