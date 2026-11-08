# Locus Mail

Reusable React email views, referenced by separate definitions that collect data
and prepare messages. The author owns input requirements and validation. Includes
a local preview browser and typed sending with a swappable Resend transport.
Use Node.js 20.19+ (20.x) or 22.12+ for preview dependency compatibility.

## A template is a React component

The `.email.tsx` file contains presentation and its props interface. It has no data
loader, recipient details, or required preview fixtures.

```tsx
// welcome.email.tsx
export interface WelcomeProps {
  firstName: string;
}

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

Use ordinary HTML elements and reusable React components. The full
[registration view](examples/consumer/emails/register.email.tsx) owns its document layout.
React escapes text and attribute values; do not manually HTML-escape JSX props.

## Own the email layout

Each template owns its HTML document, metadata, and styling. Use ordinary React
components for any layout pieces you choose to share.

```tsx
export default function WelcomeEmail({ firstName }: { firstName: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Welcome</title>
      </head>
      <body>
        <h1>Welcome, {firstName}!</h1>
        <p>Thanks for joining us.</p>
      </body>
    </html>
  );
}
```

The document title is separate from the email subject supplied by the
notification's `sendOptions`.

## Define how the email collects its data

Reference the view from a separate `.notification.ts` file. The author's
`mapToSend` function decides what callers supply, what needs loading, and whether
there is enough information to prepare an email. No input schema is required.
Caller inputs can be entirely different from the props displayed by the view.

```ts
// registration-created.notification.ts
import { email } from "./src";
import WelcomeEmail from "./welcome.email";

export const registrationEmail = email({
  id: "register",
  name: "Registration confirmation",
  template: WelcomeEmail,
  mapToSend: async ({ userId }: { userId: string }) => {
    const user = await loadUser(userId); // Your application's data loader.
    if (!user) return null;
    return {
      data: { firstName: user.firstName },
      sendOptions: {
        to: user.email,
        subject: `Welcome, ${user.firstName}!`,
      },
      text: `Welcome, ${user.firstName}!`,
    };
  },
});

const message = await registrationEmail.render({ userId: "user-123" });
if (message) {
  console.log(
    message.subject,
    message.html,
    message.text,
    message.sendOptions.to,
  );
}
```

`loadUser` above is application code, not a package function. The complete
[registration definition](examples/consumer/notifications/registration-created.notification.ts)
uses injected dependencies so it can be connected to a real data source or a test
fixture. It chooses to validate collected data with Zod inside the mapper; this is
application code, not a Locus Mail schema requirement.

The template reference determines the required props of `data`: returning a missing
or incorrectly typed prop is a TypeScript error. A template can be referenced by
multiple definitions with different data loaders, subjects, or recipients.

`sendOptions` requires a nonempty single-line `subject`; other application/provider
fields retain their inferred types and pass through unchanged to custom transports.
`text` is an
explicit plain-text body alongside the React-rendered HTML.

## The mapper owns readiness

- Return `{ data, sendOptions, text }` when the email is ready.
- Return `null` to intentionally skip it.
- Throw when loading or validation fails. The error propagates; nothing renders.

The package does not require registration IDs, recipients, or other domain fields
as input. Annotate the mapper parameter to get TypeScript checking at call sites.
A no-argument mapper can also be used, and its `render()` and `prepare()` methods
need no arguments.

`await prepare(input)` passes the caller's input unchanged to `mapToSend`, and
returns its result after checking the basic message structure, subject, and text.
`await render(input)` then renders the referenced React component to static HTML,
returning `{ subject, html, text, sendOptions }`. Both return `null` when skipped.
Neither method sends a message; each invokes the mapper once per call.

`EmailInput<typeof definition>` is the mapper's input type.
`EmailData<typeof definition>` is the referenced component's props type. TypeScript
checks that the mapper supplies those props, but provides no runtime validation.
Any validation, normalization, defaults, or business rules belong inside the mapper
or its loaders. There are no package-provided `parse` / `safeParse` methods.

There are no implicit production defaults. The registration mapper requires a
first name, verification URL, and recipient email from its loader; missing values
fail validation before rendering. Its optional organization name is omitted from
HTML and text when absent. Authors can implement explicit defaults in their own
mapper or schema. Preview fixtures never supply missing production values.

`id` is a stable lowercase slug independent of the path; `name` is a nonempty
display name. The implementation lives in `src/email.ts` and shared types in
`src/template.ts`.

## Preview directly from template props

Email files can export a named `previewData` object alongside their component.
These are complete, already-loaded display props, not inputs to `mapToSend`:

```tsx
// welcome.email.tsx
export const previewData = {
  firstName: "Wally",
} satisfies WelcomeProps;
```

The registration example includes a typed `previewData` export. Render it without
creating a notification or connecting a data source:

```ts
import { renderPreview } from "./src";
import RegistrationEmail, {
  previewData,
} from "./examples/consumer/emails/register.email";

