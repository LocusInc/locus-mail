import { Box, Button, Grid, Input, Text } from "@locus-ui/components";
import { useState, type SubmitEvent } from "react";

export function TestSend({
  templateId,
  draft,
  configured,
  disabled,
}: {
  templateId: string;
  draft: string;
  configured: boolean;
  disabled: boolean;
}) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || disabled || sending) {
      return;
    }

    setSending(true);
    setMessage("");
    setFailed(false);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-test",
          id: templateId,
          props: JSON.parse(draft),
          to: to.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to send test email.");
      }

      setMessage(`Message ID: ${result.id}`);
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error ? error.message : "Unable to send test email.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Box
      pt="5"
      className="border-t border-[rgb(var(--border-1))]"
      role="region"
      aria-label="Send a test email"
    >
      <Text as="h2" size="13px" weight="semibold">
        Send a test email
      </Text>

      <Text id="test-email-description" size="sm" mb="4">
        Sends the current preview props with a [Preview] subject.
      </Text>

      <form onSubmit={send}>
        <Grid gap="3">
          <Input.Root
            id="test-email-recipient"
            className="w-full"
            type="email"
            required
            placeholder="you@example.com"
            value={to}
            onChange={(event) => setTo(event.currentTarget.value)}
            disabled={sending}
            aria-describedby={
              configured
                ? "test-email-description"
                : "test-email-description test-email-hint"
            }
          >
            <Input.Label>Recipient email</Input.Label>
          </Input.Root>

          <Button
            type="submit"
            variant="solid"
            color="primary"
            size="sm"
            disabled={!configured || disabled || sending || !to.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>

          {!configured && (
            <Text id="test-email-hint" size="sm" my="0">
              Set previewSend.from and previewSend.transport in
              locus-mail.config.mjs, then restart the preview to enable sending.
            </Text>
          )}

          {message && (
            <Text size="sm" my="0" role={failed ? "alert" : "status"}>
              {message}
            </Text>
          )}
        </Grid>
      </form>
    </Box>
  );
}
