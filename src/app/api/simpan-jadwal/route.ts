import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// --- HELPER FUNCTIONS ---
function calculateDurationInMs(tipe_langganan: string, tipe_outlet: string) {
  let durationHours = 0;
  const langganan = tipe_langganan ? tipe_langganan.toLowerCase() : "";
  const tipe = tipe_outlet ? tipe_outlet.toLowerCase() : "";

  switch (langganan) {
    case "starter basic":
      durationHours = 1;
      break;
    case "starter":
      durationHours = 2;
      break;
    case "advance":
    case "prime":
    case "training berbayar":
      durationHours = 3;
      break;
    default:
      durationHours = 2;
  }

  let durationMs = durationHours * 60 * 60 * 1000;
  if (tipe === "offline") {
    durationMs += 30 * 60 * 1000;
  }
  return durationMs;
}

async function createGoogleCalendarEvent(
  accessToken: string,
  eventData: Record<string, any>
) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Google API Error:", errorData);
    throw new Error("Gagal membuat event di Google Calendar");
  }
  return response.json();
}

export async function POST(request: Request) {
  try {
    const formInput = await request.json();

    // 1. Dapatkan Authorization header
    const authHeader = request.headers.get("Authorization");
    console.log("🔐 Authorization Header diterima:", !!authHeader);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header tidak ditemukan" },
        { status: 401 }
      );
    }

    // 2. Buat client untuk auth
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // 3. Dapatkan USER
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

    // 4. Cek tipe outlet - HANYA ONLINE yang butuh Google Calendar
    const isOnline = formInput.tipe_outlet?.toLowerCase() === "online";
    console.log(
      `🔍 Tipe outlet: ${formInput.tipe_outlet} -> Online: ${isOnline}`
    );

    let meetLink = "";
    let googleEventId = "";

    // 5. HANYA buat Google Calendar event jika ONLINE
    if (isOnline) {
      // Cek apakah client mengirimkan google_access_token
      const googleAccessToken = formInput.google_access_token;

      if (!googleAccessToken) {
        console.log("❌ Google access token tidak ditemukan di request body");
        return NextResponse.json(
          {
            error:
              "Google access token tidak tersedia. Untuk training online, pastikan login dengan Google.",
          },
          { status: 400 }
        );
      }

      console.log("✅ Google access token diterima dari client");

      // Buat event di Google Calendar
      const startTime = new Date(
        `${formInput.tanggal_instalasi}T${formInput.pukul_instalasi}`
      );

      const durationMs = calculateDurationInMs(
        formInput.tipe_langganan,
        formInput.tipe_outlet
      );
      const endTime = new Date(startTime.getTime() + durationMs);

      console.log("⏰ Waktu yang dihitung:", {
        start: startTime,
        end: endTime,
        durationMs: durationMs,
        durationHours: durationMs / (60 * 60 * 1000),
      });

      const googleEvent = {
        summary: `Instalasi Majoo: ${formInput.nama_outlet}`,
        description: `SCH Leads: ${formInput.sch_leads}\nOwner: ${formInput.nama_owner}\nNo HP: ${formInput.no_telepon}\nTipe: ${formInput.tipe_outlet} (${formInput.tipe_langganan})`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "Asia/Makassar",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "Asia/Makassar",
        },
        conferenceData: {
          createRequest: {
            requestId: `majoo-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      console.log("📅 Membuat event Google Calendar untuk training ONLINE...");
      const googleResponse = await createGoogleCalendarEvent(
        googleAccessToken,
        googleEvent
      );

      meetLink = googleResponse.hangoutLink;
      googleEventId = googleResponse.id;

      console.log("✅ Event Google berhasil dibuat:", googleEventId);
    } else {
      console.log("ℹ️ Training OFFLINE - tidak membuat Google Calendar event");
    }

    // 6. Buat client untuk database dengan SERVICE ROLE KEY
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 7. Simpan ke database
    const dataToInsert = {
      // Data dari form input
      nama_outlet: formInput.nama_outlet,
      nama_owner: formInput.nama_owner,
      no_telepon: formInput.no_telepon,
      no_invoice: formInput.no_invoice,
      sch_leads: formInput.sch_leads,
      alamat: formInput.alamat,
      tipe_outlet: formInput.tipe_outlet,
      tipe_langganan: formInput.tipe_langganan,
      hari_instalasi: formInput.hari_instalasi,
      tanggal_instalasi: formInput.tanggal_instalasi,
      pukul_instalasi: formInput.pukul_instalasi,

      // Data yang di-generate (kosong untuk offline)
      link_meet: meetLink,
      google_event_id: googleEventId,

      // Kolom status
      status: "terjadwal",
    };

    console.log("💾 Data yang akan disimpan:", {
      tipe_outlet: formInput.tipe_outlet,
      link_meet: meetLink ? "Ada" : "Kosong",
      google_event_id: googleEventId ? "Ada" : "Kosong",
    });

    const { data, error: insertError } = await supabaseServer
      .from("jadwal")
      .insert([dataToInsert])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error menyimpan ke database:", insertError);
      throw insertError;
    }

    const successMessage = isOnline
      ? "Jadwal & Link Meet berhasil dibuat!"
      : "Jadwal berhasil dibuat! (Training Offline)";

    console.log("✅ SUKSES:", successMessage);
    return NextResponse.json({
      message: successMessage,
      data,
    });
  } catch (error: unknown) {
    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("❌ Error di /api/simpan-jadwal:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
