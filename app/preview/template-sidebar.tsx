import {
  Box,
  Button,
  Flex,
  Input,
  Separator,
  Text,
} from "@locus-ui/components";
import { useState } from "react";
import { SearchIcon } from "./icons/search-icon";
import { LocusMail } from "./locus-mail";
import { templateName, type Template } from "./template";

type SidebarProps = {
  hidden?: boolean;
  templates: Template[];
  selected: string;
  onSelect: (id: string) => void;
};

export function TemplateSidebar({
  templates,
  hidden,
  selected,
  onSelect,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const matchingTemplates = templates.filter((entry) =>
    templateName(entry.source)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <nav
      hidden={hidden}
      aria-label="Templates"
      className="min-h-0 overflow-y-auto px-5 pt-3 pb-8 max-[620px]:max-h-[30dvh] max-[620px]:flex-none max-[620px]:p-2"
    >
      <Text
        as="h2"
        weight="semibold"
        size="xl"
        mt="0"
        mb={{ initial: "4", md: "8" }}
        className="leading-[1.3] tracking-[-.5px]"
      >
        <Flex align="center" gap="3">
          <LocusMail />
          <Text as="span">Locus Mail</Text>
        </Flex>
      </Text>

      <Input.Root
        className="w-full"
        mb="4"
        variant="outlined"
        size="md"
        type="search"
        aria-label="Search templates"
        placeholder="Search templates…"
        startSlot={
          <Input.Slot px="2">
            <SearchIcon />
          </Input.Slot>
        }
        value={query}
        onInput={(event) => setQuery(event.currentTarget.value)}
      />

      {query && matchingTemplates.length === 0 && (
        <Text role="status">No matching templates.</Text>
      )}

      <Box
        radius="xl"
        className="overflow-hidden border border-[rgb(var(--border-1))]"
      >
        {matchingTemplates.map((entry, index) => (
          <Flex key={entry.id} direction="column">
            {index !== 0 && <Separator />}

            <Button
              variant={selected === entry.id ? "muted" : "clear"}
              size="md"
              py="3"
              px="3"
              m="0"
              radius="none"
              className="w-full min-h-11.5 border-0 text-left whitespace-normal wrap-anywhere text-inherit"
              aria-current={selected === entry.id ? "true" : undefined}
              title={entry.source}
              onClick={() => onSelect(entry.id)}
            >
              <Flex
                direction="column"
                align="start"
                justify="center"
                className="w-full text-[rgb(var(--text-light))]"
              >
                <span
                  className={
                    selected === entry.id
                      ? "text-[rgb(var(--primary))]"
                      : undefined
                  }
                >
                  <Text as="span">{templateName(entry.source)}</Text>
                </span>

                <Text
                  as="small"
                  size="11px"
                  weight="normal"
                  className="block wrap-anywhere tracking-normal"
                >
                  {entry.source}
                </Text>

                {entry.status !== "ready" && (
                  <Text
                    as="small"
                    size="10px"
                    mt="1"
                    className="block text-[rgb(var(--text-light))]"
                  >
                    {entry.status}
                  </Text>
                )}
              </Flex>
            </Button>
          </Flex>
        ))}
      </Box>
    </nav>
  );
}
