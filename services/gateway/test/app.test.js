const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../src/app");

function start(fetchImpl) {
  return new Promise((resolve) => {
    const server = createApp({
      productServiceUrl: "http://product",
      orderServiceUrl: "http://order",
      fetchImpl,
    }).listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

const jsonResponse = (status, body) => ({
  status,
  headers: { get: () => "application/json" },
  text: async () => JSON.stringify(body),
});

test("health endpoint", async () => {
  const { server, base } = await start(async () => jsonResponse(200, {}));
  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200);
  server.close();
});

test("routes /api/products to product service", async () => {
  let called;
  const { server, base } = await start(async (url) => {
    called = url;
    return jsonResponse(200, [{ id: 1 }]);
  });
  const res = await fetch(`${base}/api/products`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(called, "http://product/products");
  server.close();
});

test("routes /api/orders POST to order service", async () => {
  let called;
  const { server, base } = await start(async (url, opts) => {
    called = { url, method: opts.method };
    return jsonResponse(201, { id: 1 });
  });
  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: 1, quantity: 1 }),
  });
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(called, { url: "http://order/orders", method: "POST" });
  server.close();
});

test("upstream failure returns 502", async () => {
  const { server, base } = await start(async () => {
    throw new Error("down");
  });
  const res = await fetch(`${base}/api/products`);
  assert.strictEqual(res.status, 502);
  server.close();
});

test("unknown route returns 404", async () => {
  const { server, base } = await start(async () => jsonResponse(200, {}));
  const res = await fetch(`${base}/nope`);
  assert.strictEqual(res.status, 404);
  server.close();
});
