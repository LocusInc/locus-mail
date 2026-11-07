import { useEffect, useState } from "react";
import { highlight, syntaxClasses } from "./highlight";

export function HtmlInspector({ html }: { html: string }) {
  const [formatted, setFormatted] = useState<{
    source: string;
    value: string;
  }>();

  useEffect(() => {
    let cancelled = false;

    async function format() {
      try {
        const [prettier, plugin] = await Promise.all([
          import("prettier/standalone"),
          import("prettier/plugins/html"),
        ]);
        const value = await prettier.format(html, {
          parser: "html",
          plugins: [plugin.default],
          tabWidth: 2,
          printWidth: 80,
          htmlWhitespaceSensitivity: "ignore",
        });

        if (!cancelled) {
          setFormatted({ source: html, value });
        }
      } catch {
        if (!cancelled) {
          setFormatted({ source: html, value: html });
        }
      }
    }

    void format();

    return () => {
      cancelled = true;
    };
  }, [html]);

  const source = formatted?.source === html ? formatted.value : html;

  return (
    <pre
      className={`m-0 min-h-0 overflow-auto p-4.5 font-mono text-[13px] leading-[1.9] whitespace-pre-wrap wrap-anywhere text-[rgb(var(--text))] ${syntaxClasses}`}
    >
      <code dangerouslySetInnerHTML={{ __html: highlight(source, "markup") }} />
    </pre>
  );
}
