import { NextResponse } from "next/server";
import { tattooRequestSchema } from "@/lib/validations/tattooRequest.schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvailableSlots } from "@/lib/scheduling";

export async function POST(request: Request) {
  const formData = await request.formData();

  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);

  const parsed = tattooRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    description: formData.get("description"),
    bodyLocation: formData.get("bodyLocation"),
    sizeCm: Number(formData.get("sizeCm")),
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    images,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const artistSlug = formData.get("artistSlug");
  if (typeof artistSlug !== "string" || !artistSlug) {
    return NextResponse.json({ error: "Artiste manquant" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", artistSlug)
    .maybeSingle();

  if (artistError || !artist) {
    return NextResponse.json(
      { error: "Studio introuvable" },
      { status: 404 }
    );
  }

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("artist_id", artist.id)
    .eq("blocked_date", parsed.data.preferredDate)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json(
      {
        error: {
          preferredDate: [
            "Le tatoueur est complet pour cette date, merci de choisir un autre créneau.",
          ],
        },
      },
      { status: 400 }
    );
  }

  const { data: bookings } = await supabase
    .from("projects")
    .select("scheduled_start_time, duration_hours")
    .eq("artist_id", artist.id)
    .eq("preferred_date", parsed.data.preferredDate)
    .in("status", ["accepted", "deposit_paid"])
    .not("scheduled_start_time", "is", null);

  const occupied = (bookings ?? [])
    .filter((b) => b.scheduled_start_time && b.duration_hours)
    .map((b) => ({
      startTime: (b.scheduled_start_time as string).slice(0, 5),
      durationHours: b.duration_hours as number,
    }));

  const availableSlots = generateAvailableSlots(occupied);

  if (!availableSlots.includes(parsed.data.preferredTime)) {
    return NextResponse.json(
      {
        error: {
          preferredTime: [
            "Ce créneau n'est plus disponible, merci d'en choisir un autre.",
          ],
        },
      },
      { status: 400 }
    );
  }

  const imageUrls: string[] = [];

  for (const image of parsed.data.images) {
    const extension = image.name.split(".").pop() ?? "jpg";
    const path = `${artist.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("inspiration-images")
      .upload(path, image, { contentType: image.type });

    if (uploadError) {
      return NextResponse.json(
        { error: "Échec de l'upload des images" },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("inspiration-images")
      .getPublicUrl(path);

    imageUrls.push(publicUrl.publicUrl);
  }

  const { error: insertError } = await supabase.from("projects").insert({
    artist_id: artist.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    description: parsed.data.description,
    body_location: parsed.data.bodyLocation,
    size_cm: parsed.data.sizeCm,
    preferred_date: parsed.data.preferredDate,
    time_slot: parsed.data.preferredTime,
    image_urls: imageUrls,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la demande" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