const preview = renderPreview(RegistrationEmail, previewData);
console.log(preview.html);

// Edited values from the future JSON editor can be supplied directly.
const edited = renderPreview(RegistrationEmail, {
  ...previewData,
  firstName: "Ada",
});
```

`renderPreview(template, props)` is synchronous and returns `{ html }`. The
notification convenience method, `definition.renderPreview(props)`, does exactly
the same thing. Neither calls `mapToSend` or its loaders, and neither needs a
subject, plain-text body, recipient, or other send options.

Preview props are required and checked against the component's type by TypeScript.
Missing props objects, component errors, and empty HTML fail clearly. JSON edited
at runtime is not schema-validated automatically; the future preview UI should
report JSON and rendering errors. Sample values are never merged into props or
production inputs, and production rendering never reads the `previewData` export.
Templates remain usable in production without sample exports.

This replaces the earlier notification-level `preview` option and the preview API
that accepted mapper inputs. Discovery loads each email file's component and
`previewData`; the three-column UI is a separate task.
Preview HTML contains static React output, without running effects or browser
event handlers. Any code inside the React view itself must remain presentation-only.

## Scope and development

Templates are synchronous. Data loading may be async via `mapToSend`. React static
rendering does not wait for async components or Suspense; provide fully resolved
props. Avoid `dangerouslySetInnerHTML` with untrusted data.

The package builds CommonJS JavaScript and TypeScript declarations into `dist`.
Import all public APIs from `locus-mail`, including `email`,
`renderPreview`, `defineConfig`, and their types such as `MailConfig`.
React and React DOM currently ship as dependencies alongside Next.js.

Run `npm run build` for the library, `npm run build:preview` for the Next app,
and `npm pack` to build and pack a local installable tarball.

After installing the package, run:

```sh
npx locus-mail
```

No flags are required: the project root is the working directory, the discovery
pattern is `**/*.email.tsx`, and the preview port is 4000. The optional `dev`
subcommand remains supported as an alias. Optional customizations:

- `--path 'src/emails/**/*.email.tsx'` replaces the default discovery glob, relative to the root.
- `--root ./another-project` selects a different project directory.
- `--port 3100` changes the preview server port.
- `--config ./custom.config.mjs` selects a different configuration module.
- `--help` displays CLI usage.

Alternatively export `defineConfig({ root: ".", path: "src/**/*.email.tsx", port: 3100 })` as default from
`locus-mail.config.mjs`. Import `defineConfig`
from `locus-mail`. `--config` selects another module; CLI options override
config values. Relative roots resolve from the invoking working directory;
`--path` replaces the configured path or the default discovery pattern.

The existing root `app/` is the bundled preview application shell. The installed
CLI uses Next.js webpack compilation to support the app inside `node_modules`.
Preview compiler and TypeScript dependencies are included in the package.
The CLI launches
it using Next.js and passes the validated consumer root and paths through
`LOCUS_MAIL_ROOT` and JSON-encoded `LOCUS_MAIL_PATHS`. It currently displays the
three-column template browser, isolated email preview, and highlighted JSON props editor.
`npm run dev` still develops this shell directly; `npm run preview -- --root .`
exercises the consumer CLI locally. Next writes development caches inside the
installed package.

## Sending on the server

### Sending a preview test

The preview's right panel includes a recipient field and **Send**.
It is disabled until you configure a sender and transport in the CLI config:

```js
// locus-mail.config.mjs (loaded by the CLI on the server only)
import { defineConfig, createResendTransport } from "locus-mail";

export default defineConfig({
  previewSend:
    process.env.RESEND_API_KEY && process.env.MAIL_FROM
      ? {
          from: process.env.MAIL_FROM,
          transport: createResendTransport({
            apiKey: process.env.RESEND_API_KEY,
          }),
        }
      : undefined,
});
```

Set those private environment variables in the shell that launches `locus-mail`,
and restart the preview after configuration changes. Config files are executed
before Next starts; the CLI does not automatically load consumer `.env` files.
You can supply any `MailTransport`, including a mock, instead of Resend.

Clicking sends the selected view rendered from the current JSON editor props to
the entered address. The subject is `[Preview] template-name`; plain text contains
the props as JSON. This does not call production notification mappers or loaders,
use production recipients, or include the preview's light/dark display styling.
Provider acceptance is shown with its message ID. Invalid JSON, render failures,
or missing configuration prevent sending; provider failures show a safe error.
Test sending is intended for trusted local development. The browser receives only
configuration availability; the transport, sender configuration and credentials
stay in the CLI process. Requests must originate from the preview page.

