import { NextResponse } from "next/server";
import { tattooRequestSchema } from "@/lib/validations/tattooRequest.schema";
import { createAdminClient } from "@/lib/supabase/admin";

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
    timeSlot: formData.get("timeSlot"),
    images,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // MVP mono-artiste : on rattache la demande au seul artiste existant.
  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id")
    .limit(1)
    .single();

  if (artistError || !artist) {
    return NextResponse.json(
      { error: "Aucun artiste configuré sur ce studio" },
      { status: 500 }
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
    time_slot: parsed.data.timeSlot,
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
