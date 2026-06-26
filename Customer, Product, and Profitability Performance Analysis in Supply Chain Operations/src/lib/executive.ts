import { analytics, type Filters } from "@/lib/analytics";
import { computeReport, DEFAULT_FILTERS } from "@/lib/report-data";

export type ExecKpi = {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number; // %
  customers: number;
  customerValueIndex: number; // profit contribution per customer ($)
  avgCategoryMargin: number; // %
  categories: { name: string; margin: number; sales: number; profit: number }[];
  totalDiscount: number;
  discountImpactRatio: number; // % of gross revenue conceded as discount
};

/**
 * Executive KPIs for government stakeholders.
 * Headcount-based metrics use the full customer base; category and discount
 * metrics are derived from the aggregated dataset.
 */
export function computeExecutiveSummary(filters: Filters = DEFAULT_FILTERS): ExecKpi {
  const r = computeReport(filters);
  const customers = analytics.overview.totalCustomers;

  const categories = r.byCategory
    .map((c) => ({ name: c.name, margin: c.margin, sales: c.sales, profit: c.profit }))
    .sort((a, b) => b.profit - a.profit);

  const avgCategoryMargin = categories.length
    ? categories.reduce((s, c) => s + c.margin, 0) / categories.length
    : 0;

  const gross = r.totals.sales + r.totals.discount;
  const discountImpactRatio = gross ? (r.totals.discount / gross) * 100 : 0;

  return {
    totalRevenue: r.totals.sales,
    totalProfit: r.totals.profit,
    profitMargin: r.margin,
    customers,
    customerValueIndex: customers ? r.totals.profit / customers : 0,
    avgCategoryMargin,
    categories,
    totalDiscount: r.totals.discount,
    discountImpactRatio,
  };
}
