const express = require("express");

function createApp({ productServiceUrl, fetchImpl = fetch } = {}) {
  const app = express();
  app.use(express.json());

  const orders = new Map();
  let nextId = 1;

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "order" });
  });

  app.get("/orders", (_req, res) => {
    res.json([...orders.values()]);
  });

  app.get("/orders/:id", (req, res) => {
    const order = orders.get(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "order not found" });
    return res.json(order);
  });

  app.post("/orders", async (req, res) => {
    const { productId, quantity } = req.body || {};
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({ error: "productId and quantity (>=1) must be integers" });
    }

    let product;
    try {
      const upstream = await fetchImpl(`${productServiceUrl}/products/${productId}`);
      if (upstream.status === 404) {
        return res.status(404).json({ error: "product not found" });
      }
      if (!upstream.ok) throw new Error(`product service returned ${upstream.status}`);
      product = await upstream.json();
    } catch (err) {
      return res.status(502).json({ error: "product service unavailable", detail: err.message });
    }

    if (product.stock < quantity) {
      return res.status(409).json({ error: "insufficient stock" });
    }

    const order = {
      id: nextId++,
      productId,
      quantity,
      total: Math.round(product.price * quantity * 100) / 100,
      status: "CREATED",
      createdAt: new Date().toISOString(),
    };
    orders.set(order.id, order);
    return res.status(201).json(order);
  });

  return app;
}

module.exports = { createApp };
