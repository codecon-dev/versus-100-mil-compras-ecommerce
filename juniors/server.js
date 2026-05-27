
const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = 5757;

// ─── CSV loader ───────────────────────────────────────────────────────────────

const readCsv = (filename) => {
  const content = fs.readFileSync(path.join(__dirname, filename), "utf8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
};

// ─── Datasets ─────────────────────────────────────────────────────────────────

const datasets = {
  customers:        "customers_dataset.csv",
  orders:           "orders_dataset.csv",
  order_items:      "order_items_dataset.csv",
  order_payments:   "order_payments_dataset.csv",
  order_reviews:    "order_reviews_dataset.csv",
  products:         "products_dataset.csv",
  sellers:          "sellers_dataset.csv",
  geolocation:      "geolocation_dataset.csv",
  product_category: "product_category_name_translation.csv",
};

// ─── Rotas genéricas ──────────────────────────────────────────────────────────

const router = express.Router();

Object.entries(datasets).forEach(([name, file]) => {
  router.get(`/${name}`, (req, res) => {
    const data = readCsv(file);
    res.json({ dataset: name, total: data.length, data });
  });
});

// ─── "Como as pessoas pagam?" ─────────────────────────────────────────────────

router.get("/analytics/como-as-pessoas-pagam", (req, res) => {
  const rows = readCsv(datasets.order_payments);

  const summary = rows.reduce((acc, row) => {
    const type  = row.payment_type;
    const value = parseFloat(row.payment_value) || 0;
    if (!acc[type]) acc[type] = { count: 0, totalValue: 0 };
    acc[type].count++;
    acc[type].totalValue += value;
    return acc;
  }, {});

  const totalOrders  = rows.length;
  const totalRevenue = rows.reduce((s, r) => s + (parseFloat(r.payment_value) || 0), 0);

  const breakdown = Object.entries(summary)
    .map(([type, { count, totalValue }]) => ({
      paymentType:   type,
      count,
      percentOrders: ((count / totalOrders) * 100).toFixed(2) + "%",
      totalValue:    totalValue.toFixed(2),
      percentValue:  ((totalValue / totalRevenue) * 100).toFixed(2) + "%",
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    question:     "Como as pessoas pagam?",
    totalOrders,
    totalRevenue: totalRevenue.toFixed(2),
    breakdown,
    insight:      `O método mais utilizado é "${breakdown[0]?.paymentType}", com ${breakdown[0]?.percentOrders} dos pedidos.`,
  });
});

// ─── Index ────────────────────────────────────────────────────────────────────

router.get("/", (req, res) => {
  res.json({
    routes: [
      ...Object.keys(datasets).map((name) => `GET /api/${name}`),
      "GET /api/analytics/como-as-pessoas-pagam",
    ],
  });
});

app.use("/api", router);

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));