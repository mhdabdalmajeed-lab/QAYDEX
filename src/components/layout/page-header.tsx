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
 */
export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
      {breadcrumb && breadcrumb.length > 0 ? (
        <Breadcrumb>
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
          <h1 className="truncate font-heading text-lg font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
