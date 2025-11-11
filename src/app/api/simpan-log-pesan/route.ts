import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// (Helper calculateDurationInMs... tetap sama)
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
// (Helper createGoogleCalendarEvent... tetap sama)
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

// --- FUNGSI POST DENGAN DEBUGGING LENGKAP ---
export async function POST(request: Request) {
  try {
    const formInput = await request.json();

    // 1. Debugging Header (Solusi #1 & #2)
    const authHeader = request.headers.get("Authorization");
    console.log(
      "Authorization Header Diterima:",
      authHeader ? `${authHeader.substring(0, 15)}...` : "KOSONG"
    );

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header tidak ditemukan" },
        { status: 401 }
      );
    }

    // 2. Buat Klien Server dengan Kunci SERVICE_ROLE (Solusi #5)
    // Pastikan SUPABASE_SERVICE_ROLE_KEY ada di .env.local
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // <-- WAJIB SERVICE KEY
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // 3. Debugging Sesi (Solusi #2)
    const {
      data: { session },
      error: sessionError,
    } = await supabaseServer.auth.getSession();

    console.log("Session Error:", sessionError); // <-- DEBUG

    if (sessionError) {
      console.error("Session Error:", sessionError);
      return NextResponse.json(
        { error: "Error mendapatkan session: " + sessionError.message },
        { status: 401 }
      );
    }
    if (!session) {
      console.log("Session tidak ditemukan setelah verifikasi."); // <-- DEBUG
      return NextResponse.json(
        { error: "Session tidak ditemukan" },
        { status: 401 }
      );
    }

    // 4. Debugging Provider Token (Solusi #2 & #3)
    console.log("Session Ditemukan. Mengecek provider_token..."); // <-- DEBUG
    if (!session.provider_token) {
      console.log(
        "Provider token KOSONG. Sesi ini mungkin basi atau tidak punya izin."
      ); // <-- DEBUG
      return NextResponse.json(
        {
          error:
            "Token Google tidak ditemukan. Sesi Anda mungkin basi. Silakan login ulang.",
        },
        { status: 401 }
      );
    }

    console.log(
      "Provider Token Ditemukan:",
      `${session.provider_token.substring(0, 15)}...`
    ); // <-- DEBUG

    // 5. Lanjutkan Logika (Kode ini sekarang seharusnya aman)
    const startTime = new Date(
      `${formInput.tanggal_instalasi}T${formInput.pukul_instalasi}`
    );
    const durationMs = calculateDurationInMs(
      formInput.tipe_langganan,
      formInput.tipe_outlet
    );
    const endTime = new Date(startTime.getTime() + durationMs);

    const googleEvent = {
      summary: `Instalasi Majoo: ${formInput.nama_outlet}`,
      description: `SCH Leads: ${formInput.sch_leads}\nOwner: ${formInput.nama_owner}\nNo HP: ${formInput.no_telepon}\nTipe: ${formInput.tipe_outlet} (${formInput.tipe_langganan})`,
      start: { dateTime: startTime.toISOString(), timeZone: "Asia/Makassar" },
      end: { dateTime: endTime.toISOString(), timeZone: "Asia/Makassar" },
      conferenceData: {
        createRequest: {
          requestId: `majoo-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const googleResponse = await createGoogleCalendarEvent(
      session.provider_token,
      googleEvent
    );
    const meetLink = googleResponse.hangoutLink;
    const googleEventId = googleResponse.id;

    const dataToInsert = {
      ...formInput,
      link_meet: meetLink,
      google_event_id: googleEventId,
    };

    const { data, error: insertError } = await supabase
      .from("jadwal")
      .insert([dataToInsert])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("SUKSES: Jadwal dan Link Meet dibuat!"); // <-- DEBUG
    return NextResponse.json({
      message: "Jadwal & Link Meet berhasil dibuat!",
      data,
    });
  } catch (error: unknown) {
    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error di catch /api/simpan-jadwal:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
