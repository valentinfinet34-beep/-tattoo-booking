"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BODY_LOCATIONS,
  TIME_SLOTS,
  tattooRequestSchema,
  type TattooRequestInput,
} from "@/lib/validations/tattooRequest.schema";
import { ImageUploader } from "./ImageUploader";

export function TattooRequestForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TattooRequestInput>({
    resolver: zodResolver(tattooRequestSchema),
    defaultValues: {
      bodyLocation: BODY_LOCATIONS[0],
      timeSlot: TIME_SLOTS[0],
      images: [],
    },
  });

  const onSubmit = async (data: TattooRequestInput) => {
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      formData.append("description", data.description);
      formData.append("bodyLocation", data.bodyLocation);
      formData.append("sizeCm", String(data.sizeCm));
      formData.append("preferredDate", data.preferredDate);
      formData.append("timeSlot", data.timeSlot);
      data.images.forEach((file) => formData.append("images", file));

      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("submission failed");

      router.push("/confirmation");
    } catch {
      setSubmitError("Une erreur est survenue, réessaie dans un instant.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 rounded-lg border border-white/10 bg-surface/50 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" error={errors.firstName?.message}>
          <input className="input-field" {...register("firstName")} />
        </Field>
        <Field label="Nom" error={errors.lastName?.message}>
          <input className="input-field" {...register("lastName")} />
        </Field>
      </div>

      <Field label="Email" error={errors.email?.message}>
        <input type="email" className="input-field" {...register("email")} />
      </Field>

      <Field label="Téléphone" error={errors.phone?.message}>
        <input type="tel" className="input-field" {...register("phone")} />
      </Field>

      <Field label="Description du projet" error={errors.description?.message}>
        <textarea
          rows={4}
          className="input-field resize-none"
          placeholder="Style, idée, références..."
          {...register("description")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Emplacement" error={errors.bodyLocation?.message}>
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("bodyLocation")}
          >
            {BODY_LOCATIONS.map((loc) => (
              <option
                key={loc}
                value={loc}
                style={{ backgroundColor: "#1e1714", color: "#f2f0e9" }}
              >
                {loc}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Taille estimée (cm)" error={errors.sizeCm?.message}>
          <input
            type="number"
            min={1}
            max={100}
            className="input-field"
            {...register("sizeCm", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field
        label="Visuels d'inspiration (1 à 3)"
        error={errors.images?.message}
      >
        <Controller
          name="images"
          control={control}
          render={({ field }) => (
            <ImageUploader value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date souhaitée" error={errors.preferredDate?.message}>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("preferredDate")}
          />
        </Field>
        <Field label="Créneau" error={errors.timeSlot?.message}>
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("timeSlot")}
          >
            {TIME_SLOTS.map((slot) => (
              <option
                key={slot}
                value={slot}
                style={{ backgroundColor: "#1e1714", color: "#f2f0e9" }}
              >
                {slot}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full animate-fade-in-up [animation-delay:1100ms]"
      >
        {isSubmitting ? "Envoi..." : "Envoyer ma demande"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground/90 [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
