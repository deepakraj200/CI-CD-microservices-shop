const { createApp } = require("./app");

const port = process.env.PORT || 5002;
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:5001";

const server = createApp({ productServiceUrl }).listen(port, () => {
  console.log(`order-service listening on ${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
