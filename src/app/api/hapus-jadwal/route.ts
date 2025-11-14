import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Helper function untuk menghapus Google Calendar event
async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 410) {
    // 410 = Event sudah dihapus (Gone)
    const errorData = await response.json();
    console.error("Google API Error (Delete):", errorData);
    throw new Error("Gagal menghapus event di Google Calendar");
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const { id, google_access_token } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID jadwal tidak ditemukan" },
        { status: 400 }
      );
    }

    console.log("🗑️ Mencoba menghapus jadwal dengan ID:", id);

    // 1. Dapatkan Authorization header
    const authHeader = request.headers.get("Authorization");
    console.log("🔐 Authorization Header diterima:", !!authHeader);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Buat client dengan service role key untuk bypass RLS
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    // 3. Verify user
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Error mendapatkan user:", userError);
      return NextResponse.json(
        { error: "User tidak valid. Silakan login ulang." },
        { status: 401 }
      );
    }

    console.log("✅ User berhasil diverifikasi:", user.email);

    // 4. Ambil data jadwal SEBELUM dihapus - PERBAIKAN DI SINI
    console.log("📋 Mengambil data jadwal sebelum dihapus...");

    const { data: jadwalData, error: fetchError } = await supabaseServer
      .from("jadwal")
      .select("google_event_id, tipe_outlet, nama_outlet")
      .eq("id", id);

    if (fetchError) {
      console.error("❌ Gagal mengambil data jadwal:", fetchError);
      // Lanjutkan saja, mungkin data sudah dihapus
    }

    console.log("📋 Data jadwal yang akan dihapus:", {
      id: id,
      data: jadwalData,
      count: jadwalData?.length || 0,
    });

    // Handle jika data tidak ditemukan atau multiple records
    let googleEventId = null;
    if (jadwalData && jadwalData.length > 0) {
      if (jadwalData.length === 1) {
        googleEventId = jadwalData[0].google_event_id;
        console.log("🔍 Google Event ID ditemukan:", googleEventId);
      } else {
        console.warn("⚠️ Multiple records found, using first one");
        googleEventId = jadwalData[0].google_event_id;
      }
    } else {
      console.log("ℹ️ Data jadwal tidak ditemukan, mungkin sudah dihapus");
    }

    // 5. Hapus dari database
    console.log("🗑️ Menghapus dari database...");
    const { error: deleteError } = await supabaseServer
      .from("jadwal")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("❌ Error menghapus dari database:", deleteError);

      // Cek jika error karena data tidak ditemukan
      if (deleteError.code === "PGRST116") {
        console.log("ℹ️ Data sudah tidak ada di database");
        return NextResponse.json({
          message: "Jadwal sudah dihapus atau tidak ditemukan",
        });
      }

      throw deleteError;
    }

    console.log("✅ Berhasil menghapus jadwal dari database");

    // 6. Hapus dari Google Calendar HANYA jika ada google_event_id dan google_access_token
    if (googleEventId) {
      if (google_access_token) {
        try {
          console.log("🗑️ Menghapus event Google Calendar:", googleEventId);
          await deleteGoogleCalendarEvent(google_access_token, googleEventId);
          console.log("✅ Event Google berhasil dihapus");
        } catch (googleError: unknown) {
          // Jangan gagalkan seluruh proses jika Google error
          console.warn("⚠️ Gagal menghapus event Google:", googleError);
        }
      } else {
        console.warn(
          "⚠️ Google access token tidak tersedia, event Google tidak dihapus"
        );
      }
    } else {
      console.log(
        "ℹ️ Tidak ada google_event_id, skip penghapusan Google Calendar"
      );
    }

    return NextResponse.json({
      message: "Jadwal berhasil dihapus!",
    });
  } catch (error: unknown) {
    console.error("❌ Error in /api/hapus-jadwal:", error);

    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
