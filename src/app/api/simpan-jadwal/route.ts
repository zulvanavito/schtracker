/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/simpan-jadwal/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Helper calculateDurationInMs
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

// Helper function untuk mendapatkan daftar guests - HANYA SATU EMAIL
function getGuestEmails(instalasiData: any): string[] {
  // HANYA satu email yang ditambahkan - zulvan.majoo@gmail.com
  return ["zulvan.majoo@gmail.com"];
}

// Helper createGoogleCalendarEvent - DIMODIFIKASI dengan guests & labels
async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  try {
    const summary = `${eventData.nama_outlet} - Zulvan Avito Anwari - ${eventData.sch_leads}`;

    const description = `
Outlet: ${eventData.nama_outlet}
Pemilik: ${eventData.nama_owner}
Telepon: ${eventData.no_telepon}
Alamat: ${eventData.alamat}

Tipe Langganan: ${eventData.tipe_langganan}
Tipe Outlet: ${eventData.tipe_outlet}
SCH Leads: ${eventData.sch_leads}
No. Invoice: ${eventData.no_invoice}

Hari: ${eventData.hari_instalasi}
Tanggal: ${eventData.tanggal_instalasi}
Pukul: ${eventData.pukul_instalasi}

${
  eventData.tipe_outlet === "Online"
    ? "🔗 Sesi Online via Google Meet"
    : "📍 Instalasi Offline"
}
    `.trim();

    // Gunakan timezone fix
    const startTime = formatDateTimeForGoogle(
      eventData.tanggal_instalasi,
      eventData.pukul_instalasi
    );
    const endTime = formatDateTimeForGoogle(
      eventData.tanggal_instalasi,
      addHours(eventData.pukul_instalasi, 2)
    );

    const colorId = "4";

    // 👥 HANYA SATU GUEST - zulvan.majoo@gmail.com
    const guestEmails = getGuestEmails(eventData);

    const attendees = guestEmails.map((email) => ({
      email: email,
      displayName: "Zulvan Majoo", // Nama yang akan muncul di calendar
      responseStatus: "accepted", // Langsung accepted karena ini Anda sendiri
    }));

    const event = {
      summary: summary,
      description: description,
      location: eventData.alamat,
      start: {
        dateTime: startTime.isoString,
        timeZone: startTime.timeZone,
      },
      end: {
        dateTime: endTime.isoString,
        timeZone: endTime.timeZone,
      },
      // 🎨 DEFAULT: Color Flamingo untuk semua event
      colorId: colorId,
      // 👥 TAMBAHAN: Single Guest
      attendees: attendees,
      // 🔔 TAMBAHAN: Notifikasi
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 hari sebelumnya
          { method: "popup", minutes: 60 }, // 1 jam sebelumnya
        ],
      },
      // 🎯 TAMBAHAN: Visibility settings
      transparency: "opaque", // 'opaque' = busy, 'transparent' = free
      visibility: "default",
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    console.log(
      "📨 Sending Google Calendar request dengan guests & Flamingo color:",
      JSON.stringify(
        {
          summary: event.summary,
          colorId: event.colorId,
          attendees: event.attendees,
          timeZone: event.start.timeZone,
          reminders: event.reminders,
        },
        null,
        2
      )
    );

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Google Calendar API Error:", result);
      throw new Error(
        `Google API Error: ${result.error?.message || "Unknown error"}`
      );
    }

    console.log(
      "✅ Google Calendar Response dengan guests & Flamingo color:",
      JSON.stringify(
        {
          eventId: result.id,
          colorId: result.colorId,
          attendees: result.attendees,
          hangoutLink: result.hangoutLink,
        },
        null,
        2
      )
    );

    // Extract Google Meet link dari response
    const meetLink =
      result.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri || result.hangoutLink;

    console.log("🔗 Google Meet Link:", meetLink);
    console.log(
      "👥 Guests yang diinvite:",
      result.attendees?.map((a: any) => a.email)
    );
    console.log("🎨 ColorId yang digunakan:", result.colorId);

    return {
      eventId: result.id,
      meetLink: meetLink,
      htmlLink: result.htmlLink,
      colorId: result.colorId,
      attendees: result.attendees,
    };
  } catch (error) {
    console.error("❌ Google Calendar creation error:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const formInput = await request.json();

    console.log("📥 Data diterima dari client:", {
      tanggal_instalasi: formInput.tanggal_instalasi,
      pukul_instalasi: formInput.pukul_instalasi,
      nama_outlet: formInput.nama_outlet,
      tipe_outlet: formInput.tipe_outlet,
      has_google_token: !!formInput.google_access_token,
    });

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Supabase client
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    console.log("🔍 Verifying user token...");

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Token verification failed:", userError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    console.log("✅ User verified:", user.email);
    let hari_instalasi = formInput.hari_instalasi;
    if (!hari_instalasi && formInput.tanggal_instalasi) {
      const [year, month, day] = formInput.tanggal_instalasi
        .split("-")
        .map(Number);
      const date = new Date(year, month - 1, day);
      hari_instalasi = date.toLocaleDateString("id-ID", { weekday: "long" });
      console.log("📅 Calculated hari_instalasi from date:", hari_instalasi);
    }

    const baseData = {
      tanggal_instalasi: formInput.tanggal_instalasi,
      pukul_instalasi: formInput.pukul_instalasi + ":00",
      nama_outlet: formInput.nama_outlet,
      nama_owner: formInput.nama_owner || null,
      no_telepon: formInput.no_telepon || null,
      no_invoice: formInput.no_invoice || null,
      alamat: formInput.alamat || null,
      tipe_langganan: formInput.tipe_langganan || null,
      tipe_outlet: formInput.tipe_outlet || null,
      sch_leads: formInput.sch_leads || null,
      hari_instalasi: formInput.hari_instalasi || null,
      link_meet: null,
      google_event_id: null,
      status: "terjadwal",
    };

    console.log("💾 Data yang akan disimpan:", baseData);

    let meetLink = null;
    let googleEventId = null;
    let calendarColorId = null;
    let guestEmails = null;

    if (formInput.google_access_token && formInput.tipe_outlet === "Online") {
      try {
        console.log(
          "🌐 Creating Google Calendar Event dengan guests & Flamingo color..."
        );

        const googleResponse = await createGoogleCalendarEvent(
          formInput.google_access_token,
          {
            ...formInput,
            email_owner: user.email,
          }
        );

        googleEventId = googleResponse.eventId;
        meetLink = googleResponse.meetLink;
        calendarColorId = googleResponse.colorId;
        guestEmails = googleResponse.attendees?.map((a: any) => a.email);

        console.log("✅ Google Calendar Event created dengan fitur baru:", {
          eventId: googleEventId,
          meetLink: meetLink,
          colorId: calendarColorId,
          guests: guestEmails,
        });

        baseData.link_meet = meetLink;
        baseData.google_event_id = googleEventId;
      } catch (googleError) {
        console.error(
          "❌ Google Calendar error, but continuing without it:",
          googleError
        );
      }
    }

    // Simpan ke database
    console.log("💾 Saving to database...");

    const { data: insertedData, error: insertError } = await supabaseServer
      .from("jadwal")
      .insert([baseData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", {
        message: insertError.message,
        details: insertError.details,
        code: insertError.code,
      });

      // Coba tanpa .single()
      const { data: multiData, error: multiError } = await supabaseServer
        .from("jadwal")
        .insert([baseData])
        .select();

      if (multiError) {
        throw multiError;
      }

      console.log("✅ Data inserted (multiple):", multiData);
      return NextResponse.json({
        message: "Schedule created successfully!",
        data: multiData?.[0],
        googleEvent: googleEventId
          ? {
              eventId: googleEventId,
              meetLink: meetLink,
              colorId: calendarColorId,
              guests: guestEmails,
            }
          : null,
      });
    }

    console.log("✅ SUCCESS - Data inserted:", insertedData);

    return NextResponse.json({
      message: "Schedule successfully created!",
      data: insertedData,
      googleEvent: googleEventId
        ? {
            eventId: googleEventId,
            meetLink: meetLink,
            colorId: calendarColorId,
            guests: guestEmails,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("💥 FINAL ERROR:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
