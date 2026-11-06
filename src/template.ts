import type { ReactElement } from "react";

/** A plain React view with no data-loading or delivery responsibilities. */
export type EmailComponent<Props extends object> = (
  props: Props,
) => ReactElement | null;

/** Provider-specific metadata may extend this minimum contract. */
export interface EmailSendOptions {
  subject: string;
}

export interface PreparedEmail<
  Props,
  Options extends EmailSendOptions = EmailSendOptions,
> {
  data: Props;
  sendOptions: Options;
  text: string;
}

export interface RenderedEmail<
  Options extends EmailSendOptions = EmailSendOptions,
> {
  subject: string;
  html: string;
  text: string;
  sendOptions: Options;
}

/** Presentation only: subject, text, and send options belong to notifications. */
export interface RenderedPreview {
  html: string;
}

export interface EmailDefinition<
  Input,
  Props extends object,
  Options extends EmailSendOptions = EmailSendOptions,
> {
  id: string;
  name: string;
  /** Reference to a React component, independent of this definition. */
  template: EmailComponent<Props>;
  /** Collect props and send metadata; return null to skip this email. */
  mapToSend: (
    input: Input,
  ) =>
    | PreparedEmail<NoInfer<Props>, Options>
    | null
    | Promise<PreparedEmail<NoInfer<Props>, Options> | null>;
}

export interface EmailTemplate<
  Input,
  Props extends object,
  Options extends EmailSendOptions = EmailSendOptions,
> extends EmailDefinition<Input, Props, Options> {
  /** Resolve data and metadata without rendering or sending. */
  prepare: (
    input: Input,
  ) => Promise<PreparedEmail<Props, Options> | null>;
  render: (input: Input) => Promise<RenderedEmail<Options> | null>;
  /** Render display props directly, without calling mapToSend. */
  renderPreview: (props: Props) => RenderedPreview;
}

/** Caller inputs are inferred from the author's mapper signature. */
export type EmailInput<Definition extends { mapToSend: (input: never) => unknown }> =
  Parameters<Definition["mapToSend"]>[0];

/** Presentation props required by the referenced React component. */
export type EmailData<Definition extends { template: (props: never) => unknown }> =
  Parameters<Definition["template"]>[0];
