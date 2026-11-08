"use client";

import { Grid, Text, Theme } from "@locus-ui/components";
import { useEffect, useState } from "react";
import { Editor } from "./preview/editor";
import { ResizeHandle } from "./preview/resize-handle";
import type { Template } from "./preview/template";
import { TemplateSidebar } from "./preview/template-sidebar";

export default function Browser() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [testSendConfigured, setTestSendConfigured] = useState(false);
  const [selected, setSelected] = useState("");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<
    Record<string, { original: string; value: string }>
  >({});
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("locus-mail:preview-drafts") ?? "{}",
        );

        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          const valid = Object.fromEntries(
            Object.entries(stored).filter(([, value]) => {
              return (
                value &&
                typeof value === "object" &&
                "original" in value &&
                "value" in value &&
                typeof value.original === "string" &&
                typeof value.value === "string"
              );
            }),
          );
          setDrafts(
            valid as Record<string, { original: string; value: string }>,
          );
        }
      } catch {}

      setDraftsLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (draftsLoaded) {
      try {
        localStorage.setItem(
          "locus-mail:preview-drafts",
          JSON.stringify(drafts),
        );
      } catch {}
    }
  }, [drafts, draftsLoaded]);

  useEffect(() => {
    let stopped = false;
    let remembered = "";

    try {
      remembered = localStorage.getItem("locus-mail:selected-template") ?? "";
    } catch {}

    let revision: unknown;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch("/api/templates", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Discovery unavailable.");
        }

        if (!stopped) {
          setTestSendConfigured(result.testSendConfigured === true);

          if (revision !== result.revision) {
            revision = result.revision;
            setTemplates(result.templates);
            setSelected((current) =>
              result.templates.some(
                (entry: Template) => entry.id === (current || remembered),
              )
                ? current || remembered
                : (result.templates[0]?.id ?? ""),
            );
          }

          setError("");
        }
      } catch (cause) {
        if (!stopped) {
          setError(
            cause instanceof Error ? cause.message : "Discovery unavailable.",
          );
        }
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(refresh, 1000);
        }
      }
    }

    void refresh();

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!loading && selected) {
      try {
        localStorage.setItem("locus-mail:selected-template", selected);
      } catch {}
    }
  }, [selected, loading]);

  const template = templates.find((entry) => entry.id === selected);
  const original = JSON.stringify(template?.previewData ?? {}, null, 2);
  const savedDraft = template ? drafts[template.id] : undefined;
  const draft =
    savedDraft && savedDraft.original === original
      ? savedDraft.value
      : original;

  return (
    <Theme
      className="w-full min-w-0"
      appearance="dark"
      radius="md"
      spacing="md"
    >
      <Grid
        role="main"
        className="group/main relative h-dvh min-h-0 w-full overflow-hidden bg-[rgb(var(--bg-1))] text-[rgb(var(--text))] font-sans text-sm grid-cols-[var(--nav-width,280px)_minmax(0,1fr)] max-[1050px]:grid-cols-[200px_minmax(0,1fr)] max-[620px]:flex max-[620px]:flex-col max-[620px]:gap-3 data-[nav-collapsed=true]:grid-cols-1 [&_.button_.text]:text-inherit!"
        data-nav-collapsed={navCollapsed}
        p={{ initial: "3", md: "5" }}
        pl={
          navCollapsed ? { initial: "3", md: "5" } : { initial: "3", md: "0" }
        }
      >
        {!navCollapsed && (
          <ResizeHandle
            label="Resize template navigation"
            variable="--nav-width"
            initial={280}
            minimum={200}
            maximum={400}
            side="left"
          />
        )}

        <TemplateSidebar
          hidden={navCollapsed}
          templates={templates}
          selected={selected}
          onSelect={setSelected}
        />

        {error && (
          <Text
            as="div"
            className="fixed bottom-3 right-5 left-5 z-10"
            role="alert"
          >
            {error}
          </Text>
        )}

        {template?.status === "ready" && draftsLoaded ? (
          <Editor
            key={`${template.id}:${template.fingerprint}:${JSON.stringify(template.previewData)}`}
            template={template}
            draft={draft}
            testSendConfigured={testSendConfigured}
            navCollapsed={navCollapsed}
            onToggleNav={() => setNavCollapsed(!navCollapsed)}
            propsCollapsed={propsCollapsed}
            onToggleProps={() => setPropsCollapsed(!propsCollapsed)}
            onDraftChange={(value) =>
              setDrafts((current) => ({
                ...current,
                [template.id]: { original, value },
              }))
            }
          />
        ) : (
          <section className="col-start-2 -col-end-1 self-center p-10 text-center">
            <Text as="h1" weight="semibold">
              {loading || !draftsLoaded
                ? "Discovering templates…"
                : template
                  ? "Template needs attention"
                  : "No email templates found"}
            </Text>
            <Text>
              {template?.error ??
                "Add an .email.tsx file with a default component and named previewData export. Launch through locus-mail to enable discovery."}
            </Text>
          </section>
        )}
      </Grid>
    </Theme>
  );
}
