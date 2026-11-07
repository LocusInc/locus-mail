import { Flex, Panel, Separator } from "@locus-ui/components";
import { useEffect, useRef, useState } from "react";

type ResizeHandleProps = {
  label: string;
  variable: string;
  initial: number;
  minimum: number;
  maximum: number;
  side: "left" | "right";
};

export function ResizeHandle({
  label,
  variable,
  initial,
  minimum,
  maximum,
  side,
}: ResizeHandleProps) {
  const [width, setWidth] = useState(initial);
  const drag = useRef<{ start: number; width: number } | null>(null);
  const handle = useRef<HTMLDivElement>(null);
  const storageKey = `locus-mail:column-width:${variable}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const value = Number(stored);

      if (stored !== null && Number.isFinite(value) && handle.current) {
        const parent = handle.current.parentElement;
        const limit = Math.min(maximum, (parent?.clientWidth ?? 1000) - 320);
        const restored = Math.max(minimum, Math.min(limit, value));
        parent?.style.setProperty(variable, `${restored}px`);
        setWidth(restored);
      }
    } catch {}
  }, [storageKey, variable, minimum, maximum]);

  function resize(element: HTMLElement, value: number) {
    const parent = element.parentElement;
    const limit = Math.min(maximum, (parent?.clientWidth ?? 1000) - 320);
    const next = Math.max(minimum, Math.min(limit, value));
    parent?.style.setProperty(variable, `${next}px`);
    setWidth(next);

    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
  }

  return (
    <Flex
      align="center"
      justify="center"
      ref={handle}
      className={`group absolute inset-y-0 z-5 w-4 cursor-col-resize touch-none max-[1050px]:hidden ${side === "left" ? "left-[calc(var(--nav-width,280px)-8px)] group-data-[nav-collapsed=true]/main:hidden" : "right-[calc(var(--props-width,330px)-8px)] group-data-[props-collapsed=true]/workspace:hidden"}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={width}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { start: event.clientX, width };
      }}
      onPointerMove={(event) => {
        if (drag.current) {
          const delta =
            (event.clientX - drag.current.start) * (side === "right" ? -1 : 1);
          resize(event.currentTarget, drag.current.width + delta);
        }
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onPointerUp={(event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const delta =
            (event.key === "ArrowRight" ? 16 : -16) *
            (side === "right" ? -1 : 1);
          resize(event.currentTarget, width + delta);
        }
      }}
    >
      <Panel
        p="1"
        variant="outlined"
        className="transition-colors group-hover:border-[rgb(var(--primary))]! group-focus-visible:border-[rgb(var(--primary))]! group-active:border-[rgb(var(--primary))]! group-hover:[&_.separator]:border-[rgb(var(--primary))]! group-focus-visible:[&_.separator]:border-[rgb(var(--primary))]! group-active:[&_.separator]:border-[rgb(var(--primary))]!"
      >
        <Flex gap="1" className="h-4">
          <Separator direction="vertical" />
          <Separator direction="vertical" />
        </Flex>
      </Panel>
    </Flex>
  );
}
