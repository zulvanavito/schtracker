import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const {
      id,
      nama_outlet,
      nama_owner,
      no_telepon,
      no_invoice,
      sch_leads,
      alamat,
      tipe_outlet,
      tipe_langganan,
      hari_instalasi,
      tanggal_instalasi,
      pukul_instalasi,
      link_meet,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID jadwal tidak ditemukan" },
        { status: 400 }
      );
    }

    const dataToUpdate = {
      nama_outlet,
      nama_owner,
      no_telepon,
      no_invoice,
      sch_leads,
      alamat,
      tipe_outlet,
      tipe_langganan,
      hari_instalasi,
      tanggal_instalasi,
      pukul_instalasi,
      link_meet,
    };

    const { data, error } = await supabase
      .from("jadwal")
      .update(dataToUpdate)
      .eq("id", id)
      .select();

    if (error) {
      throw error;
    }
    return NextResponse.json({ message: "Jadwal berhasil diperbarui!", data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
