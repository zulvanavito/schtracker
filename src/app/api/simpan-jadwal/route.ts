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

// Helper createGoogleCalendarEvent
async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...eventData,
          conferenceData: {
            createRequest: {
              requestId: Math.random().toString(36).substring(2, 15),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();

      // Handle insufficient scopes error
      if (
        errorData.error?.code === 403 &&
        errorData.error?.message.includes("insufficient authentication scopes")
      ) {
        throw new Error(
          "INSUFFICIENT_SCOPES: Token tidak memiliki akses ke Google Calendar. Silakan login ulang."
        );
      }

      throw new Error(
        `Google API Error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Google Calendar API Error:", error);
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
          requestId: `majoo-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
      console.log("🌐 Adding Google Meet for ONLINE schedule");
    } else {
      console.log("🏢 OFFLINE schedule - No Google Meet");
    }

    let meetLink = "";
    let googleEventId = "";

    try {
      const googleResponse = await createGoogleCalendarEvent(
        googleAccessToken,
        googleEvent
      );

      googleEventId = googleResponse.id;

      // Untuk online, dapatkan meetLink dari response
      if (formInput.tipe_outlet === "Online") {
        meetLink = googleResponse.hangoutLink || "";
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
