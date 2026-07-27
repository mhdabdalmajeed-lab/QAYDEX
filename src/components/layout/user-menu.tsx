"use client";

import { useTheme } from "next-themes";
import { useTransition } from "react";
import {
  RiComputerLine,
  RiExpandUpDownLine,
  RiHistoryLine,
  RiLogoutBoxRLine,
  RiMoonLine,
  RiSettings3Line,
  RiSunLine,
} from "@remixicon/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/server/actions/auth";

function initials(email: string): string {
  const [name = ""] = email.split("@");
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [name[0] ?? "?"];
  return letters.join("").toUpperCase();
}

export function UserMenu({
  user,
  homeHref,
}: {
  user: { id: string; email: string };
  homeHref: string;
}) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Account: ${user.email}`}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md text-xs">{initials(user.email)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.email}</span>
              <span className="truncate text-xs text-muted-foreground">Signed in</span>
            </div>
            <RiExpandUpDownLine aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            className="w-60"
          >
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* The sidebar is the seven working sections. Everything administrative lives
                here, where you look for it once a month rather than every day. */}
            <DropdownMenuItem nativeButton={false} render={<Link href={`${homeHref}/settings`} />}>
              <RiSettings3Line aria-hidden="true" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuItem nativeButton={false} render={<Link href={`${homeHref}/settings/activity`} />}>
              <RiHistoryLine aria-hidden="true" />
              Audit trail
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme ?? "system"}
              onValueChange={(value) => setTheme(String(value))}
            >
              <DropdownMenuRadioItem value="light">
                <RiSunLine aria-hidden="true" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <RiMoonLine aria-hidden="true" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <RiComputerLine aria-hidden="true" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onClick={() => startTransition(() => void signOut())}
            >
              <RiLogoutBoxRLine aria-hidden="true" />
              {isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
