"use client";

import Link from "next/link";
import { RiCheckLine, RiExpandUpDownLine } from "@remixicon/react";

import {
  PLATFORMS,
  platformHref,
  type Platform,
} from "@/components/layout/nav-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Moves between the two products a workspace contains. It sits directly under the workspace
 * switcher because the pair reads as one address: this company, then this platform within it.
 *
 * Each entry is a real link to that platform's landing route rather than a stored preference,
 * so the choice survives a refresh, a shared URL and the back button without any client state.
 */
export function PlatformSwitcher({ root, current }: { root: string; current: Platform }) {
  const { isMobile } = useSidebar();
  const Icon = current.icon;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                variant="outline"
                aria-label={`Platform: ${current.title}. Switch platform`}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Icon aria-hidden="true" />
            <span className="truncate font-medium">{current.title}</span>
            <RiExpandUpDownLine aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            className="w-56"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Platforms
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {PLATFORMS.map((platform) => {
                const PlatformIcon = platform.icon;

                return (
                  <DropdownMenuItem
                    key={platform.id}
                    render={<Link href={platformHref(root, platform)} />}
                  >
                    <PlatformIcon aria-hidden="true" />
                    <span className="flex-1 truncate">{platform.title}</span>
                    {platform.id === current.id ? (
                      <RiCheckLine aria-hidden="true" className="ml-auto shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
