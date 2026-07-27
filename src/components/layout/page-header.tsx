import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";

export type Crumb = {
  label: string;
  /** Omit on the final crumb — it renders as the current page. */
  href?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Buttons, filters, menus. Rendered inline-end of the title on wide screens. */
  actions?: ReactNode;
  breadcrumb?: Crumb[];
};

/**
 * The standard page heading. Every workspace page starts with one so that the
 * document has exactly one <h1> and a predictable landmark order.
 *
 * It also carries the sidebar toggle, so the title reads as a continuation of the
 * sidebar rather than as a second, separate bar beneath it. The workspace shell
 * therefore renders no chrome of its own above the page — which is why the sticky
 * positioning lives here: the toggle has to stay reachable once the page scrolls.
 */
export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 bg-background/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-4">
      {breadcrumb && breadcrumb.length > 0 ? (
        <Breadcrumb className="px-2 md:px-1">
          <BreadcrumbList>
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1;
              // The separator is a sibling of the item, never a child: both render an <li>,
              // and an <li> inside an <li> is invalid HTML that the browser silently
              // reparents — which then fails hydration because the server's tree and the
              // client's no longer agree.
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {isLast ? null : <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <SidebarTrigger className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          {description ? (
            <p className="px-2 text-sm text-muted-foreground md:px-1">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * The loading stand-in for {@link PageHeader}. It carries a live sidebar toggle rather
 * than a grey box in its place: a slow page must not cost the user the ability to move.
 */
export function PageHeaderSkeleton({
  breadcrumb = false,
  actions = false,
}: {
  breadcrumb?: boolean;
  actions?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background px-2 py-3 md:px-4">
      {breadcrumb ? <Skeleton className="mx-2 h-4 w-40 md:mx-1" /> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <SidebarTrigger className="shrink-0 text-muted-foreground" />
          <Skeleton className="h-5 w-44" />
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
