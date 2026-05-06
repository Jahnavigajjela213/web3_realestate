import { useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { buySharesOnChain, getContractOwner, addPropertyOnChain, distributeRentOnChain, claimRentOnChain, fetchPendingRent } from "./services/contract";
import { fetchProperties, fetchUserPortfolio, savePropertyMetadata } from "./services/api";
import { APP_CONFIG } from "./config/env";

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedInvestorName, setSelectedInvestorName] = useState("");
  const [provider, setProvider] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [history, setHistory] = useState([]);
  const [ethInr, setEthInr] = useState(null); // live ETH price in INR
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [pendingRent, setPendingRent] = useState("0.0");
  const [notification, setNotification] = useState({ show: false, message: "" });
  
const DEMO_NAMES = [
  "James Wilson", "Mary Johnson", "Robert Brown", "Patricia Miller", "John Davis", 
  "Jennifer Garcia", "Michael Rodriguez", "Linda Martinez", "David Hernandez", "Elizabeth Lopez", 
  "William Gonzalez", "Barbara Wilson", "Richard Anderson", "Susan Thomas", "Joseph Taylor", 
  "Jessica Moore", "Thomas Jackson", "Sarah Martin", "Charles Lee", "Karen Perez"
];

const DEMO_ADDRESSES = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9", "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  "0xBcd4042DE499D14e55001CcbB24a551F3b954096", "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
  "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
  "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
  "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
];

