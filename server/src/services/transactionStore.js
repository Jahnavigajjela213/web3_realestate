const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const filePath = path.join(__dirname, "..", "data", "transactions.json");

async function readTransactions() {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeTransactions(transactions) {
  await fs.writeFile(filePath, JSON.stringify(transactions, null, 2), "utf-8");
}

async function addTransaction(payload) {
  const txs = await readTransactions();
  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...payload
  };
  txs.unshift(entry);
  await writeTransactions(txs);
  return entry;
}

module.exports = {
  readTransactions,
  addTransaction
};
