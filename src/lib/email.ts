// Email service (human-built).
// In production this would integrate with SendGrid / SMTP via a server function.
// In this deployment we persist every outbound email to the EmailLog table so the
// flow is fully functional and auditable, and print to the server log.
import { db } from "./db";
import { COMPANY } from "./constants";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  type: string;
}): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        type: opts.type,
      },
    });
  } catch (e) {
    console.error("Email log failed", e);
  }
  console.log(`[EMAIL:${opts.type}] to=${opts.to} subject="${opts.subject}"`);
}

export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Welcome to ${COMPANY.name} Field Coordinator Portal`,
    type: "welcome",
    body: `Hello ${name},

Welcome to the ${COMPANY.name} Integrated Field Coordinator Portal. Your account has been created successfully.

You can now sign in using your company email (${email}) at the Techadox portal.

${COMPANY.tagline}

— ${COMPANY.name}
${COMPANY.address}
${COMPANY.phone}
${COMPANY.website}
${COMPANY.email}`,
  });
}

export async function sendPasswordResetEmail(
  name: string,
  email: string,
  resetToken: string
): Promise<void> {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || ""}/?reset=${resetToken}`;
  await sendEmail({
    to: email,
    subject: `${COMPANY.name} — Password Reset Request`,
    type: "password_reset",
    body: `Hello ${name},

We received a request to reset your ${COMPANY.name} portal password. Use the reset token below to complete the process.

Reset token: ${resetToken}

If you did not request a password reset, you can safely ignore this email.

— ${COMPANY.name}
${COMPANY.email}`,
  });
}

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  clientName: string,
  total: number
): Promise<void> {
  await sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} from ${COMPANY.name}`,
    type: "invoice",
    body: `Hello,

Please find invoice ${invoiceNumber} for ${clientName} attached. Total due: $${total.toFixed(2)}.

— ${COMPANY.name}
${COMPANY.email}`,
  });
}
