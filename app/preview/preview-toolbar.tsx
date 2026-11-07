import { Button, Flex, Text } from "@locus-ui/components";
import { AppearanceIcon } from "./icons/appearance-icon";
import { InspectIcon } from "./icons/inspect-icon";
import { LeftPanelIcon } from "./icons/left-panel-icon";
import { RightPanelIcon } from "./icons/right-panel-icon";

type PreviewToolbarProps = {
  title: string;
  navCollapsed: boolean;
  onToggleNav: () => void;
  propsCollapsed: boolean;
  onToggleProps: () => void;
  viewport: string;
  onViewportChange: (value: string) => void;
  inspect: boolean;
  onToggleInspect: () => void;
  appearance: "light" | "dark";
  onAppearanceChange: (value: "light" | "dark") => void;
};

export function PreviewToolbar({
  title,
  navCollapsed,
  onToggleNav,
  propsCollapsed,
  onToggleProps,
  viewport,
  onViewportChange,
  inspect,
  onToggleInspect,
  appearance,
  onAppearanceChange,
}: PreviewToolbarProps) {
  return (
    <Flex
      className="shrink-0"
      justify="between"
      align="center"
      gap="3"
      wrap="wrap"
      role="toolbar"
      aria-label="Preview controls"
      px="4"
      py="3"
    >
      <Flex align="center" gap="3">
        <Button
          variant="outlined"
          size="sm"
          aria-label={navCollapsed ? "Show templates" : "Hide templates"}
          title={navCollapsed ? "Show templates" : "Hide templates"}
          aria-expanded={!navCollapsed}
          onClick={onToggleNav}
        >
          <LeftPanelIcon />
        </Button>

        <Text
          as="h1"
          weight="semibold"
          size="18px"
          m="0"
          className="leading-7 wrap-anywhere"
        >
          {title}
        </Text>
      </Flex>

      <Flex align="center" gap="3">
        <Flex gap="2" wrap="wrap" justify="end" align="center">
          <Flex
            className="[&>button+button]:-ml-px"
            gap="0"
            role="group"
            aria-label="Email preview width"
          >
            {[
              {
                value: "fluid",
                label: "Fit",
                title: "Fit available width",
              },
              {
                value: "desktop",
                label: "Desktop",
                title: "Desktop · 600px",
              },
              {
                value: "mobile",
                label: "Mobile",
                title: "Mobile · 375px",
              },
            ].map((option) => (
              <Button
                key={option.value}
                variant={viewport === option.value ? "solid" : "outlined"}
                size="sm"
                radius="none"
                className={
                  option.value === "fluid"
                    ? "rounded-l-md! rounded-r-none!"
                    : option.value === "mobile"
                      ? "rounded-r-md! rounded-l-none!"
                      : "rounded-none!"
                }
                title={option.title}
                aria-pressed={viewport === option.value}
                onClick={() => onViewportChange(option.value)}
              >
                <Text as="span">{option.label}</Text>
              </Button>
            ))}
          </Flex>

          <Button
            variant="solid"
            size="sm"
            aria-label={inspect ? "Show email preview" : "Inspect HTML"}
            title={inspect ? "Show email preview" : "Inspect HTML"}
            aria-pressed={inspect}
            onClick={() => onToggleInspect()}
          >
            <InspectIcon preview={inspect} />
          </Button>

          <Button
            variant="solid"
            size="sm"
            aria-label={
              appearance
                ? "Preview email in light mode"
                : "Preview email in dark mode"
            }
            title={
              appearance
                ? "Preview email in light mode"
                : "Preview email in dark mode"
            }
            aria-pressed={appearance === "dark"}
            onClick={() =>
              onAppearanceChange?.(appearance === "dark" ? "light" : "dark")
            }
          >
            <AppearanceIcon dark={appearance === "dark"} />
          </Button>

          <Button
            variant="outlined"
            size="sm"
            aria-label={
              propsCollapsed ? "Show props editor" : "Hide props editor"
            }
            title={propsCollapsed ? "Show props editor" : "Hide props editor"}
            aria-expanded={!propsCollapsed}
            onClick={onToggleProps}
          >
            <RightPanelIcon />
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
