import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Percent,
  Users,
  Package,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  FileText,
  
  ShieldCheck,
} from "lucide-react";
import { exportCsv, exportPdf, type ExportPayload } from "@/lib/exports";
import {
  analytics,
  aggregateBy,
  filterGrain,
  filterProducts,
  totals,
  fmtCurrency,
  fmtCompact,
  fmtPct,
  SEGMENTS,
  MARKETS,
  CATEGORIES,
  REGIONS,
  DISC_ORDER,
  type Filters,
} from "@/lib/analytics";

const C = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  destructive: "var(--color-destructive)",
  muted: "var(--color-muted-foreground)",
};

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "accent" | "success" | "destructive";
}) {
  const toneMap = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${toneMap[tone]}`} />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};

export default function Dashboard() {
  const [f, setF] = useState<Filters>({
    segment: "All",
    market: "All",
    category: "All",
    region: "All",
    maxDiscount: DISC_ORDER.length - 1,
  });
  const set = (k: keyof Filters) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const grain = useMemo(() => filterGrain(analytics.grain, f), [f]);
  const products = useMemo(() => filterProducts(analytics.productGrain, f), [f]);
  const t = useMemo(() => totals(grain), [grain]);
  const margin = t.sales ? (t.profit / t.sales) * 100 : 0;

  const byCategory = useMemo(
    () => aggregateBy(grain as never, "category").sort((a, b) => b.profit - a.profit),
    [grain],
  );
  const byMarket = useMemo(
    () => aggregateBy(grain as never, "market").sort((a, b) => b.profit - a.profit),
    [grain],
  );
  const byRegion = useMemo(
    () => aggregateBy(grain as never, "region").sort((a, b) => b.profit - a.profit).slice(0, 12),
    [grain],
  );
  const bySegment = useMemo(() => aggregateBy(grain as never, "segment"), [grain]);
  const byDisc = useMemo(() => {
    const agg = aggregateBy(grain as never, "discBucket");
    return DISC_ORDER.map((b) => agg.find((a) => a.name === b)).filter(Boolean) as typeof agg;
  }, [grain]);

  const topProducts = useMemo(() => {
    const agg = aggregateBy(products as never, "product");
    return agg.sort((a, b) => b.sales - a.sales).slice(0, 12);
  }, [products]);

  // Discount what-if: model profit if discount changed by delta points
  const [whatIf, setWhatIf] = useState(0);
  const whatIfProfit = useMemo(() => {
    // each extra discount dollar reduces profit ~1:1; scale current discount by factor
    const factor = 1 + whatIf / 100;
    const newDiscount = t.discount * factor;
    return t.profit - (newDiscount - t.discount);
  }, [whatIf, t]);

  const lossCategories = byCategory.filter((c) => c.profit < 0 || c.margin < 5);

  const buildPayload = (): ExportPayload => ({
    filters: f,
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
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">APL Logistics · Profitability Intelligence</h1>
              <p className="text-sm text-muted-foreground">
                Customer, product & margin analytics across {analytics.overview.totalOrders.toLocaleString()} orders
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => exportCsv(buildPayload())}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              <FileDown className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={() => exportPdf(buildPayload())}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <FileText className="h-4 w-4" /> PDF Report
            </button>
            <Link
              to="/executive-summary"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              <ShieldCheck className="h-4 w-4" /> Executive Summary
            </Link>


          </div>
        </div>
      </header>


      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Select label="Segment" value={f.segment} options={SEGMENTS} onChange={set("segment")} />
            <Select label="Market" value={f.market} options={MARKETS} onChange={set("market")} />
            <Select label="Category" value={f.category} options={CATEGORIES} onChange={set("category")} />
            <Select label="Region" value={f.region} options={REGIONS} onChange={set("region")} />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Max Discount · {DISC_ORDER[f.maxDiscount]}
              </span>
              <input
                type="range"
                min={0}
                max={DISC_ORDER.length - 1}
                value={f.maxDiscount}
                onChange={(e) => setF((p) => ({ ...p, maxDiscount: Number(e.target.value) }))}
                className="mt-2 accent-[var(--color-primary)]"
              />
            </label>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={DollarSign} label="Total Revenue" value={fmtCurrency(t.sales)} sub={`${t.orders.toLocaleString()} orders`} />
          <Kpi
            icon={TrendingUp}
            label="Total Profit"
            value={fmtCurrency(t.profit)}
            sub="Order Profit Per Order"
            tone={t.profit >= 0 ? "success" : "destructive"}
          />
          <Kpi
            icon={Percent}
            label="Profit Margin"
            value={fmtPct(margin)}
            sub="Profit ÷ Revenue"
            tone={margin >= 10 ? "success" : margin >= 5 ? "accent" : "destructive"}
          />
          <Kpi icon={Tag} label="Discount Given" value={fmtCurrency(t.discount)} sub="Total item discounts" tone="accent" />
        </div>

        {/* Revenue & Profit overview */}
        <Panel title="Revenue vs Profit by Market" desc="Where revenue concentrates vs where margin is actually earned">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={byMarket}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis tickFormatter={fmtCompact} tick={{ fill: C.muted, fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [n === "margin" ? fmtPct(v) : fmtCurrency(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales" name="Revenue" fill={C.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill={C.success} radius={[4, 4, 0, 0]} />
              <Line dataKey="margin" name="margin" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        {/* Customer value */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Customer Value Tiers" desc="Customers grouped by lifetime profit contribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.tiers}
                  dataKey="customers"
                  nameKey="tier"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {analytics.tiers.map((_, i) => (
                    <Cell
                      key={i}
                      fill={[C.success, C.primary, C.accent, C.muted, C.destructive][i % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n, p) => [`${v} customers · ${fmtCurrency((p.payload as { profit: number }).profit)} profit`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Customer Segment Contribution" desc="Profit & revenue split by customer segment">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bySegment} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={fmtCompact} tick={{ fill: C.muted, fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: C.muted, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Revenue" fill={C.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" name="Profit" fill={C.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Top / bottom customers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Top 15 Customers by Profit" desc="Highest-value relationships">
            <CustomerTable rows={analytics.topCustomers} positive />
          </Panel>
          <Panel title="Bottom 15 Customers by Profit" desc="Loss-making / margin-eroding accounts">
            <CustomerTable rows={analytics.bottomCustomers} />
          </Panel>
        </div>

        {/* Product & category */}
        <Panel
          title="Category Profitability"
          desc="Bar height = profit, color flags weak (<5%) or negative margins"
        >
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={byCategory.slice(0, 18)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} angle={-30} textAnchor="end" height={90} interval={0} />
              <YAxis tickFormatter={fmtCompact} tick={{ fill: C.muted, fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n, p) => [`${fmtCurrency(v)} · ${fmtPct((p.payload as { margin: number }).margin)} margin`, "Profit"]}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {byCategory.slice(0, 18).map((c, i) => (
                  <Cell key={i} fill={c.profit < 0 ? C.destructive : c.margin < 5 ? C.accent : C.success} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Top Products by Revenue" desc="Watch high-revenue / low-margin items">
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate" title={p.name}>{p.name}</span>
                  <div className="flex shrink-0 items-center gap-3 font-mono text-xs">
                    <span className="text-muted-foreground">{fmtCompact(p.sales)}</span>
                    <span className={p.margin < 5 ? "text-accent" : "text-success"}>{fmtPct(p.margin)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Loss / Low-Margin Categories" desc="Categories below 5% margin or negative profit">
            {lossCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weak categories in current selection.</p>
            ) : (
              <div className="space-y-2">
                {lossCategories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className={`font-mono text-xs ${c.profit < 0 ? "text-destructive" : "text-accent"}`}>
                      {fmtPct(c.margin)} · {fmtCurrency(c.profit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Discount impact */}
        <Panel title="Discount Impact: Rate vs Margin" desc="Each point is a category at a discount band — bubble size = revenue">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="category"
                dataKey="name"
                name="Discount band"
                tick={{ fill: C.muted, fontSize: 12 }}
                allowDuplicatedCategory={false}
              />
              <YAxis
                type="number"
                dataKey="margin"
                name="Margin"
                unit="%"
                tick={{ fill: C.muted, fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="sales" range={[40, 500]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n) => [n === "Margin" ? fmtPct(v) : fmtCurrency(v), n]}
              />
              <Scatter data={byDisc} fill={C.primary}>
                {byDisc.map((d, i) => (
                  <Cell key={i} fill={d.margin < 5 ? C.destructive : C.primary} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Discount What-If Scenario" desc="Model how shifting total discount spend affects profit">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Adjust discount spend</span>
                <span className="font-mono font-semibold text-primary">
                  {whatIf > 0 ? "+" : ""}
                  {whatIf}%
                </span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={whatIf}
                onChange={(e) => setWhatIf(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Current Profit</div>
                <div className="font-mono text-xl font-semibold">{fmtCurrency(t.profit)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Projected Profit</div>
                <div
                  className={`flex items-center gap-1 font-mono text-xl font-semibold ${
                    whatIfProfit >= t.profit ? "text-success" : "text-destructive"
                  }`}
                >
                  {whatIfProfit >= t.profit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {fmtCurrency(whatIfProfit)}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Regional */}
        <Panel title="Top Regions by Profit" desc="Regional profit diagnostics">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byRegion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tickFormatter={fmtCompact} tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: C.muted, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtCurrency(v)} />
              <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                {byRegion.map((r, i) => (
                  <Cell key={i} fill={r.profit < 0 ? C.destructive : C.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <footer className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{analytics.overview.totalCustomers.toLocaleString()} customers</span>
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{analytics.overview.totalProducts} products</span>
          <span>Data processed in Python · APL_Logistics.csv</span>
        </footer>
      </main>
    </div>
  );
}

function CustomerTable({ rows, positive }: { rows: typeof analytics.topCustomers; positive?: boolean }) {
  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 font-medium">Customer</th>
            <th className="pb-2 text-right font-medium">Revenue</th>
            <th className="pb-2 text-right font-medium">Profit</th>
            <th className="pb-2 text-right font-medium">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-border/50 last:border-0">
              <td className="py-2">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.segment} · {c.country}</div>
              </td>
              <td className="py-2 text-right font-mono text-xs">{fmtCompact(c.sales)}</td>
              <td className={`py-2 text-right font-mono text-xs ${positive ? "text-success" : "text-destructive"}`}>
                {fmtCurrency(c.profit)}
              </td>
              <td className="py-2 text-right font-mono text-xs text-muted-foreground">{fmtPct(c.margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
