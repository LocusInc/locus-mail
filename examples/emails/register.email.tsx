import { EmailLayout } from "../../src";

export interface RegistrationEmailProps {
  firstName: string;
  verificationUrl: string;
  organizationName?: string;
}

/** Ready-to-render development props, separate from notification inputs. */
export const previewData = {
  firstName: "Wally",
  verificationUrl: "https://example.com/verify?token=preview-only",
  organizationName: "Locus",
} satisfies RegistrationEmailProps;

/** A reusable view: no data fetching or send options. */
export default function RegistrationEmail({
  firstName,
  verificationUrl,
  organizationName,
}: RegistrationEmailProps) {
  return (
    <EmailLayout title="Confirm your registration">
      <h1>Welcome, {firstName}!</h1>
      <p>
        Thanks for registering
        {organizationName ? ` at ${organizationName}` : ""}. Confirm your email
        address to get started.
      </p>
      <p>
        <a href={verificationUrl}>Confirm registration</a>
      </p>
      <p>If you did not register, you can ignore this email.</p>
    </EmailLayout>
  );
}
