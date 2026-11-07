# Packaged consumer example

This is a separate application that imports only the public `locus-mail` package.
Use Node.js 20.19+ (20.x) or 22.12+; older runtimes cannot load the preview's
CommonJS-to-ES-module CSS dependency chain.
Its dependencies must be installed before its TypeScript files can compile; the
repository's root typecheck intentionally excludes it.

From the repository root, run:

```sh
npm run test:consumer
```

The check builds and packs the library, copies this example into a fresh temporary
directory outside the repository, and installs the tarball with npm. It compiles
against the installed declarations, checks mock sending and runtime failures,
starts the installed CLI, checks discovery and preview edits through its HTTP API,
and changes the template fixture to verify refreshed props and HTML. It stops the
preview and removes the temporary directory on completion. Installation requires
npm registry access or a populated cache. It never contacts a delivery provider.

Use `npm run test:consumer -- --keep` to retain the temporary application for
inspection. In the printed consumer directory, run `npm run preview` and open
http://localhost:4110. The test changes the temporary fixture's name to
`Live update`; select `register`, edit `firstName` in the JSON panel, and check the
iframe. Restore resets to that fixture. Editing the template or exported
`previewData` refreshes the browser automatically.

## Manual installation and authoring

To try the example in place:

```sh
npm install
npm run check
npm run preview
```

First run `npm run build` at the library root to generate its public declarations.
Then run the commands above from `examples/consumer`. Installing the example's
dependency also resolves its editor diagnostics; the repository's root install
does not install this separate application's dependencies. Its `NodeNext`
configuration resolves package exports while emitting CommonJS for this example.

The example manifest uses a local package dependency for development. To verify a
release candidate, first run `npm pack` at the library root, then install that
tarball in the consumer with `npm install /absolute/path/locus-mail-0.1.0.tgz`.
The automated check always installs a tarball rather than a workspace link.

`emails/register.email.tsx` exports a synchronous React view and fully loaded
`previewData`. JSX files use `.tsx`; a `.email.ts` file can use `createElement`,
but requires a custom discovery glob because the default is `**/*.email.tsx`.
The view owns its complete HTML document. `registration.ts` connects that view to
a typed, runtime-validated mapper that provides recipients, subject, and text.
Preview props and production inputs are independent; the preview never calls the
mapper. `check.ts` exercises both using imports from the installed package.

`locus-mail.config.mjs` limits discovery to `emails/**/*.email.tsx` and chooses
port 4110. CLI overrides are available, for example:

```sh
npm run preview -- --root . --path 'emails/**/*.email.tsx' --port 4111
```

## Provider setup

The example uses mocks exclusively. For production sending, create the configured
mailer in a server module, with the Resend key in a private environment variable:

```ts
import { createMailer, createResendTransport } from "locus-mail";
import { registration } from "./registration";

const mailer = createMailer({
  from: "Locus <notifications@your-verified-domain.com>",
  transport: createResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

await mailer.send(registration, {
  firstName: "Wally",
  recipient: "wally@example.com",
  verificationUrl: "https://example.com/verify/token",
});
```

Use a verified sender configured in Resend. In a Next.js application, add
`import "server-only"` to the configured mailer module. Keep it outside template,
preview, and client import graphs. Sending returns provider acceptance, not inbox
delivery confirmation. See the root README for address overrides and error stages.

## MVP limitations and follow-ups

- The preview is a trusted local development tool that executes template modules.
  It is not a hosted multi-user service or a production sending endpoint.
- The packaged preview includes Next.js and its UI dependencies and writes dev
  caches into the installed package; read-only installations need a future
  writable-cache strategy. The CLI currently uses Webpack.
- Validation and production data loading belong to notification mappers. Preview
  JSON editing checks JSON syntax, not notification business rules.
- The initial Resend adapter supports addresses, subject, HTML, and text. Attachments,
  provider tags, idempotency keys, delivery webhooks, queues, and retry policies
  remain follow-up work. Timeouts require checking provider logs before retrying.
- Automated integration checks use HTTP preview requests and mocked delivery.
  Browser interaction and real email-client rendering remain separate checks;
  no claim of production inbox delivery is made by this fixture.
