export interface RegistrationProps {
  firstName: string;
  verificationUrl: string;
}

export const previewData: RegistrationProps = {
  firstName: "Wally",
  verificationUrl: "https://example.com/verify/preview",
};

export default function RegistrationEmail({ firstName, verificationUrl }: RegistrationProps) {
  return (
    <html>
      <body>
        <h1>Welcome, {firstName}</h1>
        <a href={verificationUrl}>Confirm your registration</a>
      </body>
    </html>
  );
}
