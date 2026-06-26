import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "APL Logistics · Profitability Intelligence Dashboard" },
      {
        name: "description",
        content:
          "Customer, product, and profitability performance analytics for APL Logistics supply chain operations — margin intelligence, discount impact, and regional profit diagnostics.",
      },
      { property: "og:title", content: "APL Logistics · Profitability Intelligence" },
      {
        property: "og:description",
        content: "Margin intelligence across customers, products, and regions.",
      },
    ],
  }),
  component: Dashboard,
});
