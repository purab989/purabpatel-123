import data from "@/data/analytics.json";

export type GrainRow = {
  market: string;
  region: string;
  segment: string;
  category: string;
  discBucket: string;
  sales: number;
  profit: number;
  discount: number;
  orders: number;
  qty: number;
};

export type ProductRow = {
  product: string;
  category: string;
  segment: string;
  market: string;
  sales: number;
  profit: number;
  discount: number;
  orders: number;
  qty: number;
};

export type CustomerRow = {
  id: number;
  name: string;
  segment: string;
  country: string;
  sales: number;
  profit: number;
  orders: number;
  margin: number;
};

export type TierRow = { tier: string; customers: number; profit: number; sales: number };

export const analytics = data as unknown as {
  overview: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    avgDiscount: number;
    profitMargin: number;
    totalDiscount: number;
  };
  grain: GrainRow[];
  productGrain: ProductRow[];
  topCustomers: CustomerRow[];
  bottomCustomers: CustomerRow[];
  tiers: TierRow[];
};

export const SEGMENTS = ["Consumer", "Corporate", "Home Office"];
export const MARKETS = [...new Set(analytics.grain.map((r) => r.market))].sort();
export const CATEGORIES = [...new Set(analytics.grain.map((r) => r.category))].sort();
export const REGIONS = [...new Set(analytics.grain.map((r) => r.region))].sort();
export const DISC_ORDER = ["0%", "0-5%", "5-10%", "10-15%", "15-20%", "20%+"];

export const fmtCurrency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export type Filters = {
  segment: string;
  market: string;
  category: string;
  region: string;
  maxDiscount: number; // index into DISC_ORDER, allow up to this bucket
};

const bucketIndex = (b: string) => DISC_ORDER.indexOf(b);

export function filterGrain(rows: GrainRow[], f: Filters) {
  return rows.filter(
    (r) =>
      (f.segment === "All" || r.segment === f.segment) &&
      (f.market === "All" || r.market === f.market) &&
      (f.category === "All" || r.category === f.category) &&
      (f.region === "All" || r.region === f.region) &&
      bucketIndex(r.discBucket) <= f.maxDiscount,
  );
}

export function filterProducts(rows: ProductRow[], f: Filters) {
  return rows.filter(
    (r) =>
      (f.segment === "All" || r.segment === f.segment) &&
      (f.market === "All" || r.market === f.market) &&
      (f.category === "All" || r.category === f.category),
  );
}

export function aggregateBy<T extends Record<string, unknown>>(
  rows: { sales: number; profit: number; discount: number; orders: number }[] & T[],
  key: keyof T,
) {
  const map = new Map<string, { sales: number; profit: number; discount: number; orders: number }>();
  for (const r of rows) {
    const k = String(r[key]);
    const cur = map.get(k) ?? { sales: 0, profit: 0, discount: 0, orders: 0 };
    cur.sales += r.sales;
    cur.profit += r.profit;
    cur.discount += r.discount;
    cur.orders += r.orders;
    map.set(k, cur);
  }
  return [...map.entries()].map(([name, v]) => ({
    name,
    ...v,
    margin: v.sales ? (v.profit / v.sales) * 100 : 0,
  }));
}

export const totals = (rows: { sales: number; profit: number; discount: number; orders: number }[]) =>
  rows.reduce(
    (a, r) => ({
      sales: a.sales + r.sales,
      profit: a.profit + r.profit,
      discount: a.discount + r.discount,
      orders: a.orders + r.orders,
    }),
    { sales: 0, profit: 0, discount: 0, orders: 0 },
  );
