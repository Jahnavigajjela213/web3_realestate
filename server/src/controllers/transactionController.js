const { addTransaction, readTransactions } = require("../services/transactionStore");

async function getTransactions(req, res, next) {
  try {
    const { walletAddress } = req.params;
    let txs = await readTransactions();
    if (walletAddress) {
      txs = txs.filter(tx => tx.buyerWallet.toLowerCase() === walletAddress.toLowerCase());
    }
    return res.status(200).json({ data: txs });
  } catch (error) {
    return next(error);
  }
}

async function buyShares(req, res, next) {
  try {
    const { propertyId, sharesToBuy, buyerWallet, txHash, isMock, propertyName, amountEth } = req.body;

    if (!Number.isInteger(propertyId) || propertyId < 0) {
      return res.status(400).json({ error: "propertyId must be a non-negative integer" });
    }
    if (!Number.isInteger(sharesToBuy) || sharesToBuy <= 0) {
      return res.status(400).json({ error: "sharesToBuy must be a positive integer" });
    }
    if (!buyerWallet) {
      return res.status(400).json({ error: "buyerWallet is required" });
    }

    let blockNumber = 0;
    
    // Only verify on-chain if it's not a mock transaction
    if (!isMock) {
      if (!txHash) {
        return res.status(400).json({ error: "txHash is required for real transactions" });
      }
      const receipt = await req.services.blockchain.verifyTransaction(txHash);
      if (!receipt.exists || receipt.status !== 1) {
        return res.status(400).json({ error: "Transaction hash not found or failed on chain" });
      }
      blockNumber = receipt.blockNumber;
    }

    const created = await addTransaction({
      propertyId,
      propertyName: propertyName || "Unknown Property",
      sharesToBuy,
      amountEth: amountEth || "0",
      buyerWallet,
      txHash: txHash || "0x-mock-" + Math.random().toString(16).slice(2, 10),
      blockNumber,
      isMock: !!isMock
    });

    return res.status(201).json({ data: created });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTransactions,
  buyShares
};
