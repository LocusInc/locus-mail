# Locus Mail

Reusable React email views, referenced by separate definitions that collect data
and prepare messages. The author owns input requirements and validation. Package
publishing, discovery, the preview server, and actual delivery are future tasks.

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
[registration view](examples/emails/register.email.tsx) composes a shared layout.
React escapes text and attribute values; do not manually HTML-escape JSX props.

## Use the built-in layout

`EmailLayout` is exported by the package's source entry point for a quick document
shell. It supplies `<html>`, `<head>`, UTF-8 and viewport metadata, and `<body>`;
put your email content inside it.

```tsx
import { EmailLayout } from "./src";

export default function WelcomeEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout title="Welcome">
      <h1>Welcome, {firstName}!</h1>
      <p>Thanks for joining us.</p>
    </EmailLayout>
  );
}
```

The component accepts `children`, an optional document `title`, and an optional
`lang` (defaults to `"en"`). `EmailLayoutProps` is exported too. The document title
is separate from the actual email subject supplied by the notification's
`sendOptions`. It adds no branding or styling, so you can compose your own content
and shared components. See the registration template for the current local import
path; published package exports will be configured with packaging.

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
that accepted mapper inputs. The future discovery task will load each email file's
component and `previewData`; discovery and the three-column UI are not implemented
yet. Preview HTML contains static React output, without running effects or browser
event handlers. Any code inside the React view itself must remain presentation-only.

## Scope and development

Templates are synchronous. Data loading may be async via `mapToSend`. React static
rendering does not wait for async components or Suspense; provide fully resolved
props. Avoid `dangerouslySetInnerHTML` with untrusted data.

Imports currently use the local `src` entry point. Public package exports, file
discovery, the preview UI, and sending adapters are not implemented yet. The existing
Next.js starter remains available with `npm run dev`.

```sh
npm install
npm run typecheck
npm test
npm run lint
```

Tests cover component references, async mapping, mapper-owned validation, failure
and skip behavior, direct fixture previews that bypass loaders, escaping, no-input mappers, output
metadata, and TypeScript inference.
