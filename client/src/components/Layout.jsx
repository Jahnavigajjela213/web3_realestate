import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

export default function Layout({ children }) {
  const { walletAddress, isConnected, connectWallet } = useWallet();

  async function onConnect() {
    try {
      await connectWallet();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Web3 Real Estate</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/transactions">Transactions</Link>
        </nav>
        {isConnected ? (
          <span className="wallet-pill">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
        ) : (
          <button onClick={onConnect}>Connect MetaMask</button>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
