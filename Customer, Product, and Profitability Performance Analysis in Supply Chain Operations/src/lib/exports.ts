import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtCurrency, fmtPct } from "@/lib/analytics";
import { buildCsv, filterLabel, type ExportPayload, type Agg, type Customer } from "@/lib/report-data";

export type { ExportPayload };

function download(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(p: ExportPayload) {
  download(buildCsv(p), `apl-logistics-report-${Date.now()}.csv`, "text/csv;charset=utf-8;");
}

export function exportPdf(p: ExportPayload) {
  const doc = buildPdfDoc(p);
  doc.save(`apl-logistics-report-${Date.now()}.pdf`);
}

/** Shared jsPDF builder used by the on-demand client download. */
export function buildPdfDoc(p: ExportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [30, 41, 59];
  const teal: [number, number, number] = [13, 148, 136];

  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("APL Logistics", 40, 32);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Profitability Intelligence - Leadership Report", 40, 50);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, 88);
  doc.text(`Active filters - ${filterLabel(p.filters)}`, 40, 100);

  const kpis = [
    ["Total Revenue", fmtCurrency(p.totals.sales)],
    ["Total Profit", fmtCurrency(p.totals.profit)],
    ["Profit Margin", fmtPct(p.margin)],
    ["Discount Given", fmtCurrency(p.totals.discount)],
  ];
  const cardW = (W - 80 - 30) / 4;
  let x = 40;
  const cardY = 115;
  kpis.forEach(([label, value]) => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, cardY, cardW, 48, 4, 4, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 10, cardY + 16);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(value, x + 10, cardY + 36);
    doc.setFont("helvetica", "normal");
    x += cardW + 10;
  });

  let y = cardY + 70;
  const table = (title: string, head: string[], body: (string | number)[][]) => {
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [head],
      body,
      theme: "striped",
      headStyles: { fillColor: teal, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 40, right: 40 },
    });
    // @ts-expect-error lastAutoTable injected by plugin
    y = doc.lastAutoTable.finalY + 24;
  };

  const aggRows = (rows: Agg[]) =>
    rows.map((r) => [r.name, fmtCurrency(r.sales), fmtCurrency(r.profit), fmtPct(r.margin), r.orders]);
  const aggHead = ["Name", "Revenue", "Profit", "Margin", "Orders"];

  table("Performance by Market", aggHead, aggRows(p.byMarket));
  table("Customer Segment Contribution", aggHead, aggRows(p.bySegment));
  table("Top Categories by Profit", aggHead, aggRows(p.byCategory.slice(0, 10)));

  doc.addPage();
  y = 50;
  const custRows = (rows: Customer[]) =>
    rows.map((c) => [c.name, c.segment, c.country, fmtCurrency(c.sales), fmtCurrency(c.profit), fmtPct(c.margin)]);
  const custHead = ["Customer", "Segment", "Country", "Revenue", "Profit", "Margin"];
  table("Top Customers by Profit", custHead, custRows(p.topCustomers));
  table("Bottom Customers by Profit", custHead, custRows(p.bottomCustomers));
  table("Top Products by Revenue", aggHead, aggRows(p.topProducts));

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`APL Logistics - Confidential   |   Page ${i} of ${pages}`, 40, doc.internal.pageSize.getHeight() - 24);
  }
  return doc;
}
