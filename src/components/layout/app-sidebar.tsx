"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  platformForSegment,
  segmentBelowRoot,
  type NavSection,
} from "@/components/layout/nav-config";
import { PlatformSwitcher } from "@/components/layout/platform-switcher";
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
 * One platform's destinations, flat. No nesting.
 *
 * The header addresses the page in two steps — which company, then which platform — and the
 * menu below it lists only the sections of the platform the current URL belongs to. The
 * platform is read from the path rather than held in state, so the sidebar cannot disagree
 * with the page it is sitting next to.
 *
 * Filtering belongs on the page it filters — each section already carries its own status tabs
 * and filter bar — so the sidebar stays a map of the product rather than a copy of every view.
 */
export function AppSidebar({ slug, workspaces, user }: AppSidebarProps) {
  const pathname = usePathname();
  const root = `/w/${slug}`;
  const platform = platformForSegment(segmentBelowRoot(pathname, root));

  const href = (to: string) => `${root}/${to}`;

  const isActive = (section: NavSection): boolean =>
    pathname === href(section.to) || pathname.startsWith(`${href(section.to)}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher slug={slug} workspaces={workspaces} />
        <PlatformSwitcher root={root} current={platform} />
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label={platform.title}>
          <SidebarGroup>
            <SidebarMenu>
              {platform.sections.map((section) => {
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
