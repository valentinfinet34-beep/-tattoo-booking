"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BODY_LOCATIONS,
  COLOR_MODES,
  SIZE_CATEGORIES,
  STYLES,
  tattooRequestSchema,
  type TattooRequestInput,
} from "@/lib/validations/tattooRequest.schema";
import { ImageUploader } from "./ImageUploader";
import { DatePicker } from "./DatePicker";
import { TimeSlotPicker } from "./TimeSlotPicker";

const optionStyle = { backgroundColor: "#1e1714", color: "#f2f0e9" };

export function TattooRequestForm({
  blockedDates,
  artistSlug,
  workingDays,
  minLeadDays,
  practicedStyles,
}: {
  blockedDates: string[];
  artistSlug: string;
  workingDays?: number[];
  minLeadDays?: number;
  practicedStyles?: (typeof STYLES)[number][];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const availableStyles: (typeof STYLES)[number][] =
    practicedStyles && practicedStyles.length > 0 ? practicedStyles : [...STYLES];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TattooRequestInput>({
    resolver: zodResolver(tattooRequestSchema),
    defaultValues: {
      bodyLocation: BODY_LOCATIONS[0],
      sizeCategory: SIZE_CATEGORIES[0],
      style: availableStyles[0],
      colorMode: COLOR_MODES[0],
      preferredDate: "",
      preferredTime: "",
      images: [],
    },
  });

  const watchedDate = watch("preferredDate");

  const onSubmit = async (data: TattooRequestInput) => {
    setSubmitError(null);

    const formData = new FormData();
    formData.append("artistSlug", artistSlug);
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("description", data.description);
    formData.append("bodyLocation", data.bodyLocation);
    formData.append("sizeCategory", data.sizeCategory);
    formData.append("style", data.style);
    formData.append("colorMode", data.colorMode);
    formData.append("preferredDate", data.preferredDate);
    formData.append("preferredTime", data.preferredTime);
    data.images.forEach((file) => formData.append("images", file));

    const res = await fetch("/api/requests", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body?.error?.preferredDate?.[0] ??
        body?.error?.preferredTime?.[0] ??
        "Une erreur est survenue, réessaie dans un instant.";
      setSubmitError(message);
      return;
    }

    router.push(`/confirmation?slug=${artistSlug}`);
  };

  const onInvalid = (formErrors: typeof errors) => {
    const firstErrorField = Object.keys(formErrors)[0];
    if (firstErrorField) {
      document
        .getElementById(`field-${firstErrorField}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      noValidate
      className="flex flex-col gap-5 rounded-lg border border-white/10 bg-surface/50 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName" label="Prénom" error={errors.firstName?.message}>
          <input className="input-field" {...register("firstName")} />
        </Field>
        <Field name="lastName" label="Nom" error={errors.lastName?.message}>
          <input className="input-field" {...register("lastName")} />
        </Field>
      </div>

      <Field name="email" label="Email" error={errors.email?.message}>
        <input type="email" className="input-field" {...register("email")} />
      </Field>

      <Field name="phone" label="Téléphone" error={errors.phone?.message}>
        <input type="tel" className="input-field" {...register("phone")} />
      </Field>

      <Field
        name="description"
        label="Description du projet"
        error={errors.description?.message}
      >
        <textarea
          rows={4}
          className="input-field resize-none"
          placeholder="Précise ton idée, tes envies, tes références..."
          {...register("description")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="bodyLocation"
          label="Zone du corps"
          error={errors.bodyLocation?.message}
        >
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("bodyLocation")}
          >
            {BODY_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} style={optionStyle}>
                {loc}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="sizeCategory"
          label="Taille approximative"
          error={errors.sizeCategory?.message}
        >
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("sizeCategory")}
          >
            {SIZE_CATEGORIES.map((size) => (
              <option key={size} value={size} style={optionStyle}>
                {size}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field name="style" label="Style souhaité" error={errors.style?.message}>
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("style")}
          >
            {availableStyles.map((style) => (
              <option key={style} value={style} style={optionStyle}>
                {style}
              </option>
            ))}
          </select>
        </Field>
        <Field name="colorMode" label="Couleur" error={errors.colorMode?.message}>
          <select
            className="input-field"
            style={{ colorScheme: "dark" }}
            {...register("colorMode")}
          >
            {COLOR_MODES.map((mode) => (
              <option key={mode} value={mode} style={optionStyle}>
                {mode}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        name="images"
        label="Photo de référence (optionnel, 3 max)"
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

      <Field
        name="preferredDate"
        label="Date souhaitée"
        error={errors.preferredDate?.message}
      >
        <Controller
          name="preferredDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              blockedDates={blockedDates}
              workingDays={workingDays}
              minLeadDays={minLeadDays}
            />
          )}
        />
      </Field>

      <Field
        name="preferredTime"
        label="Horaire souhaité"
        error={errors.preferredTime?.message}
      >
        <Controller
          name="preferredTime"
          control={control}
          render={({ field }) => (
            <TimeSlotPicker
              date={watchedDate}
              value={field.value}
              onChange={field.onChange}
              artistSlug={artistSlug}
            />
          )}
        />
      </Field>

      {hasErrors && (
        <p className="text-sm text-red-400">
          Certains champs doivent être corrigés (voir en rouge ci-dessus).
        </p>
      )}
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
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`field-${name}`}>
      <label className="mb-1.5 block text-xs font-medium text-foreground/90 [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
