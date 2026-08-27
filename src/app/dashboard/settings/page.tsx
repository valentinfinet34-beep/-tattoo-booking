import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { PortfolioSettings } from "@/components/dashboard/PortfolioSettings";
import { PageSettings } from "@/components/dashboard/PageSettings";
import { DepositSettings } from "@/components/dashboard/DepositSettings";
import { AvailabilitySettings } from "@/components/dashboard/AvailabilitySettings";
import { AvailabilityCalendar } from "@/components/dashboard/AvailabilityCalendar";
import { NotificationSettings } from "@/components/dashboard/NotificationSettings";
import { StripeSection } from "@/components/dashboard/StripeSection";
import { SubscriptionSection } from "@/components/dashboard/SubscriptionSection";
import {
  DEFAULT_ACCENT,
  isAccentColorKey,
  type AccentColorKey,
} from "@/lib/theme-presets";

const SECTIONS = [
  { id: "profil", label: "Mon profil" },
  { id: "page-client", label: "Ma page client" },
  { id: "acomptes", label: "Mes acomptes" },
  { id: "disponibilites", label: "Mes disponibilités" },
  { id: "notifications", label: "Mes notifications" },
  { id: "stripe", label: "Mon compte Stripe" },
  { id: "abonnement", label: "Mon abonnement" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: artist }, { data: blockedDates }, { data: paymentHistory }] =
    await Promise.all([
      supabase
        .from("artists")
        .select(
          "avatar_url, display_name, city, bio, instagram_handle, portfolio_images, cover_image_url, accent_color, welcome_message, practiced_styles, deposit_type, deposit_percentage, deposit_fixed_amount_cents, deposit_expiry_hours, working_days, hours_start, hours_end, min_lead_days, notify_new_request, notify_quote_accepted, notify_deposit_paid, notify_reminder_24h, stripe_account_id, stripe_charges_enabled, stripe_subscription_id, subscription_status, subscription_plan"
        )
        .eq("id", user!.id)
        .single(),
      supabase
        .from("blocked_dates")
        .select("blocked_date")
        .eq("artist_id", user!.id)
        .order("blocked_date", { ascending: true }),
      supabase
        .from("projects")
        .select("id, first_name, last_name, deposit_amount_cents, updated_at")
        .eq("artist_id", user!.id)
        .eq("status", "deposit_paid")
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

  const accentColor: AccentColorKey =
    artist?.accent_color && isAccentColorKey(artist.accent_color)
      ? artist.accent_color
      : DEFAULT_ACCENT;

  let renewalDate: string | null = null;
  if (artist?.stripe_subscription_id) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(
        artist.stripe_subscription_id
      );
      const periodEnd =
        subscription.items.data[0]?.current_period_end;
      if (periodEnd) {
        renewalDate = new Date(periodEnd * 1000).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    } catch {
      renewalDate = null;
    }
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      <nav className="top-6 flex shrink-0 flex-row flex-wrap gap-2 lg:sticky lg:w-48 lg:flex-col">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-12">
        <h1 className="text-3xl text-zinc-100">Paramètres</h1>

        <section id="profil" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mon profil
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Tes informations personnelles, visibles par les clients sur ta
            page.
          </p>
          <ProfileSettings
            avatarUrl={artist?.avatar_url ?? null}
            displayName={artist?.display_name ?? ""}
            city={artist?.city ?? ""}
            bio={artist?.bio ?? ""}
            instagramHandle={artist?.instagram_handle ?? ""}
          />
          <div className="mt-8">
            <PortfolioSettings initialImages={artist?.portfolio_images ?? []} />
          </div>
        </section>

        <section id="page-client" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Ma page client
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Ces réglages s&apos;appliquent directement à ta page de
            réservation publique.
          </p>
          <PageSettings
            coverImageUrl={artist?.cover_image_url ?? null}
            accentColor={accentColor}
            welcomeMessage={artist?.welcome_message ?? ""}
            practicedStyles={artist?.practiced_styles ?? []}
          />
        </section>

        <section id="acomptes" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mes acomptes
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Le montant proposé automatiquement au client quand il accepte un
            devis.
          </p>
          <DepositSettings
            depositType={
              artist?.deposit_type === "fixed" ? "fixed" : "percentage"
            }
            depositPercentage={artist?.deposit_percentage ?? 20}
            depositFixedAmountCents={artist?.deposit_fixed_amount_cents ?? null}
            depositExpiryHours={artist?.deposit_expiry_hours ?? 48}
          />
        </section>

        <section id="disponibilites" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mes disponibilités
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Tes jours et horaires de travail, ainsi que tes congés.
          </p>
          <div className="flex flex-col gap-8">
            <AvailabilitySettings
              workingDays={artist?.working_days ?? [1, 2, 3, 4, 5, 6]}
              hoursStart={artist?.hours_start ?? 9}
              hoursEnd={artist?.hours_end ?? 19}
              minLeadDays={artist?.min_lead_days ?? 0}
            />
            <div>
              <h3 className="mb-3 text-sm font-medium text-zinc-300">
                Congés / périodes bloquées
              </h3>
              <AvailabilityCalendar
                initialBlockedDates={(blockedDates ?? []).map(
                  (row) => row.blocked_date as string
                )}
              />
            </div>
          </div>
        </section>

        <section id="notifications" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mes notifications
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Les emails que tu reçois selon l&apos;avancement de tes demandes.
          </p>
          <NotificationSettings
            notifyNewRequest={artist?.notify_new_request ?? true}
            notifyQuoteAccepted={artist?.notify_quote_accepted ?? true}
            notifyDepositPaid={artist?.notify_deposit_paid ?? true}
            notifyReminder24h={artist?.notify_reminder_24h ?? true}
          />
        </section>

        <section id="stripe" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mon compte Stripe
          </h2>
          <p className="mb-5 text-sm text-zinc-500">
            Connecte ton compte Stripe pour recevoir directement les
            acomptes de tes clients — 100% du montant, sans commission.
          </p>
          <StripeSection
            connected={!!artist?.stripe_charges_enabled}
            hasAccount={!!artist?.stripe_account_id}
            paymentHistory={paymentHistory ?? []}
          />
        </section>

        <section id="abonnement" className="scroll-mt-6">
          <h2 className="mb-1 font-display text-xl tracking-wide text-zinc-100">
            Mon abonnement
          </h2>
          <SubscriptionSection
            status={artist?.subscription_status ?? null}
            plan={artist?.subscription_plan ?? null}
            renewalDate={renewalDate}
          />
        </section>
      </div>
    </div>
  );
}
