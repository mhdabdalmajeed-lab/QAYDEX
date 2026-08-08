import {
  RiBankLine,
  RiBillLine,
  RiBookOpenLine,
  RiFileList3Line,
  RiPieChartLine,
  RiPlugLine,
  RiSearchEyeLine,
  RiSparkling2Line,
  RiTruckLine,
  RiUserLine,
  type RemixiconComponentType,
} from "@remixicon/react";

/**
 * The primary navigation, grouped by platform.
 *
 * A workspace holds two products that share a company, a member list and a sign-in but
 * almost nothing else: the audit platform, and the invoicing platform. Rather than merge
 * their destinations into one long list, the sidebar shows one platform at a time and the
 * switcher in the header moves between them — the same way the workspace switcher above it
 * moves between companies.
 *
 * Within a platform, everything a section can be filtered by lives *on* that section's
 * page, not in the sidebar. The filters are still there — the domain pages have status tabs
 * and a full filter bar — but a sidebar that lists every filter is a sidebar nobody reads.
 *
 * The audit platform is audit-first (PRD "Revised navigation"): Ledger, Budgets, Cash,
 * Customers and Suppliers are *filtered audit libraries*, not ledgers, CRMs or budget
 * databases.
 *
 * Pages deliberately absent from these lists are reached where they are actually needed:
 *   · Settings, and the audit trail inside it → the user menu.
 *   · A single audit → the workspace home and each domain page.
 */
export type NavSection = {
  title: string;
  /** Section root, relative to the workspace root. Used for active-section matching. */
  to: string;
  icon: RemixiconComponentType;
};

export type PlatformId = "audit" | "invoicing";

export type Platform = {
  id: PlatformId;
  title: string;
  icon: RemixiconComponentType;
  /**
   * Where the switcher lands, relative to the workspace root. Empty means the workspace
   * root itself — the audit platform owns `/w/<slug>`, so it has no landing page of its own.
   */
  home: string;
  sections: NavSection[];
};

export const PLATFORMS: Platform[] = [
  {
    id: "audit",
    title: "Auditing",
    icon: RiSearchEyeLine,
    home: "",
    sections: [
      { title: "AI", to: "chat", icon: RiSparkling2Line },
      { title: "Ledger", to: "ledger", icon: RiBookOpenLine },
      { title: "Budgets", to: "budgets", icon: RiPieChartLine },
      { title: "Cash", to: "cash", icon: RiBankLine },
      { title: "Customers", to: "customers", icon: RiUserLine },
      { title: "Suppliers", to: "suppliers", icon: RiTruckLine },
      { title: "Integrations", to: "integrations", icon: RiPlugLine },
    ],
  },
  {
    id: "invoicing",
    title: "Invoicing",
    icon: RiBillLine,
    home: "invoices",
    sections: [{ title: "Customer invoices", to: "invoices", icon: RiFileList3Line }],
  },
];

const DEFAULT_PLATFORM = PLATFORMS[0];

/**
 * Which platform a URL belongs to, read from its first segment below the workspace root.
 *
 * The platform is derived rather than stored so that a pasted link, a bookmark or a browser
 * back button all land on a sidebar that matches the page. Anything unclaimed — the
 * workspace home, an audit, settings — belongs to the audit platform, which is the workspace
 * root's own product.
 */
export function platformForSegment(segment: string): Platform {
  return (
    PLATFORMS.find((platform) => platform.sections.some((section) => section.to === segment)) ??
    DEFAULT_PLATFORM
  );
}

/** The first path segment below `/w/<slug>`, or `""` at the workspace root. */
export function segmentBelowRoot(pathname: string, root: string): string {
  if (!pathname.startsWith(root)) return "";
  return pathname.slice(root.length).split("/").filter(Boolean)[0] ?? "";
}

export function platformHref(root: string, platform: Platform): string {
  return platform.home ? `${root}/${platform.home}` : root;
}
