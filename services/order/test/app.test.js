const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../src/app");

const products = {
  1: { id: 1, name: "Keyboard", price: 10.5, stock: 5 },
};

const fakeFetch = async (url) => {
  const id = Number(url.split("/").pop());
  const product = products[id];
  if (!product) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => product };
};

function start(opts) {
  return new Promise((resolve) => {
    const server = createApp({ productServiceUrl: "http://product", ...opts }).listen(0, () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const post = (base, body) =>
  fetch(`${base}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("health endpoint", async () => {
  const { server, base } = await start({ fetchImpl: fakeFetch });
  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200);
  server.close();
});

test("creates an order and computes total", async () => {
  const { server, base } = await start({ fetchImpl: fakeFetch });
  const res = await post(base, { productId: 1, quantity: 2 });
  assert.strictEqual(res.status, 201);
  const order = await res.json();
  assert.strictEqual(order.total, 21);
  const fetched = await fetch(`${base}/orders/${order.id}`);
  assert.strictEqual(fetched.status, 200);
  server.close();
});

test("rejects invalid payload", async () => {
  const { server, base } = await start({ fetchImpl: fakeFetch });
  const res = await post(base, { productId: "x", quantity: 0 });
  assert.strictEqual(res.status, 400);
  server.close();
});

test("unknown product returns 404", async () => {
  const { server, base } = await start({ fetchImpl: fakeFetch });
  const res = await post(base, { productId: 42, quantity: 1 });
  assert.strictEqual(res.status, 404);
  server.close();
});

test("insufficient stock returns 409", async () => {
  const { server, base } = await start({ fetchImpl: fakeFetch });
  const res = await post(base, { productId: 1, quantity: 100 });
  assert.strictEqual(res.status, 409);
  server.close();
});

test("product service failure returns 502", async () => {
  const failing = async () => {
    throw new Error("boom");
  };
  const { server, base } = await start({ fetchImpl: failing });
  const res = await post(base, { productId: 1, quantity: 1 });
  assert.strictEqual(res.status, 502);
  server.close();
});