For an installable consumer example and repeatable tarball integration check, see
[the consumer guide](examples/consumer/README.md). Run `npm run test:consumer` from
this repository to verify the packaged workflow in a temporary separate project.

Resend is the initial provider. Create the mailer in a server-owned module (for
Next.js, add `import "server-only"` to that module). Never import the configured
mailer from an email view or preview module, pass it to client props, or use a
`NEXT_PUBLIC_` environment variable for credentials. The package does not read
environment variables or initialize a provider when imported. Browser calls to
the sending factories are rejected.

```ts
import { createMailer, createResendTransport } from "locus-mail";

const mailer = createMailer({
  from: "Locus <notifications@example.com>",
  transport: createResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

const result = await mailer.send(registration, {
  registrationId: "registration-123",
});
```

`registration` is a notification definition such as the registration example
above. The second argument is inferred from its mapper. The mapper runs once and
owns runtime validation and loading; previews still take fully loaded JSON props
and never invoke it. Sending reuses preparation checks and the shared HTML renderer.

Address precedence is mailer `from` default, notification `sendOptions`, then the
optional third argument to `send`. That argument supports `from`, `to`, `cc`, `bcc`,
and `replyTo`. Each recipient field accepts an address or a nonempty address array;
`from` accepts a single address. Named mailboxes (`Name <address@example.com>`) are
supported. A sender and at least one `to` recipient must resolve before rendering.
The notification owns the subject and text; callers cannot override the bodies.

Results are `{ status: "sent", templateId, provider, id }` or
`{ status: "skipped", templateId }` when the mapper returns null. Sent means the
provider accepted the request, not confirmed inbox delivery. `MailSendError.stage`
identifies `preparation`, `validation`, `rendering`, or `provider`; its `cause`
preserves mapper/schema/renderer/custom transport diagnostics. Resend errors expose
the HTTP status with configuration guidance and redact response bodies and network
errors. Treat application-owned causes as potentially sensitive in logs.

The Resend adapter uses its HTTPS send endpoint with a 30-second timeout and forwards
only the documented address fields, subject, HTML, and text. Extra metadata remains
available to custom adapters through `message.sendOptions`. There are no automatic
retries: a timeout may occur after acceptance, so check provider logs before retrying.

To swap providers, supply a `MailTransport` with `name` and an async `send(message)`
returning `{ id }`. For tests, use a mock transport or inject `fetch` into
`createResendTransport`. The automated suite uses mocks and makes no delivery calls.

Select a template in the searchable navigation to render its complete `previewData`.
Edit the JSON props to update the preview; incomplete JSON and rendering errors
leave the last successful preview visible. Restore resets that template's sample
values. Drafts, selection, column widths, preview width, and email appearance are
stored locally in the browser; editing never writes to template source files.
Fixture changes take precedence over saved drafts. Inspect, copy, or download the
rendered HTML, and switch between fit, desktop, and mobile preview widths.

## Template discovery

The CLI scans configured globs for `.email.tsx` and `.email.ts` modules (declaration
files are excluded). The default glob selects TSX; use `--path '**/*.email.{ts,tsx}'`
to include both. Default ignored directories are `node_modules`, `.git`, `.next`,
`dist`, `build`, `out`, `coverage`, `generated`, `__generated__`, and `.turbo`.
Symlink directories are not followed. Export the React component as default and
ready-to-render JSON props as named `previewData`. No notification modules or
mappers are discovered or invoked. Imported presentation helpers and fixtures are
bundled with esbuild; keep module initialization free of database loading.

Registry identities are `template:<root-relative path without final extension>`
using forward slashes. They remain stable across edits and are independent of
notification IDs. A `.ts` and `.tsx` sharing this identity both report a duplicate
error. Invalid exports, compilation/import errors, and invalid fixture objects
appear as per-file errors. Missing fixtures produce `missing-preview-data` with
instructions to add `previewData`; the component remains usable in production
and can be previewed with explicit props.

The CLI runs a loopback registry service, refreshing every second and on requests.
Local imported fixture/helper changes are rebundled along with additions, edits,
and removals. `GET /api/templates` returns `{ revision, templates }`; each entry
includes `id`, `source`, `status`, and `previewData` or `error`. Poll this endpoint
and compare revisions to refresh a browser. `POST /api/templates` accepts
`{ id, props? }` and returns `{ html }`, using the fixture when props are omitted.
Explicit props replace fixtures completely. Render errors return `{ error }`
with status 400 without stopping the server. `npm run dev` alone returns an
actionable 503 from these endpoints; use `npm run preview` to run discovery.

```sh
npm install
npm run typecheck
npm test
npm run lint
```

Tests cover component references, async mapping, mapper-owned validation, failure
and skip behavior, direct fixture previews that bypass loaders, escaping, no-input mappers, output
metadata, and TypeScript inference.
