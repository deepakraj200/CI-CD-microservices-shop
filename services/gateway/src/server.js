const { createApp } = require("./app");

const port = process.env.PORT || 8080;
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:5001";
const orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://localhost:5002";

const server = createApp({ productServiceUrl, orderServiceUrl }).listen(port, () => {
  console.log(`gateway listening on ${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
