const express = require("express");

function createApp({ productServiceUrl, orderServiceUrl, fetchImpl = fetch } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "gateway" });
  });

  const proxy = (targetBase, prefix) => async (req, res) => {
    const target = `${targetBase}${req.originalUrl.replace(prefix, "")}`;
    try {
      const hasBody = !["GET", "HEAD"].includes(req.method);
      const upstream = await fetchImpl(target, {
        method: req.method,
        headers: { "content-type": "application/json" },
        body: hasBody ? JSON.stringify(req.body || {}) : undefined,
      });
      const text = await upstream.text();
      res
        .status(upstream.status)
        .type(upstream.headers?.get?.("content-type") || "application/json")
        .send(text);
    } catch (err) {
      res.status(502).json({ error: "upstream unavailable", detail: err.message });
    }
  };

  app.use("/api/products", proxy(productServiceUrl, "/api"));
  app.use("/api/orders", proxy(orderServiceUrl, "/api"));

  app.use((_req, res) => res.status(404).json({ error: "not found" }));
  return app;
}

module.exports = { createApp };
