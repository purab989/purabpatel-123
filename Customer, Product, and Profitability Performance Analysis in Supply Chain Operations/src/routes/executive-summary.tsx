import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Users,
  Layers,
  TicketPercent,
  Printer,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { computeExecutiveSummary } from "@/lib/executive";
import { fmtCurrency, fmtPct } from "@/lib/analytics";

export const Route = createFileRoute("/executive-summary")({
  head: () => ({
    meta: [
      { title: "Executive Summary · APL Logistics Profitability" },
      {
        name: "description",
        content:
          "Government stakeholder executive summary of APL Logistics supply-chain profitability: revenue, profit, margin, customer value, category margin, and discount impact.",
      },
    ],
  }),
  component: ExecutiveSummary,
});

function ExecutiveSummary() {
  const k = useMemo(() => computeExecutiveSummary(), []);

  const kpis = [
    {
      icon: DollarSign,
      label: "Total Revenue",
      value: fmtCurrency(k.totalRevenue),
      desc: "Sum of all sales across the operation.",
    },
    {
      icon: TrendingUp,
      label: "Total Profit",
      value: fmtCurrency(k.totalProfit),
      desc: "Aggregate profit across all orders.",
    },
    {
      icon: Percent,
      label: "Profit Margin",
      value: fmtPct(k.profitMargin),
      desc: "Profit as a percentage of sales.",
    },
    {
      icon: Users,
      label: "Customer Value Index",
      value: fmtCurrency(k.customerValueIndex),
      desc: `Profit contribution per customer (${k.customers.toLocaleString()} customers).`,
    },
    {
      icon: Layers,
      label: "Category Margin",
      value: fmtPct(k.avgCategoryMargin),
      desc: "Average profit margin across product categories.",
    },
    {
      icon: TicketPercent,
      label: "Discount Impact Ratio",
      value: fmtPct(k.discountImpactRatio),
      desc: "Share of gross revenue conceded as discounts.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 print:bg-transparent">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Executive Summary</h1>
              <p className="text-xs text-muted-foreground">
                APL Logistics · Supply-Chain Profitability · Prepared for government stakeholders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This summary presents the key profitability indicators for APL Logistics supply-chain
            operations. It is intended to give government stakeholders a concise, high-level view of
            financial performance, customer value, product-category efficiency, and the margin effect
            of discounting. Figures reflect the full reporting dataset.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                  <kpi.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{kpi.desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Margin by Product Category
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 text-right font-medium">Revenue</th>
                  <th className="py-2 pr-4 text-right font-medium">Profit</th>
                  <th className="py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {k.categories.map((c) => (
                  <tr key={c.name} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtCurrency(c.sales)}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${c.profit < 0 ? "text-destructive" : ""}`}>
                      {fmtCurrency(c.profit)}
                    </td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${c.margin < 0 ? "text-destructive" : "text-foreground"}`}>
                      {fmtPct(c.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-border p-5 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Methodology notes</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Customer Value Index = Total Profit ÷ total active customers.</li>
            <li>Category Margin = unweighted average of each product category's profit margin.</li>
            <li>
              Discount Impact Ratio = total discounts ÷ gross revenue (sales + discounts), i.e. the
              portion of potential revenue given away through discounting.
            </li>
          </ul>
          <p className="mt-3">Generated {new Date().toLocaleString()} · Confidential</p>
        </section>
      </main>
    </div>
  );
}
