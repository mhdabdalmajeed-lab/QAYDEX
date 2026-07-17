"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS, type NavSection } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import {
  WorkspaceSwitcher,
  type WorkspaceSummary,
} from "@/components/layout/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  slug: string;
  workspaces: WorkspaceSummary[];
  user: { id: string; email: string };
};

/**
 * Seven destinations, flat. No nesting.
 *
 * Filtering belongs on the page it filters — each section already carries its own status tabs
 * and filter bar — so the sidebar stays a map of the product rather than a copy of every view.
 */
export function AppSidebar({ slug, workspaces, user }: AppSidebarProps) {
  const pathname = usePathname();
  const root = `/w/${slug}`;

  const href = (to: string) => `${root}/${to}`;

  const isActive = (section: NavSection): boolean =>
    pathname === href(section.to) || pathname.startsWith(`${href(section.to)}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher slug={slug} workspaces={workspaces} />
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Workspace">
          <SidebarGroup>
            <SidebarMenu>
              {NAV_SECTIONS.map((section) => {
                const active = isActive(section);
                const Icon = section.icon;

                return (
                  <SidebarMenuItem key={section.to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={section.title}
                      render={
                        <Link href={href(section.to)} aria-current={active ? "page" : undefined} />
                      }
                    >
                      <Icon aria-hidden="true" />
                      <span>{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <UserMenu user={user} homeHref={root} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
