import { Flex, Grid, Panel, Separator, Text } from "@locus-ui/components";
import { useEffect, useState } from "react";
import { HtmlInspector } from "./html-inspector";
import { PreviewToolbar } from "./preview-toolbar";
import { PreviewTools } from "./preview-tools";
import { PropsEditor } from "./props-editor";
import { ResizeHandle } from "./resize-handle";
import { templateName, type Template } from "./template";

export function Editor({
  template,
  draft,
  onDraftChange,
  navCollapsed,
  onToggleNav,
  propsCollapsed,
  onToggleProps,
}: {
  template: Template;
  draft: string;
  onDraftChange: (value: string) => void;
  navCollapsed: boolean;
  onToggleNav: () => void;
  propsCollapsed: boolean;
  onToggleProps: () => void;
}) {
  const [appearance, setAppearance] = useState<"light" | "dark">("dark");
  const original = JSON.stringify(template.previewData, null, 2);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [inspect, setInspect] = useState(false);
  const [busy, setBusy] = useState(true);
  const [duration, setDuration] = useState<number | null>(null);
  const [viewport, setViewport] = useState("fluid");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("locus-mail:preview-preferences") ?? "{}",
        );

        if (stored && typeof stored === "object") {
          if (["fluid", "desktop", "mobile"].includes(stored.viewport)) {
            setViewport(stored.viewport);
          }

          if (stored.appearance === "light" || stored.appearance === "dark") {
            setAppearance(stored.appearance);
          }
        }
      } catch {}

      setPreferencesLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (preferencesLoaded) {
      try {
        localStorage.setItem(
          "locus-mail:preview-preferences",
          JSON.stringify({ viewport, appearance }),
        );
      } catch {}
    }
  }, [viewport, appearance, preferencesLoaded]);
  const scheme = appearance === "dark" ? "dark" : "light";
  const schemeStyle = `<style>:root{color-scheme:${scheme}}body{background-color:Canvas;color:CanvasText}</style>`;
  const previewHtml = /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${schemeStyle}`)
    : `${schemeStyle}${html}`;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const props = JSON.parse(draft);

        if (!props || typeof props !== "object" || Array.isArray(props)) {
          throw new Error("Props must be a JSON object.");
        }

        setBusy(true);
        const started = performance.now();
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: template.id, props }),
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Rendering failed.");
        }

        if (!controller.signal.aborted) {
          setHtml(result.html);
          setDuration(performance.now() - started);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Rendering failed.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setBusy(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, template.id]);

  return (
    <Panel
      radius="xl"
      variant="outlined"
      className="min-h-0 min-w-0 overflow-hidden shadow-xl"
    >
      <Grid
        className="group/workspace relative h-full min-h-0 min-w-0 overflow-hidden grid-cols-[minmax(0,1fr)_var(--props-width,330px)] grid-rows-[minmax(0,1fr)] max-[1050px]:grid-cols-1 max-[1050px]:grid-rows-[minmax(0,3fr)_minmax(0,2fr)] data-[props-collapsed=true]:grid-cols-1 data-[props-collapsed=true]:grid-rows-[minmax(0,1fr)]"
        data-props-collapsed={propsCollapsed}
      >
        {!propsCollapsed && (
          <ResizeHandle
            label="Resize preview props"
            variable="--props-width"
            initial={330}
            minimum={260}
            maximum={560}
            side="right"
          />
        )}

        <Flex
          className="min-h-0 min-w-0 overflow-hidden"
          direction="column"
          p={{ initial: "4", md: "6" }}
        >
          <Panel
            variant="outlined"
            radius="xl"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <Flex direction="column" className="h-full min-h-0">
              <PreviewToolbar
                title={templateName(template.source)}
                navCollapsed={navCollapsed}
                onToggleNav={onToggleNav}
                propsCollapsed={propsCollapsed}
                onToggleProps={onToggleProps}
                viewport={viewport}
                onViewportChange={setViewport}
                inspect={inspect}
                onToggleInspect={() => setInspect(!inspect)}
                appearance={appearance}
                onAppearanceChange={setAppearance}
              />
              <Separator />

              {busy && (
                <Text role="status" size="sm" m="4">
                  Rendering…
                </Text>
              )}
              {error && (
                <Text role="alert" size="sm" p="3">
                  {error}
                </Text>
              )}
              {inspect ? (
                <HtmlInspector html={html} />
              ) : html ? (
                <Flex
                  className="min-h-0 flex-1 overflow-auto justify-center-safe"
                  justify="center"
                  data-viewport={viewport}
                >
                  <iframe
                    className={
                      viewport === "desktop"
                        ? "h-full w-150 shrink-0 border-0"
                        : viewport === "mobile"
                          ? "h-full w-93.75 shrink-0 border-0"
                          : "h-full w-full shrink-0 border-0"
                    }
                    title="Email preview"
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={previewHtml}
                  />
                </Flex>
              ) : (
                <Text size="sm" m="4">
                  Waiting for a valid render.
                </Text>
              )}
            </Flex>
          </Panel>
        </Flex>

        <PropsEditor draft={draft} original={original} onChange={onDraftChange}>
          <PreviewTools
            source={template.source}
            draft={draft}
            html={html}
            error={error}
            busy={busy}
            duration={duration}
          />
        </PropsEditor>
      </Grid>
    </Panel>
  );
}
