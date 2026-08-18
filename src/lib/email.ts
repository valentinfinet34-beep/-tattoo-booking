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
  checkoutUrl,
}: {
  to: string;
  firstName: string;
  depositAmountEur: number;
  checkoutUrl: string;
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
            href="${checkoutUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Régler l'acompte
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :
          <br />${checkoutUrl}
        </p>
      </div>
    `,
  });
}

export async function sendDeclineEmail({
  to,
  firstName,
  artistMessage,
  bookingUrl,
}: {
  to: string;
  firstName: string;
  artistMessage: string | null;
  bookingUrl: string;
}) {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Studio Ink <onboarding@resend.dev>";

  await getResend().emails.send({
    from: fromAddress,
    to,
    subject: "Concernant ta demande de tatouage",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 22px;">Bonjour ${firstName},</h1>
        <p style="font-size: 15px; line-height: 1.6;">
          L'artiste ne peut malheureusement pas donner suite à ta demande de
          tatouage pour le moment.
        </p>
        ${
          artistMessage
            ? `<p style="font-size: 15px; line-height: 1.6; background: #f5f5f5; padding: 12px 16px; border-radius: 8px;">${artistMessage}</p>`
            : ""
        }
        <p style="margin: 28px 0;">
          <a
            href="${bookingUrl}"
            style="background: #c81e1e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;"
          >
            Faire une nouvelle demande
          </a>
        </p>
      </div>
    `,
  });
}
