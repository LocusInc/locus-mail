import { Box, Button, Flex, Grid, Text } from "@locus-ui/components";
import { useState } from "react";
import { CopyIcon } from "./icons/copy-icon";
import { DownloadIcon } from "./icons/download-icon";
import { TestSend } from "./test-send";

export function PreviewTools({
  source,
  draft,
  html,
  error,
  busy,
  duration,
  templateId,
  testSendConfigured,
}: {
  source: string;
  draft: string;
  html: string;
  error: string;
  busy: boolean;
  duration: number | null;
  templateId: string;
  testSendConfigured: boolean;
}) {
  const [message, setMessage] = useState("");
  let valid = false;

  try {
    const props = JSON.parse(draft);
    valid =
      props !== null && typeof props === "object" && !Array.isArray(props);
  } catch {}

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setMessage("HTML copied.");
    } catch {
      setMessage("Unable to copy. Download the HTML instead.");
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      source
        .split("/")
        .pop()
        ?.replace(/\.email\.tsx?$/, "") ?? "email"
    }.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Grid gap="6" mt="6">
      <TestSend
        templateId={templateId}
        draft={draft}
        configured={testSendConfigured}
        disabled={!valid || busy || Boolean(error) || !html}
      />

      <Box
        pt="5"
        className="border-t border-[rgb(var(--border-1))]"
        role="region"
        aria-label="Render details"
      >
        <Text as="h2" size="13px" weight="semibold">
          Last successful render
        </Text>

        <Text size="sm" my="2" mx="0">
          {html
            ? `${new TextEncoder().encode(html).length.toLocaleString()} bytes · ${duration?.toFixed(0) ?? "—"} ms round trip`
            : "No successful render yet."}
        </Text>

        <Text size="sm" my="2" mx="0" className="wrap-anywhere">
          {source}
        </Text>

        <Flex gap="2">
          <Button variant="outlined" size="sm" disabled={!html} onClick={copy}>
            <Flex align="center" gap="2">
              <CopyIcon />
              <Text as="span">Copy HTML</Text>
            </Flex>
          </Button>

          <Button
            variant="outlined"
            size="sm"
            disabled={!html}
            onClick={download}
          >
            <Flex align="center" gap="2">
              <DownloadIcon />
              <Text as="span">Download</Text>
            </Flex>
          </Button>
        </Flex>
      </Box>

      {message && (
        <Text size="sm" my="2" mx="0" role="status">
          {message}
        </Text>
      )}

      <Box
        pt="5"
        className="border-t border-[rgb(var(--border-1))]"
        role="region"
        aria-label="Validation"
      >
        <Text as="h2" size="13px" weight="semibold" mt="0" mb="3">
          Validation
        </Text>

        <Text size="sm" my="2" mx="0" role={error ? "alert" : "status"}>
          {!valid
            ? "Enter a valid JSON props object."
            : error || (busy ? "Rendering…" : "Props rendered successfully.")}
        </Text>
      </Box>
    </Grid>
  );
}
