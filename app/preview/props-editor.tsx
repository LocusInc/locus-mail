import { Box, Button, Panel } from "@locus-ui/components";
import type { ReactNode } from "react";
import CodeEditor from "react-simple-code-editor";
import { highlight, syntaxClasses } from "./highlight";
import { RestoreIcon } from "./icons/restore-icon";

type PropsEditorProps = {
  draft: string;
  original: string;
  onChange: (value: string) => void;
  children?: ReactNode;
};

export function PropsEditor({
  draft,
  original,
  onChange,
  children,
}: PropsEditorProps) {
  return (
    <Panel
      className="min-h-0 min-w-0 overflow-y-auto border-l border-[rgb(var(--border-1))] max-[1050px]:border-l-0 max-[1050px]:border-t group-data-[props-collapsed=true]/workspace:hidden"
      p={{ initial: "4", md: "6" }}
      radius="none"
    >
      <Box className="relative">
        {draft !== original && (
          <Button
            className="absolute top-2 right-2 z-2"
            p="1"
            variant="clear"
            size="sm"
            aria-label="Restore sample props"
            title="Restore sample props"
            onClick={() => onChange(original)}
          >
            <RestoreIcon />
          </Button>
        )}

        <Panel
          radius="xl"
          variant="outlined"
          className="overflow-hidden bg-[rgb(var(--bg-1))]!"
        >
          <CodeEditor
            className={`font-mono text-[13px] leading-[1.9] text-[rgb(var(--text))] [&_pre]:pr-11! [&_textarea]:pr-11! ${syntaxClasses}`}
            textareaId="json-props"
            aria-label="JSON preview props"
            spellCheck={false}
            value={draft}
            onValueChange={onChange}
            highlight={(source) => highlight(source, "json")}
            padding={18}
            tabSize={2}
          />
        </Panel>
      </Box>
      {children}
    </Panel>
  );
}
