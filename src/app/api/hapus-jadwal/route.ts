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
    const { id, google_access_token } = await request.json(); // Terima google_access_token dari client

    if (!id) {
      return NextResponse.json(
        { error: "ID jadwal tidak ditemukan" },
        { status: 400 }
      );
    }

    // 1. Dapatkan Authorization header
    const authHeader = request.headers.get("Authorization");
    console.log("🔐 Authorization Header diterima:", !!authHeader);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header tidak ditemukan" },
        { status: 401 }
      );
    }

    // 2. Buat client untuk auth dengan ANON_KEY
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // 3. Dapatkan user (lebih reliable daripada session)
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error("❌ Error mendapatkan user:", userError);
      return NextResponse.json(
        { error: "User tidak valid. Silakan login ulang." },
        { status: 401 }
      );
    }

    console.log("✅ User berhasil diverifikasi:", user.email);

    // 4. Ambil data jadwal untuk mendapatkan google_event_id
    const { data: jadwalData, error: fetchError } = await authClient
      .from("jadwal")
      .select("google_event_id, tipe_outlet")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.warn(
        "Gagal mengambil data sebelum dihapus, mungkin sudah terhapus:",
        fetchError.message
      );
    }

    console.log("📋 Data jadwal yang akan dihapus:", {
      id: id,
      google_event_id: jadwalData?.google_event_id,
      tipe_outlet: jadwalData?.tipe_outlet,
    });

    // 5. Hapus dari database
    const { error: deleteError } = await authClient
      .from("jadwal")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("❌ Error menghapus dari database:", deleteError);
      throw deleteError;
    }

    console.log("✅ Berhasil menghapus jadwal dari database");

    // 6. Hapus dari Google Calendar HANYA jika ada google_event_id dan google_access_token
    if (jadwalData && jadwalData.google_event_id) {
      if (google_access_token) {
        try {
          console.log(
            "🗑️ Menghapus event Google Calendar:",
            jadwalData.google_event_id
          );
          await deleteGoogleCalendarEvent(
            google_access_token,
            jadwalData.google_event_id
          );
          console.log("✅ Event Google berhasil dihapus");
        } catch (googleError: unknown) {
          // Jangan gagalkan seluruh proses jika Google error
          if (googleError instanceof Error) {
            console.warn(
              `⚠️ Gagal menghapus event Google: ${googleError.message}`
            );
          } else {
            console.warn("⚠️ Gagal menghapus event Google (unknown error)");
          }
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
    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("❌ Error in /api/hapus-jadwal:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
