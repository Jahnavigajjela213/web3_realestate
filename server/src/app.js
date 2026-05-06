const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const env = require("./config/env");
const BlockchainService = require("./services/blockchainService");
const propertyRoutes = require("./routes/propertyRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const { getPortfolio } = require("./controllers/portfolioController");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const blockchain = new BlockchainService();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.use((req, res, next) => {
  req.services = { blockchain };
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/properties", propertyRoutes);
app.use("/transactions", transactionRoutes);
app.post("/buy", transactionRoutes); // Fallback for old calls if needed, but we'll use /transactions
app.get("/portfolio/:walletAddress", getPortfolio);
app.use(errorHandler);

module.exports = app;
