import { renderPreview } from "./preview";
import type {
  EmailDefinition,
  EmailSendOptions,
  EmailTemplate,
  PreparedEmail,
  RenderedEmail,
} from "./template";

/** Connect a reusable React view to an author-owned data resolver. */
export function email<
  Input = void,
  Props extends object = object,
  Options extends EmailSendOptions = EmailSendOptions,
>(
  definition: EmailDefinition<Input, Props, Options>,
): EmailTemplate<Input, Props, Options> {
  const { id, name, template, mapToSend } = definition;

  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(id)) {
    throw new TypeError(
      "Email definition id must be a lowercase slug, e.g. register.",
    );
  }

  if (!name.trim()) {
    throw new TypeError(`Email definition "${id}" must have a display name.`);
  }

  async function prepare(input: Input) {
    // The author owns inputs, loading, and readiness. Never substitute preview
    // data, swallow failures, or render an email after a mapper failure.
    const prepared = await mapToSend(input);

    if (prepared === null) {
      return null;
    }

    if (
      typeof prepared !== "object" ||
      typeof prepared.data !== "object" || prepared.data === null ||
      typeof prepared.sendOptions !== "object" || prepared.sendOptions === null
    ) {
      throw new TypeError(`Email definition "${id}" returned an incomplete message.`);
    }

    // Check send metadata before rendering. Extra provider/application metadata
    // is preserved verbatim for a future transport adapter.
    for (const [part, value] of Object.entries({
      subject: prepared.sendOptions.subject,
      text: prepared.text,
    })) {
      if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(
          `Email definition "${id}" produced an empty or invalid ${part}.`,
        );
      }
    }

    if (/[\r\n]/.test(prepared.sendOptions.subject)) {
      throw new TypeError(
        `Email definition "${id}" subject must not contain line breaks.`,
      );
    }

    return prepared;
  }

  function renderPrepared(
    prepared: PreparedEmail<Props, Options> | null,
  ): RenderedEmail<Options> | null {
    if (prepared === null) {
      return null;
    }

    const { html } = renderPreview(template, prepared.data);

    return {
      subject: prepared.sendOptions.subject,
      html,
      text: prepared.text,
      sendOptions: prepared.sendOptions,
    };
  }

  return {
    ...definition,
    prepare: (input) => prepare(input),
    render: async (input) => renderPrepared(await prepare(input)),
    renderPreview: (props) => renderPreview(template, props),
  };
}
