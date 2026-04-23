"use client";

/* Overlay containment matrix (shadcn/ui wrappers installed in task 9).

   Every shadcn Content component (DialogContent, PopoverContent, etc.)
   hardcodes its Portal internally and does NOT forward a `container` prop,
   so the out-of-the-box default for all five wrappers is "portal escapes
   to document.body". Containment therefore always requires composing
   Trigger/Overlay/Content yourself instead of calling <XxxContent />.

   Two mitigation tiers exist for that custom composition:

   Tier 1 — use the shadcn-exported Portal wrapper (spreads to the Radix
            Portal, so `container` flows through unchanged):
   | Wrapper      | Exported Portal wrapper | Compose as                              |
   |--------------|-------------------------|-----------------------------------------|
   | Dialog       | DialogPortal            | <DialogPortal container={el}>...</...>  |
   | DropdownMenu | DropdownMenuPortal      | <DropdownMenuPortal container={el}>...  |

   Tier 2 — no exported Portal wrapper; drop to the Radix primitive to
            reach its Portal (as done for the "Contained Dialog" branch
            below, which uses DialogPrimitive directly for symmetry even
            though Tier 1 would also work for Dialog):
   | Wrapper      | Required primitive          | Reason                             |
   |--------------|-----------------------------|------------------------------------|
   | Popover      | PopoverPrimitive.Portal     | no exported PopoverPortal wrapper  |
   | Tooltip      | TooltipPrimitive.Portal     | no exported TooltipPortal wrapper  |
   | Select       | SelectPrimitive.Portal      | no exported SelectPortal wrapper   |

   Task 13 verifies both the default-escape and contained branches with
   Playwright. */

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SpikeOverlays() {
  const [containedOpen, setContainedOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  return (
    <TooltipProvider>
      <section data-testid="spike-dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="spike-dialog-trigger">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent data-testid="spike-dialog-content">
            <DialogHeader>
              <DialogTitle>Default Dialog</DialogTitle>
              <DialogDescription>shadcn DialogContent portals to document.body.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </section>

      <section data-testid="spike-dialog-contained">
        <DialogPrimitive.Root open={containedOpen} onOpenChange={setContainedOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button data-testid="spike-dialog-contained-trigger">Open Contained Dialog</Button>
          </DialogPrimitive.Trigger>
          <div ref={setPortalHost} data-testid="spike-dialog-contained-host" />
          <DialogPrimitive.Portal container={portalHost}>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <DialogPrimitive.Content
              data-testid="spike-dialog-contained-content"
              className="fixed top-1/2 left-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
            >
              <DialogPrimitive.Title>Contained Dialog</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                Portal targets the host div (a descendant of .playground-container) via the
                container prop.
              </DialogPrimitive.Description>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </section>

      <section data-testid="spike-popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button data-testid="spike-popover-trigger">Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent data-testid="spike-popover-content">
            Popover content (portals to body).
          </PopoverContent>
        </Popover>
      </section>

      <section data-testid="spike-tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button data-testid="spike-tooltip-trigger">Hover Tooltip</Button>
          </TooltipTrigger>
          <TooltipContent data-testid="spike-tooltip-content">
            Tooltip content (portals to body).
          </TooltipContent>
        </Tooltip>
      </section>

      <section data-testid="spike-dropdown">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-testid="spike-dropdown-trigger">Open Dropdown</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-testid="spike-dropdown-content">
            <DropdownMenuItem>Item one</DropdownMenuItem>
            <DropdownMenuItem>Item two</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section data-testid="spike-select">
        <Select>
          <SelectTrigger data-testid="spike-select-trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent data-testid="spike-select-content">
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b">Option B</SelectItem>
          </SelectContent>
        </Select>
      </section>
    </TooltipProvider>
  );
}
