/* eslint-disable @typescript-eslint/no-explicit-any */

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

// Helper createGoogleCalendarEvent
async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  try {
    const event = {
      summary: `Instalasi - ${eventData.nama_outlet}`,
      description: `Jadwal instalasi untuk ${eventData.nama_outlet}\nPemilik: ${eventData.nama_owner}\nTelepon: ${eventData.no_telepon}`,
      start: {
        dateTime: new Date(
          `${eventData.tanggal_instalasi}T${eventData.pukul_instalasi}:00`
        ).toISOString(),
        timeZone: "Asia/Jakarta",
      },
      end: {
        dateTime: new Date(
          new Date(
            `${eventData.tanggal_instalasi}T${eventData.pukul_instalasi}:00`
          ).getTime() +
            2 * 60 * 60 * 1000
        ).toISOString(), // 2 jam
        timeZone: "Asia/Jakarta",
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      attendees: [
        { email: eventData.email_owner }, // jika ada email owner
      ],
    };

    console.log(
      "📨 Sending Google Calendar request:",
      JSON.stringify(event, null, 2)
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
      "✅ Google Calendar Response:",
      JSON.stringify(result, null, 2)
    );

    // Extract Google Meet link dari response
    const meetLink =
      result.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri || result.hangoutLink;

    console.log("🔗 Google Meet Link:", meetLink);

    return {
      eventId: result.id,
      meetLink: meetLink,
      htmlLink: result.htmlLink,
    };
  } catch (error) {
    console.error("❌ Google Calendar creation error:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const formInput = await request.json();

    // 1. Debugging Header
    const authHeader = request.headers.get("Authorization");
    console.log(
      "Authorization Header Diterima:",
      authHeader ? `${authHeader.substring(0, 25)}...` : "KOSONG"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required (Bearer token)" },
        { status: 401 }
      );
    }

    // 2. Extract token
    const token = authHeader.replace("Bearer ", "");

    // 3. Create Supabase client with service role key
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 4. Verify the token and get user
    console.log("👤 Verifying token...");
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError) {
      console.error("❌ Token verification failed:", userError.message);
      return NextResponse.json(
        { error: "Invalid token: " + userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("❌ No user found for token");
      return NextResponse.json(
        { error: "User not found. Token may be expired." },
        { status: 401 }
      );
    }

    console.log("✅ User verified:", user.email);

    // 5. Create Google Calendar Event for BOTH online and offline
    console.log(
      `📅 Creating Google Calendar Event for: ${formInput.tipe_outlet} schedule`
    );

    // DAPATKAN provider_token DARI CLIENT
    const googleAccessToken = formInput.google_access_token;

    if (!googleAccessToken) {
      console.log("❌ No google_access_token provided");
      return NextResponse.json(
        {
          error:
            "Google access token not provided. Cannot create Google Calendar event.",
        },
        { status: 400 }
      );
    }

    console.log("✅ Google Access Token provided by client");

    const startTime = new Date(
      `${formInput.tanggal_instalasi}T${formInput.pukul_instalasi}`
    );
    const durationMs = calculateDurationInMs(
      formInput.tipe_langganan,
      formInput.tipe_outlet
    );
    const endTime = new Date(startTime.getTime() + durationMs);

    // Buat event data dasar untuk SEMUA tipe
    const googleEvent: any = {
      summary: `Instalasi Majoo: ${formInput.nama_outlet}`,
      description: `Tipe: ${formInput.tipe_outlet} (${formInput.tipe_langganan})
SCH Leads: ${formInput.sch_leads}
Owner: ${formInput.nama_owner}
No HP: ${formInput.no_telepon}
Alamat: ${formInput.alamat || "-"}`,
      start: { dateTime: startTime.toISOString(), timeZone: "Asia/Makassar" },
      end: { dateTime: endTime.toISOString(), timeZone: "Asia/Makassar" },
    };

    // Hanya tambahkan conferenceData untuk jadwal ONLINE
    if (formInput.tipe_outlet === "Online") {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    let meetLink = "";
    let googleEventId = "";

    try {
      const googleResponse = await createGoogleCalendarEvent(
        googleAccessToken,
        {
          ...formInput,
          email_owner: user.email, // gunakan email dari user yang terverifikasi
        }
      );

      googleEventId = googleResponse.eventId;

      // Untuk online, dapatkan meetLink dari response
      if (formInput.tipe_outlet === "Online") {
        meetLink = googleResponse.meetLink || "";
        console.log("✅ Google Calendar Event created with Meet:", meetLink);
      } else {
        console.log("✅ Google Calendar Event created for OFFLINE");
      }
    } catch (googleError) {
      console.error("❌ Google Calendar error:", googleError);
      return NextResponse.json(
        {
          error:
            "Failed to create Google Calendar event: " +
            (googleError as Error).message,
        },
        { status: 500 }
      );
    }

    // 6. Save to database (both online and offline)
    const dataToInsert = {
      ...formInput,
      link_meet: meetLink, // Untuk offline akan string kosong
      google_event_id: googleEventId, // Untuk kedua tipe akan ada Google Event ID
    };

    // Hapus google_access_token dari data yang akan disimpan ke database
    delete dataToInsert.google_access_token;

    console.log("💾 Saving to database...");
    const { data, error: insertError } = await supabaseServer
      .from("jadwal")
      .insert([dataToInsert])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      throw insertError;
    }

    console.log(
      `✅ SUCCESS: ${formInput.tipe_outlet} schedule saved with Google Calendar!`
    );
    return NextResponse.json({
      message: `${formInput.tipe_outlet} schedule successfully created with Google Calendar!`,
      data,
    });
  } catch (error: unknown) {
    console.error("💥 Unexpected error in simpan-jadwal:", error);

    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
