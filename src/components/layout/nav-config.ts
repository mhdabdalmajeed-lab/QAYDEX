import {
  RiBankLine,
  RiBookOpenLine,
  RiPieChartLine,
  RiPlugLine,
  RiSparkling2Line,
  RiTruckLine,
  RiUserLine,
  type RemixiconComponentType,
} from "@remixicon/react";

/**
 * The primary navigation: seven destinations, flat.
 *
 * Everything a section can be filtered by lives *on* that section's page, not in the
 * sidebar. The filters are still there — the domain pages have status tabs and a full filter
 * bar — but a sidebar that lists every filter is a sidebar nobody reads.
 *
 * The product is audit-first (PRD "Revised navigation"): Ledger, Budgets, Cash, Customers and
 * Suppliers are *filtered audit libraries*, not ledgers, CRMs or budget databases.
 *
 * Pages deliberately absent from this list are reached where they are actually needed:
 *   · Settings, and the audit trail inside it → the user menu.
 *   · Templates and Instructions → the audit setup flow, which is the only place you pick one.
 *   · The unfiltered audit library and a single audit → the workspace home and each domain page.
 */
export type NavSection = {
  title: string;
  /** Section root, relative to the workspace root. Used for active-section matching. */
  to: string;
  icon: RemixiconComponentType;
};

export const NAV_SECTIONS: NavSection[] = [
  { title: "AI", to: "chat", icon: RiSparkling2Line },
  { title: "Ledger", to: "ledger", icon: RiBookOpenLine },
  { title: "Budgets", to: "budgets", icon: RiPieChartLine },
  { title: "Cash", to: "cash", icon: RiBankLine },
  { title: "Customers", to: "customers", icon: RiUserLine },
  { title: "Suppliers", to: "suppliers", icon: RiTruckLine },
  { title: "Integrations", to: "integrations", icon: RiPlugLine },
];
