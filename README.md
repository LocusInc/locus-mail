# Locus Mail

Locus Mail lets you build emails as React components, preview them locally, and
send them through a typed API with a swappable transport. Resend is included.

## Quick setup

Requires Node.js 20.19+ (20.x) or 22.12+.

```sh
npm install locus-mail
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

## Run the preview

From your project directory:

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

See the [consumer example](examples/consumer/README.md) for a complete project and
Resend test-email setup.
