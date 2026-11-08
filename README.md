# Locus Mail

Locus Mail lets you build emails as React components, preview them locally, and
send them through a typed API with a swappable transport. Resend is included.

## Quick setup

Requires Node.js 20.19+ (20.x) or 22.12+.

```sh
npm install @locus-ui/mail
```

Create an email template with a default React component and named `previewData`
containing its sample props:

```tsx
// emails/welcome.email.tsx
interface WelcomeProps {
  firstName: string;
}

export const previewData: WelcomeProps = {
  firstName: "Wally",
};

export default function WelcomeEmail({ firstName }: WelcomeProps) {
  return (
    <html lang="en">
      <body>
        <h1>Welcome, {firstName}!</h1>
      </body>
    </html>
  );
}
```

Templates own their HTML and styling. Preview props are separate from production
data loading and sending.

## Set up the mailer

Create a Resend API key and verify your sending domain. Set `RESEND_API_KEY` and
`MAIL_FROM` (for example, `Locus <mail@your-domain.com>`) in your server environment.
Keep the key private and the configured mailer out of client code.

Define how your template gets its props, recipient, subject, and plain-text body,
then send it from server code:

```ts
// mailer.ts
import { createMailer, createResendTransport } from "@locus-ui/mail";

export const mailer = createMailer({
  from: process.env.MAIL_FROM!,
  transport: createResendTransport({
    apiKey: process.env.RESEND_API_KEY!,
  }),
});
```

```ts
// send-welcome-email.ts
import { email } from "@locus-ui/mail";
import { mailer } from "./mailer";
import WelcomeEmail from "./emails/welcome.email";

type WelcomeInput = {
  firstName: string;
  to: string;
};

const welcome = email({
  id: "welcome",
  name: "Welcome",
  template: WelcomeEmail,
  mapToSend: ({ firstName, to }: WelcomeInput) => {
    return {
      data: {
        firstName,
      },
      sendOptions: {
        to,
        subject: `Welcome, ${firstName}!`,
      },
      text: `We're glad to see you here!`,
    };
  },
});

await mailer.send(welcome, {
  firstName: "Wally",
  to: "wally@example.com",
});
```

Add any application-specific validation or data loading inside the mapper.
TypeScript infers the send input from it. A successful result contains the
provider's message ID and means
the request was accepted, not confirmed inbox delivery. To use another provider,
pass your own `MailTransport` to `createMailer`.

## Run the preview

From your project directory after installing `@locus-ui/mail`:

```sh
npx locus-mail
```

Open [localhost:4000](http://localhost:4000). The CLI discovers
`**/*.email.tsx` files in the current directory. Select a template, edit its JSON
props, inspect or export its HTML, and switch between desktop and mobile widths.
Template and sample-prop changes refresh automatically.

Customize the directory, discovery pattern, or port when needed:

```sh
npx locus-mail --root . --path 'emails/**/*.email.tsx' --port 4110
```

Use `npx locus-mail --help` for all options. No separate Next.js or Tailwind setup
is required.

For a one-off preview without installing locally, run
`npx --package @locus-ui/mail locus-mail`.

To enable **Send a test email** in the preview, add `locus-mail.config.mjs`:

```js
import { createResendTransport, defineConfig } from "@locus-ui/mail";

export default defineConfig({
  previewSend: {
    from: process.env.MAIL_FROM,
    transport: createResendTransport({
      apiKey: process.env.RESEND_API_KEY,
    }),
  },
});
```

Set the environment variables before starting the CLI and restart after changing
them. The CLI does not automatically load `.env` files. The test-send button stays
disabled without `previewSend`; when configured, it sends the current editor props
to the address you enter, independently of production mappers.

See the [consumer example](example/README.md) for a complete project and
Resend test-email setup.
