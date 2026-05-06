import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProperties, fetchTransactions, logBuyTransaction } from "../services/api";
import { buySharesOnChain } from "../services/contract";
import { useWallet } from "../context/WalletContext";

export default function TransactionsPage() {
  const { isConnected, walletAddress, provider } = useWallet();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [propertyId, setPropertyId] = useState(searchParams.get("propertyId") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedProperty = useMemo(
    () => properties.find((item) => Number(item.id) === Number(propertyId)),
    [properties, propertyId]
  );

  const reload = async () => {
    const [propertyData, txData] = await Promise.all([fetchProperties(), fetchTransactions()]);
    setProperties(propertyData);
    setTransactions(txData);
  };

  useEffect(() => {
    reload().catch((err) => setError(err.message || "Failed loading page data"));
    const timer = setInterval(() => {
      fetchTransactions()
        .then(setTransactions)
        .catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  async function onBuy(event) {
    event.preventDefault();
    setError("");
    if (!isConnected) {
      setError("Please connect MetaMask first.");
      return;
    }
    if (!selectedProperty) {
      setError("Choose a valid property.");
      return;
    }
    if (!Number.isInteger(Number(sharesToBuy)) || Number(sharesToBuy) <= 0) {
      setError("Shares must be a positive integer.");
      return;
    }

    try {
      setBusy(true);
      const chainResult = await buySharesOnChain({
        provider,
        propertyId: Number(propertyId),
        sharesToBuy: Number(sharesToBuy),
        sharePriceWei: selectedProperty.sharePriceWei
      });

      await logBuyTransaction({
        propertyId: Number(propertyId),
        sharesToBuy: Number(sharesToBuy),
        buyerWallet: walletAddress,
        txHash: chainResult.txHash,
        executeOnChain: false
      });

      setSharesToBuy(1);
      await reload();
    } catch (err) {
      setError(err.shortMessage || err.message || "Purchase failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Transactions</h2>
      <form className="card form" onSubmit={onBuy}>
        <h3>Buy Property Shares</h3>
        <label>
          Property
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
            <option value="">Select property</option>
            {properties.map((property) => (
              <option value={property.id} key={property.id}>
                {property.name} ({property.availableShares} shares available)
              </option>
            ))}
          </select>
        </label>
        <label>
          Shares to buy
          <input
            type="number"
            min={1}
            value={sharesToBuy}
            onChange={(e) => setSharesToBuy(Number(e.target.value))}
            required
          />
        </label>
        {selectedProperty && (
          <p>
            Total cost: {(Number(selectedProperty.sharePriceEth) * Number(sharesToBuy)).toFixed(6)} ETH
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? "Processing..." : "Buy Shares"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Recent Transaction History</h3>
        {transactions.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Property ID</th>
                <th>Wallet</th>
                <th>Shares</th>
                <th>Tx Hash</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.propertyId}</td>
                  <td>{tx.buyerWallet.slice(0, 6)}...{tx.buyerWallet.slice(-4)}</td>
                  <td>{tx.sharesToBuy}</td>
                  <td>{tx.txHash.slice(0, 10)}...</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
