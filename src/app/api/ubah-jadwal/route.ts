import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Helper function untuk menghitung durasi
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

// Helper function untuk format waktu dengan timezone fix
function formatDateTimeForGoogle(date: string, time: string) {
  // Asia/Makassar = UTC+8
  const localDate = new Date(`${date}T${time}:00+08:00`);
  return {
    isoString: localDate.toISOString(),
    timeZone: "Asia/Makassar",
  };
}

// Helper function untuk menambah jam
function addHours(time: string, hours: number): string {
  const [hoursStr, minutesStr] = time.split(":");
  let newHours = parseInt(hoursStr) + hours;
  if (newHours >= 24) newHours -= 24;
  return `${newHours.toString().padStart(2, "0")}:${minutesStr}`;
}

// Helper function untuk update Google Calendar event
async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  eventData: Record<string, any>
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Google API Error (Update):", errorData);
    throw new Error("Gagal memperbarui event di Google Calendar");
  }
  return response.json();
}

export async function POST(request: Request) {
  try {
    const formInput = await request.json();
    const { id, google_event_id, google_access_token, ...allData } = formInput;

    console.log("✏️ Memproses update jadwal:", {
      id,
      hasGoogleEventId: !!google_event_id,
      hasGoogleAccessToken: !!google_access_token,
      receivedFields: Object.keys(allData),
    });

    if (!id) {
      return NextResponse.json(
        { error: "ID jadwal Supabase tidak ditemukan" },
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

    // 4. FILTER DATA: Hanya ambil field yang valid untuk tabel jadwal
    const validFields = [
      "nama_outlet",
      "nama_owner",
      "no_telepon",
      "no_invoice",
      "sch_leads",
      "alamat",
      "tipe_outlet",
      "tipe_langganan",
      "hari_instalasi",
      "tanggal_instalasi",
      "pukul_instalasi",
      "link_meet",
      "status",
      "google_event_id",
    ];

    const dataToUpdate: Record<string, any> = {};

    // Hanya masukkan field yang valid dan memiliki nilai
    validFields.forEach((field) => {
      if (allData[field] !== undefined && allData[field] !== null) {
        dataToUpdate[field] = allData[field];
      }
    });

    // Tambahkan google_event_id jika ada
    if (google_event_id) {
      dataToUpdate.google_event_id = google_event_id;
    }

    console.log("🔄 Field yang akan diupdate:", Object.keys(dataToUpdate));
    console.log("📊 Data yang akan diupdate:", dataToUpdate);
    console.log(
      "🚫 Field yang diabaikan:",
      Object.keys(allData).filter((field) => !validFields.includes(field))
    );

    // 5. Buat client untuk database dengan SERVICE ROLE KEY
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 6. Update data di Supabase
    console.log("💾 Mengupdate data di Supabase...");
    const { data, error: updateError } = await supabaseServer
      .from("jadwal")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error mengupdate database:", updateError);
      throw new Error(`Gagal mengupdate database: ${updateError.message}`);
    }

    console.log("✅ Data berhasil diupdate di Supabase");

    // 7. Update Google Calendar event HANYA jika ada google_event_id dan google_access_token
    if (google_event_id && google_access_token) {
      try {
        console.log("📅 Mengupdate event Google Calendar:", google_event_id);

        // 🎯 PERBAIKAN TIMEZONE DI SINI - Gunakan fungsi formatDateTimeForGoogle
        console.log("🕒 Data waktu sebelum update Google Calendar:", {
          tanggal: dataToUpdate.tanggal_instalasi,
          pukul: dataToUpdate.pukul_instalasi,
          timezone: "Asia/Makassar",
        });

        const startTime = formatDateTimeForGoogle(
          dataToUpdate.tanggal_instalasi,
          dataToUpdate.pukul_instalasi
        );
        const endTime = formatDateTimeForGoogle(
          dataToUpdate.tanggal_instalasi,
          addHours(dataToUpdate.pukul_instalasi, 2)
        );

        const googleEvent = {
          summary: `Instalasi Majoo: ${dataToUpdate.nama_outlet}`,
          description: `SCH Leads: ${dataToUpdate.sch_leads}\nOwner: ${dataToUpdate.nama_owner}\nNo HP: ${dataToUpdate.no_telepon}\nTipe: ${dataToUpdate.tipe_outlet} (${dataToUpdate.tipe_langganan})`,
          start: {
            dateTime: startTime.isoString,
            timeZone: startTime.timeZone,
          },
          end: {
            dateTime: endTime.isoString,
            timeZone: endTime.timeZone,
          },
        };

        console.log(
          "📤 Update event data ke Google:",
          JSON.stringify(googleEvent, null, 2)
        );

        await updateGoogleCalendarEvent(
          google_access_token,
          google_event_id,
          googleEvent
        );

        console.log("✅ Event Google berhasil diupdate");
      } catch (googleError: unknown) {
        // Jangan gagalkan seluruh proses jika Google error
        if (googleError instanceof Error) {
          console.warn(
            `⚠️ Gagal mengupdate event Google: ${googleError.message}`
          );
        } else {
          console.warn("⚠️ Gagal mengupdate event Google (unknown error)");
        }
      }
    } else {
      if (google_event_id && !google_access_token) {
        console.warn(
          "⚠️ Ada google_event_id tapi tidak ada google_access_token, skip update Google Calendar"
        );
      } else {
        console.log(
          "ℹ️ Tidak ada google_event_id, skip update Google Calendar"
        );
      }
    }

    return NextResponse.json({
      message: "Jadwal berhasil diperbarui!",
      data,
    });
  } catch (error: unknown) {
    let errorMessage = "Terjadi kesalahan tidak diketahui";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("❌ Error in /api/ubah-jadwal:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
