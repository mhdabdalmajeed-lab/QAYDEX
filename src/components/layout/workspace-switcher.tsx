"use client";

import Link from "next/link";
import { RiAddLine, RiBuilding2Line, RiCheckLine, RiExpandUpDownLine, RiTeamLine } from "@remixicon/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  /** `internal` = a finance team auditing itself; `firm` = an audit firm with clients. */
  type: "internal" | "firm";
};

const TYPE_LABEL: Record<WorkspaceSummary["type"], string> = {
  internal: "Internal team",
  firm: "Audit firm",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function WorkspaceSwitcher({
  slug,
  workspaces,
}: {
  slug: string;
  workspaces: WorkspaceSummary[];
}) {
  const { isMobile } = useSidebar();
  const current = workspaces.find((workspace) => workspace.slug === slug);
  const Icon = current?.type === "firm" ? RiTeamLine : RiBuilding2Line;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Workspace: ${current?.name ?? slug}. Switch workspace`}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Icon aria-hidden="true" />
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{current?.name ?? "Workspace"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {current ? TYPE_LABEL[current.type] : "Unknown"}
              </span>
            </div>
            <RiExpandUpDownLine aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            className="w-64"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  render={<Link href={`/w/${workspace.slug}`} />}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-sm border border-border text-[10px] font-medium">
                    {initials(workspace.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{workspace.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {TYPE_LABEL[workspace.type]}
                    </span>
                  </span>
                  {workspace.slug === slug ? (
                    <RiCheckLine aria-hidden="true" className="ml-auto shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem nativeButton={false} render={<Link href="/w/new" />}>
              <RiAddLine aria-hidden="true" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
