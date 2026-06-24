import { Resend } from "resend";
import { logger } from "./logger";

// Create instance lazily to avoid throwing if not configured
let resend: Resend | null = null;

const getResend = () => {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn(
      { type: "email_not_configured" },
      "RESEND_API_KEY is not set. Emails will not be sent.",
    );
    return null;
  }
  resend = new Resend(key);
  return resend;
};

export async function sendQuotaWarningEmail(to: string, feature: string) {
  const client = getResend();
  if (!client) return;

  try {
    await client.emails.send({
      from: "JobVerse <noreply@jobverse.io>",
      to,
      subject: `Action Required: JobVerse ${feature} Quota Low`,
      html: `
        <p>Hi there,</p>
        <p>You are running low on your quota for <strong>${feature}</strong>.</p>
        <p>Please upgrade your plan to continue using this feature without interruption.</p>
        <br/>
        <p>Best,<br/>The JobVerse Team</p>
      `,
    });
    logger.info({ to, feature, type: "email_sent" }, "Sent quota warning email");
  } catch (error) {
    logger.error(
      { to, feature, error, type: "email_failure" },
      "Failed to send quota warning email",
    );
  }
}
