export type Template = {
  id: string;
  source: string;
  status: string;
  fingerprint?: string;
  previewData?: object;
  error?: string;
};

export function templateName(source: string) {
  return (
    source
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.email\.tsx?$/, "") ?? source
  );
}
