import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvailableSlots, isDateBookable } from "@/lib/scheduling";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const slug = searchParams.get("slug");
  const skipWorkingDaysCheck = searchParams.get("ignoreWorkingDays") === "1";

  if (!date || !slug) {
    return NextResponse.json(
      { error: "Date ou artiste manquant" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, working_days, min_lead_days, hours_start, hours_end")
    .eq("slug", slug)
    .maybeSingle();

  if (!artist) {
    return NextResponse.json({ slots: [] });
  }

  if (
    !skipWorkingDaysCheck &&
    !isDateBookable(date, artist.working_days ?? [1, 2, 3, 4, 5, 6], artist.min_lead_days ?? 0)
  ) {
    return NextResponse.json({ slots: [] });
  }

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("artist_id", artist.id)
    .eq("blocked_date", date)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json({ slots: [] });
  }

  const { data: bookings } = await supabase
    .from("projects")
    .select("scheduled_start_time, duration_hours")
    .eq("artist_id", artist.id)
    .eq("preferred_date", date)
    .in("status", ["accepted", "deposit_paid"])
    .not("scheduled_start_time", "is", null);

  const occupied = (bookings ?? [])
    .filter((b) => b.scheduled_start_time && b.duration_hours)
    .map((b) => ({
      startTime: (b.scheduled_start_time as string).slice(0, 5),
      durationHours: b.duration_hours as number,
    }));

  return NextResponse.json({
    slots: generateAvailableSlots(occupied, {
      startHour: artist.hours_start ?? 9,
      endHour: artist.hours_end ?? 19,
    }),
  });
}
