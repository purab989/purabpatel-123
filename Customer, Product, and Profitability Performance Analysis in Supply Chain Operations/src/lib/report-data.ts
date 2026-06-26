import {
  analytics,
  aggregateBy,
  filterGrain,
  filterProducts,
  totals as sumTotals,
  fmtCurrency,
  fmtPct,
  DISC_ORDER,
  type Filters,
  type CustomerRow,
  type TierRow,
} from "@/lib/analytics";

export type Agg = {
  name: string;
  sales: number;
  profit: number;
  discount: number;
  orders: number;
  margin: number;
};

export type Customer = CustomerRow;

export type ExportPayload = {
  filters: Filters;
  totals: { sales: number; profit: number; discount: number; orders: number };
  margin: number;
  byMarket: Agg[];
  byCategory: Agg[];
  byRegion: Agg[];
  bySegment: Agg[];
  topProducts: Agg[];
  topCustomers: Customer[];
  bottomCustomers: Customer[];
  tiers: TierRow[];
};

export const DEFAULT_FILTERS: Filters = {
  segment: "All",
  market: "All",
  category: "All",
  region: "All",
  maxDiscount: DISC_ORDER.length - 1,
};

/** Compute the full report payload for a given filter set. Pure + isomorphic. */
export function computeReport(filters: Filters = DEFAULT_FILTERS): ExportPayload {
  const grain = filterGrain(analytics.grain, filters);
  const products = filterProducts(analytics.productGrain, filters);

  const t = sumTotals(grain);
  const margin = t.sales ? (t.profit / t.sales) * 100 : 0;

  const byMarket = aggregateBy(grain as never, "market").sort((a, b) => b.profit - a.profit);
  const byCategory = aggregateBy(grain as never, "category").sort((a, b) => b.profit - a.profit);
  const byRegion = aggregateBy(grain as never, "region").sort((a, b) => b.profit - a.profit);
  const bySegment = aggregateBy(grain as never, "segment").sort((a, b) => b.profit - a.profit);

  const topProducts = aggregateBy(products as never, "product")
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  return {
    filters,
    totals: t,
    margin,
    byMarket,
    byCategory,
    byRegion,
    bySegment,
    topProducts,
    topCustomers: analytics.topCustomers,
    bottomCustomers: analytics.bottomCustomers,
    tiers: analytics.tiers,
  };
}

export function filterLabel(f: Filters): string {
  const parts = [
    f.segment !== "All" ? `Segment: ${f.segment}` : null,
    f.market !== "All" ? `Market: ${f.market}` : null,
    f.category !== "All" ? `Category: ${f.category}` : null,
    f.region !== "All" ? `Region: ${f.region}` : null,
    `Max discount: ${DISC_ORDER[f.maxDiscount] ?? "All"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "None";
}

function csvRow(cells: (string | number)[]): string {
  return cells
    .map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export function buildCsv(p: ExportPayload): string {
  const lines: string[] = [];
  lines.push("APL Logistics - Profitability Report");
  lines.push(`Filters,${filterLabel(p.filters).replace(/,/g, ";")}`);
  lines.push("");
  lines.push("KPI,Value");
  lines.push(csvRow(["Total Revenue", fmtCurrency(p.totals.sales)]));
  lines.push(csvRow(["Total Profit", fmtCurrency(p.totals.profit)]));
  lines.push(csvRow(["Profit Margin", fmtPct(p.margin)]));
  lines.push(csvRow(["Discount Given", fmtCurrency(p.totals.discount)]));
  lines.push("");

  const aggSection = (title: string, rows: Agg[]) => {
    lines.push(title);
    lines.push("Name,Revenue,Profit,Margin,Orders");
    rows.forEach((r) => lines.push(csvRow([r.name, r.sales, r.profit, r.margin.toFixed(1), r.orders])));
    lines.push("");
  };

  aggSection("By Market", p.byMarket);
  aggSection("By Segment", p.bySegment);
  aggSection("By Category", p.byCategory);
  aggSection("Top Products", p.topProducts);

  const custSection = (title: string, rows: Customer[]) => {
    lines.push(title);
    lines.push("Customer,Segment,Country,Revenue,Profit,Margin");
    rows.forEach((c) => lines.push(csvRow([c.name, c.segment, c.country, c.sales, c.profit, c.margin.toFixed(1)])));
    lines.push("");
  };

  custSection("Top Customers", p.topCustomers);
  custSection("Bottom Customers", p.bottomCustomers);

  return lines.join("\n");
}