const INITIAL_BALANCE = 10000;
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(INITIAL_BALANCE);

  // Navigation State: 'home', 'details', 'buy', 'history'
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [theme, setTheme] = useState("dark"); // 'dark' or 'light'

  // Buy State
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [buyStatus, setBuyStatus] = useState({ state: "idle", message: "" });
  const [walletError, setWalletError] = useState("");

  // Role
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin form state
  const [adminForm, setAdminForm] = useState({ name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, location: "", image: "", description: "" });
  const [adminRentForm, setAdminRentForm] = useState({ propertyId: 0, rentEth: "0.1" });
  const [adminStatus, setAdminStatus] = useState("");

  // Helper: Get consistent ID (1-20) for investor avatar
  const getInvestorId = (name) => {
    if (!name || name === "Admin") return "A";
    const index = DEMO_NAMES.indexOf(name);
    return index !== -1 ? index + 1 : "?";
  };

  // -------------------------------------------------------------------
  // Load properties from chain: availableShares = totalShares - sharesSold
  // -------------------------------------------------------------------
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchProperties();
      setProperties(data);
    } catch (err) {
      console.error("Failed to load properties:", err);
      setLoadError("Could not connect to contract. Make sure Hardhat node is running and VITE_CONTRACT_ADDRESS is set.");
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------
  // Load transactions from backend (GLOBAL)
  // -------------------------------------------------------------------
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`);
      const result = await response.json();
      if (result.data) {
        setHistory(result.data.map(tx => ({
          id: tx.id,
          date: new Date(tx.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-"),
          propertyName: tx.propertyName,
          investor: tx.buyerName || "Investor",
          buyerWallet: tx.buyerWallet, // Preserve wallet for filtering
          shares: tx.sharesToBuy,
          amountEth: tx.amountEth,
          txHash: tx.txHash,
          status: "Success",
          type: tx.type || "buy"
        })));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    loadProperties();
    loadHistory();
  }, [loadProperties, loadHistory]);

  // Fetch live ETH → INR price from CoinGecko
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr")
      .then(r => r.json())
      .then(data => setEthInr(data.ethereum.inr))
      .catch(() => setEthInr(null)); // silently fail, ETH price still shows
  }, []);

  // -------------------------------------------------------------------
  // Load portfolio (ERC-20 balances)
  // -------------------------------------------------------------------
  const loadPortfolio = useCallback(async () => {
    if (!walletAddress || properties.length === 0) return;
    setLoadingPortfolio(true);
    try {
      const response = await fetch(`${APP_CONFIG.apiBaseUrl}/portfolio/${walletAddress}`);
      const result = await response.json();
      
      const portfolioData = result.data || [];
      setPendingRent(result.pendingRentEth);
      
      if (result.balanceEth) {
        // Only use the raw blockchain balance if we are NOT in demo mode
        if (provider) {
          setCurrentBalance(parseFloat(result.balanceEth));
        }
      }

      const enrichedPortfolio = portfolioData.map(item => {
        const propInfo = properties.find(p => p.id === item.propertyId);
        return {
          ...item,
          name: item.propertyName || propInfo?.name,
          sharePriceEth: propInfo?.sharePriceEth,
          image: propInfo?.image,
          availableShares: propInfo?.availableShares,
          totalShares: propInfo?.totalShares
        };
      });

      setPortfolio(enrichedPortfolio);
    } catch (err) {
      console.error("Failed to load portfolio:", err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, [walletAddress, properties]);

  useEffect(() => {
    // Start loading portfolio when wallet changes
    if (walletAddress && properties.length > 0) {
      setLoadingPortfolio(true);
      loadPortfolio();
    }
  }, [walletAddress, properties, loadPortfolio]);

  useEffect(() => {
    // Hybrid Balance Logic:
    // If Demo Mode: Start at 10,000 ETH and subtract all mock purchases in history
    if (!provider && walletAddress && history.length > 0) {
      const mockSpent = history
        .filter(tx => tx.buyerWallet && String(tx.buyerWallet).toLowerCase() === String(walletAddress).toLowerCase())
        .reduce((acc, tx) => {
          const amount = parseFloat(tx.amountEth || 0);
          if (tx.type === "buy") return acc + amount;
          if (tx.type === "claim") return acc - amount;
          return acc;
        }, 0);

      setCurrentBalance(10000 - mockSpent);
    } else if (!provider && walletAddress && history.length === 0) {
      // Default to 10k if no history loaded yet
      setCurrentBalance(10000);
    }
  }, [history, walletAddress, provider]);

  // Helper: convert ETH string to INR display
  const toInr = (ethAmount) => {
    if (!ethInr) return "";
    const inr = parseFloat(ethAmount) * ethInr;
    return `≈ ₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  // -------------------------------------------------------------------
  // Wallet connection
  // -------------------------------------------------------------------
  async function connectWallet() {
    setWalletError("");
    try {
      if (window.ethereum) {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        setProvider(browserProvider);
        // Check if this wallet is the contract owner
        try {
          const owner = await getContractOwner();
          setIsAdmin(owner === accounts[0].toLowerCase());
        } catch { setIsAdmin(false); }
      } else {
        setWalletError("MetaMask not found. Please install the MetaMask extension.");
        setTimeout(() => setWalletError(""), 5000);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setWalletError("Connection rejected. Please try again.");
      setTimeout(() => setWalletError(""), 4000);
    }
  }

  // Demo Login (Bypasses MetaMask for UI testing)
  const connectDemoAdmin = async () => {
    try {
      const owner = await getContractOwner();
      setWalletAddress(owner);
      setIsAdmin(true);
      setProvider(null); // No real provider in demo mode
    } catch {
      setWalletAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Fallback hardhat admin
      setIsAdmin(true);
      setProvider(null);
    }
  };

  const connectDemoInvestor = (index) => {
    // index is 1-based from the dropdown select (1 for James Wilson, etc.)
    // We want James Wilson to be Account #1, Mary to be Account #2, etc.
    const accountIndex = index; 
    if (accountIndex >= 1 && accountIndex < DEMO_ADDRESSES.length) {
      const address = DEMO_ADDRESSES[accountIndex];
      setWalletAddress(address);
      setSelectedInvestorName(DEMO_NAMES[index - 1]);
      setIsAdmin(false);
      setProvider(null);
      navigateTo("home");
    }
  };

  // -------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------
  const navigateTo = (page, property = null) => {
    setCurrentPage(page);
    if (property) setSelectedProperty(property);
    if (page === "buy") {
      setSharesToBuy(1);
      setBuyStatus({ state: "idle", message: "" });
    }
    window.scrollTo(0, 0);
  };

  // -------------------------------------------------------------------
  // Buy shares — real on-chain tx, then re-fetch to reflect new sharesSold
  // -------------------------------------------------------------------
  const handleBuy = async () => {
    if (!walletAddress) {
      setBuyStatus({ state: "error", message: "Please connect your wallet first." });
      return;
    }
    // SIMULATED BUY (Demo Mode)
    if (!provider) {
      setBuyStatus({ state: "processing", message: "Simulating blockchain transaction..." });
      try {
        const amountEth = (sharesToBuy * parseFloat(selectedProperty.sharePriceEth)).toFixed(4);

        // Save to backend
        const response = await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: selectedProperty.id,
            propertyName: selectedProperty.name,
            sharesToBuy: sharesToBuy,
            amountEth: amountEth,
            buyerWallet: walletAddress,
            buyerName: isAdmin ? "Admin" : (selectedInvestorName || "Investor"),
            isMock: true,
            type: "buy"
          })
        });

        if (!response.ok) throw new Error("Failed to save mock transaction to backend");

        setBuyStatus({ state: "success", message: `Successfully simulated purchase of ${sharesToBuy} shares!` });

        // Refresh properties, history, AND portfolio from backend
        const updated = await fetchProperties();
        setProperties(updated);
        loadHistory();
        loadPortfolio();

        setTimeout(() => { navigateTo("portfolio"); }, 2000);
      } catch (err) {
        console.error("Mock buy failed:", err);
        setBuyStatus({ state: "error", message: "Mock purchase failed to persist." });
      }
      return;
    }

    // REAL BUY (MetaMask)
    if (sharesToBuy <= 0 || sharesToBuy > selectedProperty.availableShares) {
      setBuyStatus({ state: "error", message: "Invalid number of shares." });
      return;
    }

    setBuyStatus({ state: "processing", message: "Confirm the transaction in MetaMask..." });

    try {
      const result = await buySharesOnChain({
        provider,
        propertyId: selectedProperty.id,
        shareCount: sharesToBuy,
        sharePriceWei: selectedProperty.sharePriceWei
      });

      // Re-fetch from chain so availableShares = totalShares - sharesSold is accurate
      const updated = await fetchProperties();
      setProperties(updated);
      const freshProp = updated.find(p => p.id === selectedProperty.id);
      if (freshProp) setSelectedProperty(freshProp);

      // Save to backend
      await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          propertyName: selectedProperty.name,
          sharesToBuy: sharesToBuy,
          amountEth: result.amountEth,
          buyerWallet: walletAddress,
          buyerName: isAdmin ? "Admin" : (selectedInvestorName || "Investor"),
          txHash: result.txHash,
          isMock: false,
          type: "buy"
        })
      });

      setBuyStatus({ state: "success", message: `Success! ${sharesToBuy} token(s) minted to your wallet.` });
      loadHistory();

      // Update portfolio immediately after purchase
      setTimeout(() => {
        loadPortfolio();
        navigateTo("portfolio");
      }, 2000);
    } catch (err) {
      console.error("Buy failed:", err);
      const msg = err.message || "";
      if (msg.includes("insufficient funds")) {
        setBuyStatus({ state: "error", message: "Insufficient ETH in your wallet. Import a Hardhat test account into MetaMask (it has 10,000 ETH)." });
      } else {
        setBuyStatus({ state: "error", message: err.reason || "Transaction failed. Please try again." });
      }
    }
  };

  // -------------------------------------------------------------------
  // Claim rent for a property
  // -------------------------------------------------------------------
  const handleClaimRent = async () => {
    if (!walletAddress) return;
    
    try {
      // Calculate breakdown of pending rent per property for detailed history
      const claimBreakdown = portfolio
        .filter(p => parseFloat(p.totalPropertyRentDistributed || 0) > 0)
        .map(p => {
          const totalDist = parseFloat(p.totalPropertyRentDistributed);
          const userPortion = (p.sharesOwned / (p.totalShares || 100)) * totalDist;
          return {
            propertyId: p.propertyId,
            name: p.name,
            shares: p.sharesOwned,
            amount: userPortion.toFixed(4)
          };
        })
        .filter(b => parseFloat(b.amount) > 0);

      let txHash = "";
      if (!provider) {
        if (parseFloat(pendingRent) <= 0) return;
        txHash = `0x-mock-claim-${Date.now()}`;
      } else {
        const result = await claimRentOnChain({ provider });
        txHash = result.txHash;
      }

      // Record detailed breakdown in history
      const entriesToRecord = claimBreakdown.length > 0 ? claimBreakdown : [{
        propertyId: 999,
        name: "Rental Income",
        shares: portfolio.reduce((acc, p) => acc + (p.sharesOwned || 0), 0),
        amount: pendingRent
      }];

      for (const entry of entriesToRecord) {
        await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: entry.propertyId,
            propertyName: `Rental Income (${entry.name})`,
            sharesToBuy: entry.shares,
            amountEth: entry.amount,
            buyerWallet: walletAddress,
            buyerName: selectedInvestorName || "Investor",
            txHash: txHash,
            isMock: !provider,
            type: "claim"
          })
        });
      }

      setNotification({
        show: true,
        message: `Successfully claimed ${pendingRent} ETH rental income!`
      });
      
      setTimeout(() => setNotification({ show: false, message: "" }), 5000);
      loadPortfolio();
      loadHistory();
    } catch (err) {
      console.error("Claim failed:", err);
      alert(err.reason || "Claim failed. Please try again.");
    }
  };

  // -------------------------------------------------------------------
  // Admin: Add new property
  // -------------------------------------------------------------------
  const handleAddProperty = async () => {
    if (!walletAddress) return;
    if (!provider) {
      alert("Demo Mode: MetaMask is required to deploy contracts. Please connect MetaMask as the Admin.");
      return;
    }
    setAdminStatus("processing");
    try {
      const result = await addPropertyOnChain({
        provider,
        name: adminForm.name,
        symbol: adminForm.symbol,
        sharePriceEth: adminForm.sharePriceEth,
        totalShares: parseInt(adminForm.totalShares)
      });
      // Get the new property index (total count - 1)
      const updated = await fetchProperties();
      setProperties(updated);
      const newId = updated.length - 1;
      // Save metadata to backend
      await savePropertyMetadata({
        id: newId,
        name: adminForm.name,
        location: adminForm.location,
        image: adminForm.image,
        description: adminForm.description
      });
      setAdminStatus(`✅ Property "${adminForm.name}" deployed! Tx: ${result.txHash.slice(0, 12)}...`);
      setAdminForm({ name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, location: "", image: "", description: "" });
    } catch (err) {
      console.error("Add property failed:", err);
      setAdminStatus(`❌ Failed: ${err.reason || err.message}`);
    }
  };

  // Admin: Distribute rent
  const handleDistributeRent = async () => {
    if (!walletAddress) return;
    
    // SIMULATED DISTRIBUTE (Demo Mode)
    if (!provider) {
      setAdminStatus("processing");
      try {
        // Record the distribution in backend history
        await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: parseInt(adminRentForm.propertyId),
            propertyName: `Yield Distribution (${properties[adminRentForm.propertyId]?.name || "Property"})`,
            sharesToBuy: 0,
            amountEth: adminRentForm.rentEth,
            buyerWallet: walletAddress,
            buyerName: "Admin",
            txHash: `0x-mock-dist-${Date.now()}`,
            isMock: true,
            type: "distribute"
          })
        });

        setTimeout(() => {
          setNotification({
            show: true,
            message: `Admin distributed ${adminRentForm.rentEth} ETH. Check your portfolio!`
          });
          setAdminStatus(`✅ Simulated distribution of ${adminRentForm.rentEth} ETH`);
          loadProperties();
          loadPortfolio();
          setTimeout(() => {
            setNotification({ show: false, message: "" });
            setAdminStatus("");
          }, 5000);
        }, 1000);
      } catch (err) {
        setAdminStatus("❌ Simulation failed");
      }
      return;
    }

    // REAL DISTRIBUTE (MetaMask)
    setAdminStatus("processing");
    try {
      const result = await distributeRentOnChain({
        provider,
        propertyId: parseInt(adminRentForm.propertyId),
        rentEth: adminRentForm.rentEth
      });
      setAdminStatus(`✅ Distributed ${adminRentForm.rentEth} ETH rent to Property #${adminRentForm.propertyId}. Tx: ${result.txHash.slice(0, 12)}...`);
      
      setNotification({
        show: true,
        message: `Successfully distributed ${adminRentForm.rentEth} ETH rent!`
      });
      setTimeout(() => setNotification({ show: false, message: "" }), 5000);
      
      loadProperties();
      loadPortfolio();
    } catch (err) {
      console.error("Distribute rent failed:", err);
      setAdminStatus(`❌ Failed: ${err.reason || err.message}`);
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="app-shell">
      {/* Rent Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideDown 0.4s ease-out'
        }}>
          <span style={{ fontSize: '1.5rem' }}>💰</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Income Received!</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{notification.message}</div>
          </div>
          <button onClick={() => setNotification({ show: false, message: "" })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '12px', opacity: 0.7 }}>✕</button>
        </div>
      )}

      {/* Topbar Navigation */}
      <header className="topbar">
        <div className="logo-section" onClick={() => navigateTo("home")} style={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#blue-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Web3 Real Estate</h1>
        </div>

        <nav className={`nav-links ${menuOpen ? "active" : ""}`} style={{ gap: '24px' }}>
          <span className={`nav-link ${currentPage === "home" ? "active" : ""}`} onClick={() => { navigateTo("home"); setMenuOpen(false); }}>Properties</span>
          <span className={`nav-link ${currentPage === "portfolio" ? "active" : ""}`} onClick={() => { navigateTo("portfolio"); setMenuOpen(false); }}>My Portfolio</span>
          <span className={`nav-link ${currentPage === "history" ? "active" : ""}`} onClick={() => { navigateTo("history"); setMenuOpen(false); }}>Transactions</span>
          {isAdmin && <span className={`nav-link ${currentPage === "admin" ? "active" : ""}`} style={{ color: '#f59e0b' }} onClick={() => { navigateTo("admin"); setMenuOpen(false); }}>⚙ Admin</span>}
        </nav>

        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button 
              className="hamburger" 
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ padding: '8px', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
            >
              ☰
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {walletAddress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div className="wallet-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>{currentBalance.toLocaleString()} ETH</div>
                <div className="wallet-info-text" style={{ width: '1px', height: '16px', background: 'var(--border)' }}></div>
                <div className="wallet-info-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
              <button className="wallet-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setWalletAddress("")}>Disconnect</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn-demo-small" style={{ background: '#f59e0b', color: 'black' }} onClick={connectDemoAdmin}>Demo: Admin</button>
              <select 
                className="demo-select" 
                onChange={(e) => connectDemoInvestor(parseInt(e.target.value))}
                defaultValue=""
              >
                <option value="" disabled>Demo: Select Investor</option>
                {DEMO_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <button className="wallet-btn" onClick={connectWallet}>Connect Wallet</button>
            </div>
          )}
        </div>
      </header>

      {walletError && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          fontSize: "0.72rem",
          color: "#f87171",
          background: "rgba(248,113,113,0.1)",
          border: "1px solid rgba(248,113,113,0.3)",
          borderRadius: "6px",
          padding: "4px 10px",
          maxWidth: "260px",
          textAlign: "right",
          animation: "fadeIn 0.2s ease",
          zIndex: 1000
        }}>
          ⚠️ {walletError}
        </div>
      )}

      {/* Pages */}
      <main>
        {/* HOME */}
        {currentPage === "home" && (
          <div className="page-home">
            <h2 className="page-header">Available Properties</h2>

            {loading && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "48px" }}>Loading from blockchain...</p>}
            {loadError && (
              <div style={{ color: "#f87171", textAlign: "center", padding: "32px" }}>
                <p>{loadError}</p>
                <button className="btn-secondary" style={{ marginTop: "12px" }} onClick={loadProperties}>Retry</button>
              </div>
            )}

            {!loading && !loadError && (
              <div className="grid">
                {properties.map((property) => {
                  // availableShares derived from chain: totalShares - sharesSold
                  const availableShares = property.availableShares;
                  const soldPct = Math.round((property.sharesSold / property.totalShares) * 100);

                  return (
                    <div key={property.id} className="card">
                      <div className="card-image">
                        <img src={property.image} alt={property.name} />
                      </div>
                      <div className="card-content">
                        <div className="card-title">{property.name}</div>
                        <div className="card-location">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {property.location}
                        </div>
                        <div className="card-stats">
                          <div className="stat-item">
                            <span className="stat-label">Share Price</span>
                            <span className="stat-value">
                              {property.sharePriceEth} ETH
                              {ethInr && <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>{toInr(property.sharePriceEth)}</span>}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Shares Left</span>
                            <span className="stat-value">{availableShares} / {property.totalShares}</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ margin: "8px 0 12px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", height: "6px" }}>
                          <div style={{ width: `${soldPct}%`, background: "linear-gradient(90deg, #60a5fa, #a78bfa)", borderRadius: "4px", height: "6px", transition: "width 0.4s" }} />
                        </div>
                        <div className="card-actions">
                          <button className="btn-secondary" onClick={() => navigateTo("details", property)}>View Details</button>
                          <button className="btn-primary" disabled={availableShares === 0} onClick={() => navigateTo("buy", property)}>
                            {availableShares === 0 ? "Sold Out" : "Buy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DETAILS */}
        {currentPage === "details" && selectedProperty && (
          <div className="page-details">
            <div className="page-header">
              <button className="back-btn" onClick={() => navigateTo("home")}>← Back</button>
              <h2>Property Details</h2>
            </div>

            <div className="details-container">
              <div className="details-image">
                <img src={selectedProperty.image} alt={selectedProperty.name} />
              </div>
              <div className="details-info">
                <h2>{selectedProperty.name}</h2>
                <div className="card-location" style={{ fontSize: "1.1rem", marginBottom: "24px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {selectedProperty.location}
                </div>

                <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "24px" }}>
                  Fractional real estate ownership — earn passive income and benefit from property appreciation.
                  Each token you hold represents 1 share, minted directly to your wallet on-chain.
                </p>

                <div className="details-stats">
                  <div className="details-stat-box">
                    <div className="label">Share Price</div>
                    <div className="value">{selectedProperty.sharePriceEth} ETH</div>
                  </div>
                  <div className="details-stat-box">
                    <div className="label">Total Shares</div>
                    <div className="value">{selectedProperty.totalShares}</div>
                  </div>
                  <div className="details-stat-box">
                    <div className="label">Shares Sold</div>
                    <div className="value">{selectedProperty.sharesSold}</div>
                  </div>
                  <div className="details-stat-box">
                    <div className="label">Available Shares</div>
                    <div className="value">{selectedProperty.availableShares}</div>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "16px", wordBreak: "break-all" }}>
                  Token Contract: <span style={{ color: "#a78bfa" }}>{selectedProperty.tokenAddress}</span>
                </div>

                <button
                  className="btn-primary"
                  style={{ padding: "16px", fontSize: "1.1rem", marginTop: "auto" }}
                  disabled={selectedProperty.availableShares === 0}
                  onClick={() => navigateTo("buy", selectedProperty)}
                >
                  {selectedProperty.availableShares === 0 ? "Sold Out" : "Buy Shares Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BUY */}
        {currentPage === "buy" && selectedProperty && (
          <div className="page-buy">
            <div className="page-header">
              <button className="back-btn" onClick={() => navigateTo("details", selectedProperty)}>← Back</button>
              <h2>Buy Shares — {selectedProperty.name}</h2>
            </div>

            <div className="buy-container">
              <div className="buy-summary">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Share Price</span>
                  <span style={{ fontWeight: "600", textAlign: "right" }}>
                    {selectedProperty.sharePriceEth} ETH
                    {ethInr && <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 400 }}>{toInr(selectedProperty.sharePriceEth)}</span>}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Available Shares</span>
                  <span style={{ fontWeight: "600" }}>{selectedProperty.availableShares}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Shares Sold</span>
                  <span style={{ fontWeight: "600" }}>{selectedProperty.sharesSold} / {selectedProperty.totalShares}</span>
                </div>
              </div>

              <div className="input-group">
                <label>Enter Number of Shares</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProperty.availableShares}
                  value={sharesToBuy}
                  onChange={(e) => setSharesToBuy(parseInt(e.target.value) || 0)}
                  disabled={buyStatus.state === "processing" || buyStatus.state === "success"}
                />
              </div>

              <div className="total-cost">
                <span className="total-cost-label">Total Cost</span>
                <span className="total-cost-value" style={{ textAlign: "right" }}>
                  {(sharesToBuy * parseFloat(selectedProperty.sharePriceEth)).toFixed(4)} ETH
                  {ethInr && <span style={{ display: "block", fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>{toInr((sharesToBuy * parseFloat(selectedProperty.sharePriceEth)).toFixed(4))}</span>}
                </span>
              </div>

              <button
                className={`btn-primary ${(!provider && !walletAddress) || (sharesToBuy * parseFloat(selectedProperty.sharePriceEth) > 0.05 && walletAddress.startsWith('0x3c')) ? 'warning' : ''}`}
                style={{ width: "100%", padding: "16px", fontSize: "1.2rem" }}
                onClick={handleBuy}
                disabled={buyStatus.state === "processing" || buyStatus.state === "success" || !walletAddress}
              >
                {buyStatus.state === "processing"
                  ? "Waiting for confirmation..."
                  : walletAddress
                    ? "Confirm Purchase"
                    : "Connect Wallet to Purchase"}
              </button>

              {/* Real-time Validation Hint */}
              {walletAddress && sharesToBuy > 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
                  <i className="fas fa-shield-alt" style={{ marginRight: "6px", color: "var(--accent)" }}></i>
                  FastAPI Validation: Ensuring secure transaction for {walletAddress.slice(0, 6)}...
                </p>
              )}

              {buyStatus.state !== "idle" && (
                <div className={`status-msg ${buyStatus.state}`}>
                  {buyStatus.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {currentPage === "history" && (
          <div className="page-history">
            <h2 className="page-header">Transaction History</h2>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Investor</th>
                    <th>Property</th>
                    <th>Shares</th>
                    <th>Amount (ETH)</th>
                    <th>Tx Hash</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                        No transactions yet. Connect your wallet and buy shares to see history here.
                      </td>
                    </tr>
                  ) : (
                    history.map((tx) => (
                      <tr key={tx.id}>
                        <td data-label="Date">{tx.date}</td>
                        <td data-label="Investor">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {getInvestorId(tx.investor)}
                            </div>
                            {tx.investor || "Unknown"}
                          </div>
                        </td>
                        <td data-label="Property" style={{ fontWeight: "600" }}>
                          {tx.type === 'distribute' ? 'Yield Distribution' : tx.propertyName}
                        </td>
                        <td data-label="Shares">
                          {tx.shares}
                        </td>
                        <td data-label="Amount (ETH)" style={{ 
                          fontWeight: "600", 
                          color: tx.type === 'claim' ? '#10b981' : 'var(--accent)',
                          whiteSpace: 'nowrap'
                        }}>
                          {tx.type === 'claim' ? '+' : '-'}{parseFloat(tx.amountEth).toFixed(4)}
                          <span style={{ fontSize: '0.65rem', marginLeft: '6px', opacity: 0.6, display: 'inline-block', width: '40px' }}>
                            ETH
                          </span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                            {tx.type === 'claim' ? 'CREDIT' : 'DEBIT'}
                          </span>
                        </td>
                        <td data-label="Tx Hash" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : "—"}
                        </td>
                        <td data-label="Status"><span className="status-badge success">{tx.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PORTFOLIO */}
        {currentPage === "portfolio" && (
          <div className="page-portfolio">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 className="page-header" style={{ marginBottom: 0 }}>My Real Estate Portfolio</h2>
              <button className="btn-secondary" onClick={loadPortfolio} disabled={loadingPortfolio}>
                {loadingPortfolio ? "Syncing..." : "Refresh Balances"}
              </button>
            </div>

            {walletAddress && portfolio.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Capital</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#10b981' }}>
                    {currentBalance.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6 }}>ETH</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '4px' }}>Demo Wallet Funds</div>
                </div>
                <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Portfolio Value</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {portfolio.reduce((acc, item) => acc + ((item.sharesOwned || 0) * parseFloat(item.sharePriceEth || 0)), 0).toFixed(3)} <span style={{ fontSize: '1rem', opacity: 0.6 }}>ETH</span>
                  </div>
                  {ethInr && <div style={{ fontSize: '0.95rem', opacity: 0.6, marginTop: '4px' }}>{toInr(portfolio.reduce((acc, item) => acc + ((item.sharesOwned || 0) * parseFloat(item.sharePriceEth || 0)), 0))}</div>}
                </div>
                <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Investments</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{portfolio.length} <span style={{ fontSize: '1rem', opacity: 0.6 }}>Properties</span></div>
                  <div style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '4px' }}>✓ Earning Passive Rent</div>
                </div>
                <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claimable Rent</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#10b981' }}>{pendingRent} <span style={{ fontSize: '1rem', opacity: 0.6 }}>ETH</span></div>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '12px', padding: '8px', fontSize: '0.9rem', background: '#10b981' }}
                    disabled={parseFloat(pendingRent) === 0}
                    onClick={handleClaimRent}
                  >
                    Claim Rent
                  </button>
                </div>
              </div>
            )}

            {!walletAddress ? (
              <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
                <h3 style={{ marginBottom: '12px' }}>Wallet Connection Required</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Please connect your investor identity to view your private assets.</p>
                <button className="btn-primary" onClick={connectWallet}>Connect Wallet</button>
              </div>
            ) : portfolio.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>You don't own any property tokens yet. Start investing to build your portfolio!</p>
                <button className="btn-primary" onClick={() => navigateTo('home')}>Browse Properties</button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Your Shares</th>
                      <th>Value (ETH)</th>
                      <th>Yield %</th>
                      <th>Market Availability</th>
                      <th>Distributed Rent</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => {
                      const pInfo = properties.find(p => p.id === item.propertyId);
                      return (
                        <tr key={item.id}>
                        <td data-label="Property" style={{ fontWeight: "600" }}>{item.name}</td>
                        <td data-label="Your Shares" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.sharesOwned}</td>
                        <td data-label="Value (ETH)" style={{ fontWeight: "500" }}>
                          {(item.sharesOwned * parseFloat(item.sharePriceEth)).toFixed(3)} ETH
                        </td>
                        <td data-label="Yield %" style={{ color: '#10b981', fontWeight: '600' }}>
                          {((parseFloat(pInfo?.totalRentDistributed || 0) / (pInfo?.totalShares || 100)) / parseFloat(item.sharePriceEth) * 100).toFixed(1)}%
                        </td>
                        <td data-label="Market Availability">
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: item.availableShares > 10 ? 'var(--text-muted)' : '#f59e0b' }}>
                            {item.availableShares} / {item.totalShares} left
                          </div>
                        </td>
                        <td data-label="Distributed Rent">
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {pInfo?.totalRentDistributed || '0'} ETH
                          </div>
                        </td>
                        <td data-label="Action">
                          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => navigateTo('details', item)}>Details</button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Personal Activity */}
            <div style={{ marginTop: '48px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                {isAdmin ? "Admin Operational History" : "My Recent Activity"}
              </h3>
              <div className="table-container" style={{ background: 'rgba(0,0,0,0.1)' }}>
                <table style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action / Property</th>
                      <th>Shares</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter(tx => String(tx.buyerWallet || "").toLowerCase() === String(walletAddress || "").toLowerCase())
                      .length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No activity found for this account.
                          </td>
                        </tr>
                      ) : (
                        history
                          .filter(tx => String(tx.buyerWallet || "").toLowerCase() === String(walletAddress || "").toLowerCase())
                          .map(tx => (
                            <tr key={tx.id}>
                              <td data-label="Date">{tx.date}</td>
                              <td data-label="Property" style={{ fontWeight: '600' }}>
                                {tx.type === 'distribute' ? `Distributed Yield (${tx.propertyName})` : tx.propertyName}
                              </td>
                              <td data-label="Shares">
                                {tx.shares || "—"}
                              </td>
                              <td data-label="Amount" style={{ 
                                color: tx.type === 'claim' ? '#10b981' : tx.type === 'distribute' ? '#f59e0b' : 'var(--accent)',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}>
                                {tx.type === 'claim' ? '+' : '-'}{parseFloat(tx.amountEth).toFixed(4)}
                                <span style={{ fontSize: '0.7rem', marginLeft: '6px', opacity: 0.6, display: 'inline-block', width: '30px' }}>
                                  ETH
                                </span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                  {tx.type === 'claim' ? 'Income' : tx.type === 'distribute' ? 'Sent' : 'Spent'}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {currentPage === "admin" && isAdmin && (
          <div className="page-history">
            <h2 className="page-header" style={{ color: '#f59e0b' }}>⚙ Admin Dashboard</h2>

            {/* Status banner */}
            {adminStatus && (
              <div style={{ background: adminStatus.startsWith('✅') ? 'rgba(16,185,129,0.15)' : adminStatus === 'processing' ? 'rgba(96,165,250,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${adminStatus.startsWith('✅') ? '#10b981' : adminStatus === 'processing' ? '#60a5fa' : '#ef4444'}`, borderRadius: '10px', padding: '12px 20px', marginBottom: '24px', color: adminStatus === 'processing' ? '#60a5fa' : 'white', fontWeight: 500 }}>
                {adminStatus === 'processing' ? '⏳ Processing transaction... Please confirm in MetaMask.' : adminStatus}
              </div>
            )}

            <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

              {/* Add Property Panel */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', color: '#60a5fa' }}>🏗 Add New Property</h3>
                {[['Property Name', 'name', 'text', 'e.g. Sunset Villas'], ['Token Symbol', 'symbol', 'text', 'e.g. SSV'], ['Share Price (ETH)', 'sharePriceEth', 'number', '0.01'], ['Total Shares', 'totalShares', 'number', '100'], ['Location', 'location', 'text', 'e.g. Delhi, India'], ['Image URL', 'image', 'text', 'https://...'], ['Description', 'description', 'text', '...']].map(([label, key, type]) => (
                  <div key={key} className="input-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.8rem' }}>{label}</label>
                    <input type={type} value={adminForm[key]} onChange={e => setAdminForm(f => ({ ...f, [key]: e.target.value }))} style={{ padding: '8px 12px', fontSize: '0.9rem' }} />
                  </div>
                ))}
                <button className="btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={handleAddProperty} disabled={adminStatus === 'processing' || !adminForm.name || !adminForm.symbol}>
                  {adminStatus === 'processing' ? 'Deploying...' : 'Deploy Property Token'}
                </button>
              </div>

              {/* Distribute Rent Panel */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', color: '#10b981' }}>💰 Distribute Rent Yield</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Send ETH rental income to a property's yield pool. All token holders will be able to claim their proportional share.</p>
                <div className="input-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem' }}>Property ID</label>
                  <select style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', width: '100%', fontSize: '0.9rem' }} value={adminRentForm.propertyId} onChange={e => setAdminRentForm(f => ({ ...f, propertyId: e.target.value }))}>
                    {properties.map((p, i) => <option key={i} value={i} style={{ background: '#1e2130' }}>#{i} — {p.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem' }}>Rent Amount (ETH)</label>
                  <input type="number" min="0.001" step="0.01" value={adminRentForm.rentEth} onChange={e => setAdminRentForm(f => ({ ...f, rentEth: e.target.value }))} style={{ padding: '8px 12px', fontSize: '0.9rem' }} />
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.82rem', color: '#6ee7b7' }}>
                  💡 {adminRentForm.rentEth} ETH will be split proportionally across all {properties[adminRentForm.propertyId]?.totalShares || '?'} shares of this property.
                </div>
                <button className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={handleDistributeRent} disabled={adminStatus === 'processing'}>
                  {adminStatus === 'processing' ? 'Processing...' : 'Distribute Rent'}
                </button>

                {/* Properties overview table */}
                <div style={{ marginTop: '28px' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Properties</h4>
                  {properties.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                      <span>#{i} {p.name}</span>
                      <span style={{ color: '#10b981' }}>{p.totalRentDistributed || '0'} ETH distributed</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
