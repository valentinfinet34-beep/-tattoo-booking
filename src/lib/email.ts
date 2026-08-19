import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY n'est pas configurée");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export async function sendDepositLinkEmail({
  to,
  firstName,
  depositAmountEur,
  payUrl,
}: {
  to: string;
  firstName: string;
  depositAmountEur: number;
  payUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: "Ton projet de tatouage est accepté — règle ton acompte",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Bonne nouvelle, ${firstName} !</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          Ton projet de tatouage a été accepté par l'artiste. Pour confirmer
          ton rendez-vous, il ne reste plus qu'à régler l'acompte de
          <strong>${depositAmountEur} €</strong>.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${payUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Régler l'acompte
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">
          Si tu annules le rendez-vous, l'acompte n'est pas remboursable. Si
          l'artiste annule, il t'est intégralement remboursé sous 5 à 7 jours
          — le détail est rappelé sur la page de paiement.
        </p>
        <p style="font-size: 13px; color: #666;">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :
          <br />${payUrl}
        </p>
      </div>
    `,
  });
}

export async function sendQuoteEmail({
  to,
  firstName,
  quotedPriceEur,
  quoteUrl,
}: {
  to: string;
  firstName: string;
  quotedPriceEur: number;
  quoteUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Ton devis est prêt — ${quotedPriceEur} €`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Bonjour ${firstName},</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          L'artiste a étudié ton projet et propose un prix de
          <strong>${quotedPriceEur} €</strong>. Tu peux accepter ou décliner
          ce devis directement en ligne, sans rien renvoyer par message.
        </p>
        <p style="margin: 28px 0; display: flex; gap: 12px;">
          <a
            href="${quoteUrl}?action=accept"
            style="background: #22c55e; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;"
          >
            Accepter le devis
          </a>
          <a
            href="${quoteUrl}?action=decline"
            style="background: #3f3f46; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Décliner
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">
          Si les boutons ne fonctionnent pas, copie ce lien dans ton
          navigateur :
          <br />${quoteUrl}
        </p>
      </div>
    `,
  });
}

export async function sendQuoteDeclinedEmail({
  to,
  clientFirstName,
  clientLastName,
  quotedPriceEur,
}: {
  to: string;
  clientFirstName: string;
  clientLastName: string;
  quotedPriceEur: number;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Devis décliné — ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Devis décliné</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientFirstName} ${clientLastName} a décliné le devis de
          <strong>${quotedPriceEur} €</strong>. La demande est archivée dans
          ton dashboard, aucune action n'est nécessaire de ta part.
        </p>
      </div>
    `,
  });
}

export async function sendNewRequestEmail({
  to,
  clientFirstName,
  clientLastName,
  dashboardUrl,
}: {
  to: string;
  clientFirstName: string;
  clientLastName: string;
  dashboardUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Nouvelle demande — ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Nouvelle demande reçue</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientFirstName} ${clientLastName} vient de soumettre une
          demande de tatouage. Va voir son projet dans ton dashboard pour lui
          envoyer un devis.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${dashboardUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Voir la demande
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendQuoteAcceptedEmail({
  to,
  clientFirstName,
  clientLastName,
  depositAmountEur,
  dashboardUrl,
}: {
  to: string;
  clientFirstName: string;
  clientLastName: string;
  depositAmountEur: number;
  dashboardUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Devis accepté — ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Devis accepté</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientFirstName} ${clientLastName} a accepté ton devis. Un lien
          de paiement d'acompte de <strong>${depositAmountEur} €</strong> lui
          a été envoyé automatiquement.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${dashboardUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Voir dans le dashboard
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendDepositPaidEmail({
  to,
  clientFirstName,
  clientLastName,
  depositAmountEur,
  dashboardUrl,
}: {
  to: string;
  clientFirstName: string;
  clientLastName: string;
  depositAmountEur: number;
  dashboardUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Acompte payé — ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Acompte réglé 🎉</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          ${clientFirstName} ${clientLastName} vient de régler son acompte
          de <strong>${depositAmountEur} €</strong>. Le rendez-vous est
          confirmé et ajouté à ton agenda.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${dashboardUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Voir mon agenda
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendAppointmentReminderEmail({
  to,
  clientFirstName,
  clientLastName,
  appointmentDate,
  appointmentTime,
  dashboardUrl,
}: {
  to: string;
  clientFirstName: string;
  clientLastName: string;
  appointmentDate: string;
  appointmentTime: string;
  dashboardUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: `Rappel — RDV demain avec ${clientFirstName} ${clientLastName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">RDV demain</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          Rappel : tu as rendez-vous avec <strong>${clientFirstName} ${clientLastName}</strong>
          demain (${appointmentDate}) à <strong>${appointmentTime}</strong>.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${dashboardUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Voir mon agenda
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendDeclineEmail({
  to,
  firstName,
  artistMessage,
  rescheduleUrl,
}: {
  to: string;
  firstName: string;
  artistMessage: string | null;
  rescheduleUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: "Choisis une autre date pour ta demande de tatouage",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Bonjour ${firstName},</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          La date demandée ne convient pas à l'artiste. Pas besoin de tout
          resaisir : choisis directement une autre date disponible pour ta
          demande.
        </p>
        ${
          artistMessage
            ? `<p style="font-size: 15px; line-height: 1.6; background: #f5f5f5; padding: 12px 16px; border-radius: 8px;">${artistMessage}</p>`
            : ""
        }
        <p style="margin: 28px 0;">
          <a
            href="${rescheduleUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Choisir une autre date
          </a>
        </p>
      </div>
    `,
  });
}
