import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EmailComponent, RenderedPreview } from "./template";

/** Render fully loaded display props without a notification or data mapper. */
export function renderPreview<Props extends object>(
  template: EmailComponent<Props>,
  props: NoInfer<Props>,
): RenderedPreview {
  if (typeof props !== "object" || props === null) {
    throw new TypeError("Email preview requires a props object.");
  }
  const html = renderToStaticMarkup(createElement(template, props));
  if (!html.trim()) {
    throw new TypeError("Email template produced empty html.");
  }
  return { html };
}
