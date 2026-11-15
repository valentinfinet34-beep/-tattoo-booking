"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  COLOR_MODES,
  SIZE_CATEGORIES,
  tattooRequestSchema,
  type TattooRequestInput,
} from "@/lib/validations/tattooRequest.schema";
import {
  BODY_LOCATION_GROUPS,
  DETAIL_MAX_LENGTH,
  LETTERING,
  LETTERING_STYLES,
  OTHER,
  itemLabel,
  styleGroupsFor,
} from "@/lib/tattoo-catalog";
import { CatalogPicker } from "@/components/CatalogPicker";
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
  practicedStyles?: string[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const styleGroups = useMemo(() => styleGroupsFor(practicedStyles), [practicedStyles]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TattooRequestInput>({
    resolver: zodResolver(tattooRequestSchema),
    defaultValues: {
      // Zone et style démarrent vides : le client choisit vraiment, au lieu
      // d'envoyer par erreur le premier choix de la liste.
      bodyLocation: "",
      bodyLocationDetail: "",
      sizeCategory: SIZE_CATEGORIES[0],
      style: "",
      styleDetail: "",
      letteringStyle: "",
      colorMode: COLOR_MODES[0],
      preferredDate: "",
      preferredTime: "",
      images: [],
    },
  });

  const watchedDate = watch("preferredDate");
  const watchedBodyLocation = watch("bodyLocation");
  const watchedStyle = watch("style");
  const watchedLettering = watch("letteringStyle");

  const isLettering = watchedStyle === LETTERING;
  const needsStyleDetail =
    watchedStyle === OTHER || (isLettering && watchedLettering === OTHER);

  const onSubmit = async (data: TattooRequestInput) => {
    setSubmitError(null);

    const formData = new FormData();
    formData.append("website", honeypotRef.current?.value ?? "");
    formData.append("artistSlug", artistSlug);
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("description", data.description);
    formData.append("bodyLocation", data.bodyLocation);
    formData.append("bodyLocationDetail", data.bodyLocationDetail ?? "");
    formData.append("sizeCategory", data.sizeCategory);
    formData.append("style", data.style);
    formData.append("styleDetail", data.styleDetail ?? "");
    formData.append("letteringStyle", data.letteringStyle ?? "");
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
      const fieldErrors =
        body?.error && typeof body.error === "object"
          ? (Object.values(body.error) as unknown[])
          : [];
      const firstFieldError = fieldErrors
        .flat()
        .find((entry): entry is string => typeof entry === "string");
      const message =
        body?.error?.preferredDate?.[0] ??
        body?.error?.preferredTime?.[0] ??
        firstFieldError ??
        (res.status === 413
          ? "Tes photos sont trop lourdes. Retire-en une ou choisis des images plus légères."
          : "Une erreur est survenue, réessaie dans un instant.");
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
      className="flex flex-col gap-7 rounded-2xl border border-white/10 bg-surface/50 p-6 shadow-[0_25px_70px_-25px_rgba(0,0,0,0.65)] backdrop-blur-xl"
    >
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <FormSection title="Tes coordonnées">
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
      </FormSection>

      <FormSection title="Ton projet">
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

        <Field
          name="bodyLocation"
          label="Zone du corps"
          error={errors.bodyLocation?.message}
        >
          <Controller
            name="bodyLocation"
            control={control}
            render={({ field }) => (
              <CatalogPicker
                title="Zone du corps"
                groups={BODY_LOCATION_GROUPS}
                placeholder="Choisis une zone"
                searchPlaceholder="Rechercher une zone"
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.bodyLocation)}
              />
            )}
          />
        </Field>

        <Field
          name="bodyLocationDetail"
          label={
            watchedBodyLocation === OTHER
              ? "Précise la zone du corps"
              : "Précision sur l'emplacement (optionnel)"
          }
          error={errors.bodyLocationDetail?.message}
        >
          <input
            className="input-field"
            maxLength={DETAIL_MAX_LENGTH}
            placeholder={
              watchedBodyLocation === OTHER
                ? "Ex. derrière le genou, entre les omoplates…"
                : "Ex. côté gauche, face intérieure…"
            }
            {...register("bodyLocationDetail")}
          />
        </Field>

        <Field name="style" label="Style souhaité" error={errors.style?.message}>
          <Controller
            name="style"
            control={control}
            render={({ field }) => (
              <CatalogPicker
                title="Style souhaité"
                groups={styleGroups}
                placeholder="Choisis un style"
                searchPlaceholder="Rechercher un style"
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.style)}
              />
            )}
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Tu ne connais pas le nom du style ? Choisis « Je ne sais pas encore »
            ou « Autre » et décris-le avec tes mots.
          </p>
        </Field>

        {isLettering && (
          <Field
            name="letteringStyle"
            label="Style d'écriture souhaité"
            error={errors.letteringStyle?.message}
          >
            <select
              className="input-field"
              style={{ colorScheme: "dark" }}
              {...register("letteringStyle")}
            >
              <option value="" style={optionStyle}>
                Choisis un style d&apos;écriture
              </option>
              {LETTERING_STYLES.map((item) => (
                <option key={item.value} value={item.value} style={optionStyle}>
                  {itemLabel(item)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted">
              Pense à écrire le texte exact à tatouer dans la description du
              projet.
            </p>
          </Field>
        )}

        {needsStyleDetail && (
          <Field
            name="styleDetail"
            label={isLettering ? "Précise le style d'écriture" : "Précise le style souhaité"}
            error={errors.styleDetail?.message}
          >
            <input
              className="input-field"
              maxLength={DETAIL_MAX_LENGTH}
              placeholder={
                isLettering
                  ? "Ex. comme l'écriture de ma grand-mère, police d'un film…"
                  : "Ex. mélange de gravure et d'aquarelle…"
              }
              {...register("styleDetail")}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
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
      </FormSection>

      <FormSection title="Ton rendez-vous">
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
      </FormSection>

      {hasErrors && (
        <p className="text-sm text-red-400">
          Certains champs doivent être corrigés (voir en rouge ci-dessus).
        </p>
      )}
      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full text-base transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        {isSubmitting ? "Envoi..." : "Envoyer ma demande →"}
      </button>

      <p className="-mt-3 text-center text-[11px] text-muted">
        En envoyant ce formulaire, tu acceptes que tes données soient
        traitées conformément à notre{" "}
        <Link href="/confidentialite" target="_blank" className="text-accent hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent" />
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted">
          {title}
        </p>
      </div>
      {children}
    </div>
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
