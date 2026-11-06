import type { ReactNode } from "react";

export interface EmailLayoutProps {
  children: ReactNode;
  /** Document title; the notification's send options control the email subject. */
  title?: string;
  /** Language of the email content. Defaults to English. */
  lang?: string;
}

/** A minimal document shell that can wrap any React email content. */
export function EmailLayout({ children, title, lang = "en" }: EmailLayoutProps) {
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {title && <title>{title}</title>}
      </head>
      <body>{children}</body>
    </html>
  );
}
