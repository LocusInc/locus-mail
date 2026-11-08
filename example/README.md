# Locus Mail example

A standalone app using `@locus-ui/mail`, with five email templates, typed sending
helpers, and a CLI preview.

## Run the preview

Requires Node.js 20.19+ (20.x) or 22.12+. From the repository root:

```sh
npm install
npm run build
cd example
npm install
npm run preview
```

Open [localhost:4110](http://localhost:4110). Choose an email and edit its JSON
props to update the preview. The preview command compiles the example before
launching `locus-mail`.

The library is installed from the parent directory as a local package. Reinstall
it after changing library or preview code.

## Enable test sending

If you don't already have `.env.local`, copy `.env.example` to it in this directory.
Fill in your Resend key and a sender on your verified domain:

```env
RESEND_API_KEY=your-private-key
MAIL_FROM="Locus <mail@your-domain.com>"
```

Restart the preview, enter a recipient, and click **Send**. This sends a real email
using the current preview props. Without both settings, sending stays disabled.
Keep `.env.local` private; it is git-ignored.

## How it's organized

Each folder under `emails/` contains a `*.email.tsx` view with `previewData` and a
`send-*-email.ts` module defining its typed mapper and sending helper. Examples
cover registration, invitations, password changes, receipts, and password resets.

`emails/mailer.ts` owns the shared Resend setup. The preview config loads
`.env.local` and reuses those settings. Application code can call a helper from
the server after loading its environment:

```ts
import { sendRegistrationEmail } from "./emails/register/send-registration-email";

await sendRegistrationEmail({
  firstName: "Wally",
  to: "wally@example.com",
  verificationUrl: "https://example.com/verify/token",
});
```

Previewing never invokes the production mappers or sending helpers.

## Checks

Run `npm run check` here for typechecking and mocked sending checks. From the
repository root, `npm run test:consumer` verifies a fresh tarball installation,
all five templates, preview updates, and test sending. Neither sends real emails.
