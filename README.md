# Locus Mail

Reusable React email views, referenced by separate definitions that collect data
and prepare messages. The author owns input requirements and validation. Package
publishing, the full preview UI, and actual delivery are future tasks.

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
[registration view](examples/emails/register.email.tsx) owns its document layout.
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
[registration definition](examples/notifications/registration-created.notification.ts)
uses injected dependencies so it can be connected to a real data source or a test
fixture. It chooses to validate collected data with Zod inside the mapper; this is
application code, not a Locus Mail schema requirement. Nothing sends an email yet.

The template reference determines the required props of `data`: returning a missing
or incorrectly typed prop is a TypeScript error. A template can be referenced by
multiple definitions with different data loaders, subjects, or recipients.

`sendOptions` requires a nonempty single-line `subject`; other application/provider
fields retain their inferred types and pass through unchanged. This is metadata
for a future sending adapter, not an implemented transport contract. `text` is an
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
} from "./examples/emails/register.email";

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
installed package. No sending transport is implemented.

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
