import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const dataToInsert = await request.json();

    const { data, error } = await supabase
      .from("jadwal")
      .insert([dataToInsert])
      .select();

    if (error) {
      throw error;
    }
    return NextResponse.json({ message: "Jadwal berhasil disimpan!", data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
