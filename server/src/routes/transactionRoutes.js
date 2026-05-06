const express = require("express");
const { getTransactions, buyShares } = require("../controllers/transactionController");

const router = express.Router();

router.get("/", getTransactions);
router.get("/:walletAddress", getTransactions);
router.post("/", buyShares);

module.exports = router;
