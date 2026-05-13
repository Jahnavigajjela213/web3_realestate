import { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { BrowserProvider } from "ethers";
import { buySharesOnChain, getContractOwner, addPropertyOnChain, distributeRentOnChain, claimRentOnChain, fetchPendingRent, setTenantOnChain, payRentOnChain } from "./services/contract";
import { fetchProperties, fetchUserPortfolio, savePropertyMetadata } from "./services/api";
import { APP_CONFIG } from "./config/env";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { Wallet, PieChart as PieChartIcon, Home, DollarSign, TrendingUp, Calendar, RefreshCw, BarChart2, History } from "lucide-react";

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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  // Initialize from storage
  useEffect(() => {
    const savedAddr = localStorage.getItem("walletAddress");
    const savedRole = localStorage.getItem("role");
    if (savedAddr) {
      setWalletAddress(savedAddr);
      const idx = DEMO_ADDRESSES.indexOf(savedAddr);
      if (idx !== -1) setSelectedInvestorName(DEMO_NAMES[idx]);
      
      // If was connected via MetaMask, re-init provider
      if (localStorage.getItem("loginMethod") === "metamask" && window.ethereum) {
        setProvider(new BrowserProvider(window.ethereum));
      }
    }
  }, []);

  const handleLoginSuccess = (addr, role, prov) => {
    setWalletAddress(addr);
    setIsAdmin(role === "Admin");
    setProvider(prov);
    localStorage.setItem("role", role);
    localStorage.setItem("walletAddress", addr);
    const idx = DEMO_ADDRESSES.indexOf(addr);
    if (idx !== -1) setSelectedInvestorName(DEMO_NAMES[idx]);
  };

  // Buy State
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [buyStatus, setBuyStatus] = useState({ state: "idle", message: "" });
  const [walletError, setWalletError] = useState("");

  // Role
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin form state
  const [adminForm, setAdminForm] = useState({ name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, location: "", image: "", description: "" });
  const [adminRentForm, setAdminRentForm] = useState({ propertyId: 0, rentEth: "0.1" });
  const [adminTenantForm, setAdminTenantForm] = useState({ propertyId: 0, name: "", rentEth: "0.1" });
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
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
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
          propertyId: tx.propertyId,
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
    if (!walletAddress) return;
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
      // 1. Calculate spent amount (purchases I made)
      const mockSpent = history
        .filter(tx => tx.buyerWallet && String(tx.buyerWallet).toLowerCase() === String(walletAddress).toLowerCase())
        .reduce((acc, tx) => {
          const amount = parseFloat(tx.amountEth || 0);
          if (tx.type === "buy" || tx.type === "rent") return acc + amount;
          return acc;
        }, 0);

      // 2. Calculate earned amount (my share of global rent distributions)
      const mockEarned = history
        .filter(tx => tx.type === "distribute" || tx.type === "rent" || tx.type === "claim")
        .reduce((acc, tx) => {
          const amount = parseFloat(tx.amountEth || 0);
          if (tx.type === "claim" && tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase()) {
            return acc + amount;
          }
          if (tx.type === "distribute" || tx.type === "rent") {
            // Find if I own shares in this property to get my cut
            const prop = portfolio.find(p => p.propertyId === tx.propertyId);
            if (prop && prop.sharesOwned > 0) {
              const myShare = (prop.sharesOwned / (prop.totalShares || 100)) * amount;
              return acc + myShare;
            }
          }
          return acc;
        }, 0);

      setCurrentBalance(10000 - mockSpent + mockEarned);
    } else if (!provider && walletAddress && history.length === 0) {
      // Default to 10k if no history loaded yet
      setCurrentBalance(10000);
    }
  }, [history, walletAddress, provider, portfolio]);

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

    if (!sharesToBuy || sharesToBuy <= 0 || sharesToBuy > selectedProperty.availableShares) {
      setBuyStatus({ state: "error", message: "Invalid number of shares." });
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
            propertyName: entry.name,
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
    
    if (adminForm.image.includes('google.com/imgres')) {
      alert("Invalid Image URL: You have pasted a link to a Google Search page, not a direct image. Please right-click the image and select 'Copy Image Address' to get a valid link (usually ending in .jpg or .png).");
      return;
    }

    setAdminStatus("processing");
    try {
      if (!provider) {
        // SIMULATED DEPLOYMENT
        await savePropertyMetadata({
          name: adminForm.name,
          symbol: adminForm.symbol,
          sharePriceEth: adminForm.sharePriceEth,
          totalShares: parseInt(adminForm.totalShares),
          location: adminForm.location,
          image: adminForm.image,
          description: adminForm.description,
          isSimulated: true
        });
        
        const updated = await fetchProperties();
        setProperties(updated);
        setAdminStatus(`✅ [DEMO] Property "${adminForm.name}" created (Simulated)`);
      } else {
        // REAL ON-CHAIN DEPLOYMENT
        const result = await addPropertyOnChain({
          provider,
          name: adminForm.name,
          symbol: adminForm.symbol,
          sharePriceEth: adminForm.sharePriceEth,
          totalShares: parseInt(adminForm.totalShares)
        });
        
        const updated = await fetchProperties();
        setProperties(updated);
        const newId = updated.length - 1;
        
        await savePropertyMetadata({
          id: newId,
          name: adminForm.name,
          location: adminForm.location,
          image: adminForm.image,
          description: adminForm.description
        });
        setAdminStatus(`✅ Property "${adminForm.name}" deployed! Tx: ${result.txHash.slice(0, 12)}...`);
      }
      
      setAdminForm({ name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, location: "", image: "", description: "" });
      setTimeout(() => setAdminStatus(""), 5000);
    } catch (err) {
      console.error("Deploy failed:", err);
      setAdminStatus(`❌ Error: ${err.message || "Deployment failed"}`);
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

  // Admin: Set Tenant
  const handleSetTenant = async () => {
    if (!walletAddress) return;
    setAdminStatus("processing");
    try {
      if (provider) {
        await setTenantOnChain({
          provider,
          propertyId: parseInt(adminTenantForm.propertyId),
          name: adminTenantForm.name,
          rentEth: adminTenantForm.rentEth
        });
      }
      setAdminStatus(`✅ Tenant "${adminTenantForm.name}" assigned to Property #${adminTenantForm.propertyId}`);
      loadProperties();
      setTimeout(() => setAdminStatus(""), 5000);
    } catch (err) {
      console.error("Set tenant failed:", err);
      setAdminStatus(`❌ Error: ${err.message || "Failed to set tenant"}`);
    }
  };

  // Demo/Tenant: Pay Rent
  const handlePayRent = async (property) => {
    if (!walletAddress) return;
    setBuyStatus({ state: "processing", message: "Processing rent payment..." });
    try {
      if (provider) {
        await payRentOnChain({
          provider,
          propertyId: property.id,
          rentEth: property.tenant.rentAmount
        });
      }

      // Log in backend for history (Simulated/On-chain fallback)
      await fetch(`${APP_CONFIG.apiBaseUrl}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          propertyName: property.name,
          sharesToBuy: 0,
          amountEth: property.tenant.rentAmount,
          buyerWallet: walletAddress,
          buyerName: getInvestorName(walletAddress),
          txHash: `0x-rent-${Date.now()}`,
          isMock: !provider,
          type: "distribute"
        })
      });

      setNotification({ show: true, message: `✅ Rent of ${property.tenant.rentAmount} ETH paid successfully!` });
      loadProperties();
      loadPortfolio();
      loadHistory();
      setBuyStatus({ state: "idle", message: "" });
      setTimeout(() => setNotification({ show: false, message: "" }), 5000);
    } catch (err) {
      console.error("Rent payment failed:", err);
      setBuyStatus({ state: "idle", message: "" });
      alert(err.reason || "Rent payment failed. Ensure you have enough ETH.");
    }
  };


  // -------------------------------------------------------------------
  // Sub-components for Routing
  // -------------------------------------------------------------------
  
  const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const role = localStorage.getItem("role");
    const [showDropdown, setShowDropdown] = useState(false);

    const handleAccountSwitch = (address, index) => {
      setWalletAddress(address);
      setSelectedInvestorName(DEMO_NAMES[index]);
      localStorage.setItem("walletAddress", address);
      
      // Update role based on index: idx < 4 is Admin, idx < 12 is Investor, else Tenant
      const newRole = index < 4 ? "Admin" : index < 12 ? "Investor" : "Tenant";
      localStorage.setItem("role", newRole);
      setIsAdmin(newRole === "Admin");

      setShowDropdown(false);
      loadPortfolio();
      loadProperties();
      loadHistory(); // Reload history to apply new role formatting
    };

    return (
      <header className="topbar">
        <div className="logo-section" onClick={() => navigate("/")} style={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>EstateChain</h1>
        </div>

        <nav className={`nav-links ${menuOpen ? "active" : ""}`} style={{ gap: '24px' }}>
          {role === "Investor" && (
            <>
              <span className={`nav-link ${location.pathname === "/properties" ? "active" : ""}`} onClick={() => { navigate("/properties"); setMenuOpen(false); }}>Marketplace</span>
              <span className={`nav-link ${location.pathname === "/portfolio" ? "active" : ""}`} onClick={() => { navigate("/portfolio"); setMenuOpen(false); }}>Portfolio</span>
            </>
          )}
          {role === "Admin" && (
            <>
              <span className={`nav-link ${location.pathname === "/history" ? "active" : ""}`} onClick={() => { navigate("/history"); setMenuOpen(false); }}>Activity</span>
              <span className={`nav-link ${location.pathname === "/admin" ? "active" : ""}`} style={{ color: '#f59e0b' }} onClick={() => { navigate("/admin"); setMenuOpen(false); }}>Dashboard</span>
            </>
          )}
          {role === "Tenant" && <span className={`nav-link ${location.pathname === "/tenant" ? "active" : ""}`} style={{ color: '#10b981' }} onClick={() => { navigate("/tenant"); setMenuOpen(false); }}>My Lease</span>}
        </nav>

        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="account-dropdown">
              <div className="dropdown-trigger" onClick={() => setShowDropdown(!showDropdown)}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedInvestorName || "Account"}</div>
                  <div style={{ fontWeight: 'bold', color: '#6366f1' }}>{currentBalance.toLocaleString()} ETH</div>
                </div>
                <div className={`role-badge ${role?.toLowerCase()}`}>{role}</div>
                <span>▼</span>
              </div>
              
              {showDropdown && (
                <div className="dropdown-menu">
                  <div style={{ padding: '12px', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    Switch Account (Demo)
                  </div>
                  {DEMO_ADDRESSES.map((addr, idx) => {
                    const accRole = idx < 4 ? "Admin" : idx < 12 ? "Investor" : "Tenant";
                    if (accRole !== role) return null; // Only show accounts for current role
                    
                    return (
                      <div 
                        key={idx} 
                        className={`dropdown-item ${walletAddress === addr ? "active" : ""}`}
                        onClick={() => handleAccountSwitch(addr, idx)}
                      >
                        <span className="acc-name">{DEMO_NAMES[idx]}</span>
                        <span className="acc-addr">{addr.slice(0, 10)}...{addr.slice(-6)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="btn-secondary" onClick={() => { setWalletAddress(""); localStorage.clear(); navigate("/"); }}>Logout</button>
        </div>
      </header>
    );
  };

  const PropertiesView = () => {
    const navigate = useNavigate();
    const isDark = theme === 'dark';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    return (
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
          <div 
            className="admin-investor-scroll" 
            style={{ 
              maxHeight: '620px', 
              overflowY: 'auto', 
              paddingRight: '8px',
              paddingBottom: '20px'
            }}
          >
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                gap: '16px' 
              }}
            >
              {[...properties].sort((a, b) => Number(a.id) - Number(b.id)).map((property) => {
                const availableShares = property.availableShares;
                const soldPct = Math.round((property.sharesSold / property.totalShares) * 100);
                return (
                  <div key={property.id} className="card" style={{ borderRadius: '16px' }}>
                    <div className="card-image" style={{ height: '140px' }}>
                      <img src={property.image} alt={property.name} style={{ opacity: 1 }} />
                    </div>
                    <div className="card-content" style={{ padding: '15px' }}>
                      <div className="card-title" style={{ fontSize: '1rem', marginBottom: '4px' }}>{property.name}</div>
                      <div className="card-location" style={{ fontSize: '0.8rem', marginBottom: '12px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {property.location}
                      </div>
                      
                      <div style={{ 
                        background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', 
                        padding: '10px', 
                        borderRadius: '10px', 
                        marginBottom: '12px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', color: textMuted }}>Price</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{property.sharePriceEth} ETH</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', color: textMuted }}>Left</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{availableShares}/{property.totalShares}</span>
                        </div>
                      </div>

                      <div style={{ margin: "0 0 12px", background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: "4px", height: "4px" }}>
                        <div style={{ width: `${soldPct}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: "4px", height: "4px", transition: "width 0.4s" }} />
                      </div>

                      <div className="card-actions" style={{ gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '8px', fontSize: '0.8rem' }} onClick={() => { setSelectedProperty(property); navigate(`/details/${property.id}`); }}>Details</button>
                        <button className="btn-primary" style={{ padding: '8px', fontSize: '0.8rem' }} disabled={availableShares === 0} onClick={() => { setSelectedProperty(property); navigate(`/buy/${property.id}`); }}>
                          {availableShares === 0 ? "Sold" : "Buy"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const DetailsView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const property = properties.find(p => p.id === parseInt(id)) || selectedProperty;

    if (!property) return <div style={{ textAlign: 'center', padding: '50px' }}>Property not found. <button onClick={() => navigate('/properties')}>Go Back</button></div>;

    return (
      <div className="page-details">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate("/properties")}>← Back</button>
          <h2>Property Details</h2>
        </div>
        <div className="details-container">
          <div className="details-image"><img src={property.image} alt={property.name} /></div>
          <div className="details-info">
            <h2>{property.name}</h2>
            <div className="card-location" style={{ fontSize: "1.1rem", marginBottom: "24px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {property.location}
            </div>
            <div className="details-stats">
              <div className="details-stat-box"><div className="label">Share Price</div><div className="value">{property.sharePriceEth} ETH</div></div>
              <div className="details-stat-box"><div className="label">Total Shares</div><div className="value">{property.totalShares}</div></div>
              <div className="details-stat-box"><div className="label">Shares Sold</div><div className="value">{property.sharesSold}</div></div>
              <div className="details-stat-box"><div className="label">Available Shares</div><div className="value">{property.availableShares}</div></div>
            </div>
            <button className="btn-primary" style={{ padding: "16px", fontSize: "1.1rem", marginTop: "auto" }} disabled={property.availableShares === 0} onClick={() => navigate(`/buy/${property.id}`)}>
              {property.availableShares === 0 ? "Sold Out" : "Buy Shares Now"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const BuyView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const property = properties.find(p => p.id === parseInt(id)) || selectedProperty;

    if (!property) return <div style={{ textAlign: 'center', padding: '50px' }}>Property not found.</div>;

    return (
      <div className="page-buy">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(`/details/${id}`)}>← Back</button>
          <h2>Buy Shares — {property.name}</h2>
        </div>
        <div className="buy-container">
          <div className="buy-summary">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ color: "var(--text-muted)" }}>Share Price</span><span style={{ fontWeight: "600" }}>{property.sharePriceEth} ETH</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ color: "var(--text-muted)" }}>Available Shares</span><span style={{ fontWeight: "600" }}>{property.availableShares}</span></div>
          </div>
          <div className="input-group">
            <label>Enter Number of Shares</label>
            <input 
              type="number" 
              min="1" 
              max={property.availableShares} 
              value={sharesToBuy} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setSharesToBuy('');
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num)) {
                    setSharesToBuy(Math.min(property.availableShares, num));
                  }
                }
              }} 
            />
            <div className="total-cost" style={{ marginTop: '20px' }}>
              <span className="total-cost-label">Total Price</span>
              <span className="total-cost-value">{((sharesToBuy || 0) * parseFloat(property.sharePriceEth)).toFixed(3)} ETH</span>
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: "16px" }} onClick={handleBuy} disabled={buyStatus.state === "processing" || !sharesToBuy || sharesToBuy <= 0}>
              {buyStatus.state === "processing" ? "Processing..." : `Buy ${sharesToBuy || 0} Shares`}
            </button>
          </div>
          {buyStatus.state !== "idle" && <div className={`status-msg ${buyStatus.state}`}>{buyStatus.message}</div>}
        </div>
      </div>
    );
  };

  const HistoryView = () => (
    <div className="page-history">
      <h2 className="page-header">Transaction History</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Participant</th>
              <th>Property</th>
              <th>Shares</th>
              <th>Amount (ETH)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>No transactions yet.</td></tr> : (
              history.map((tx, idx) => (
                <tr key={idx}>
                  <td>{tx.date}</td>
                  <td>
                    <span className={`status-badge ${tx.type || 'buy'}`} style={{ 
                      background: tx.type === 'rent' ? 'rgba(59, 130, 246, 0.1)' : tx.type === 'claim' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                      color: tx.type === 'rent' ? '#3b82f6' : tx.type === 'claim' ? '#10b981' : '#a78bfa',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      fontWeight: 'bold'
                    }}>
                      {tx.type || 'buy'}
                    </span>
                  </td>
                  <td>{tx.buyerName || tx.investor || "Anonymous"}</td>
                  <td>{tx.type === 'rent' && localStorage.getItem("role") === "Investor" ? `Rental Income (${tx.propertyName})` : (tx.type === 'distribute' && localStorage.getItem("role") === "Investor" ? `Rental Income (${tx.propertyName})` : tx.propertyName)}</td>
                  <td>{tx.shares || "-"}</td>
                  <td style={{ 
                    fontWeight: '600',
                    color: (tx.type === 'claim' || (localStorage.getItem("role") === "Investor" && (tx.type === 'distribute' || tx.type === 'rent') && tx.buyerWallet?.toLowerCase() !== walletAddress.toLowerCase())) ? '#10b981' : '#f87171'
                  }}>
                    {(tx.type === 'claim' || (localStorage.getItem("role") === "Investor" && (tx.type === 'distribute' || tx.type === 'rent') && tx.buyerWallet?.toLowerCase() !== walletAddress.toLowerCase())) ? '+' : '-'}
                    {localStorage.getItem("role") === "Investor" && (tx.type === 'distribute' || tx.type === 'rent') && tx.buyerWallet?.toLowerCase() !== walletAddress.toLowerCase()
                      ? (() => {
                          const prop = portfolio.find(p => p.propertyId === tx.propertyId);
                          if (!prop) return "0.0000";
                          const myShare = (prop.sharesOwned / (prop.totalShares || 100)) * parseFloat(tx.amountEth);
                          return myShare.toFixed(4);
                        })()
                      : parseFloat(tx.amountEth).toFixed(4)} ETH
                  </td>
                  <td><span style={{ color: '#10b981' }}>✔ Success</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PortfolioView = () => {
    const navigate = useNavigate();
    
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'rgba(15, 23, 42, 0.9)' : '#f8fafc';
    const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
    const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

    // Memoized data for rental income analytics
    const rentalIncomeData = useMemo(() => {
      return portfolio
        .filter(p => p.sharesOwned > 0)
        .map(item => {
          const userClaims = history.filter(tx => 
            tx.propertyId === item.propertyId && 
            (tx.type === 'claim' || tx.type === 'distribute' || tx.type === 'rent') && 
            (tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase() || tx.type === 'distribute' || tx.type === 'rent')
          );
          const totalRent = userClaims.reduce((acc, tx) => {
            const amount = parseFloat(tx.amountEth || 0);
            if (tx.type === 'distribute' || tx.type === 'rent') {
              // Pro-rate the total distribution based on ownership at that time
              const ownership = (item.sharesOwned / (item.totalShares || 100));
              return acc + (amount * ownership);
            }
            return acc + amount;
          }, 0);
          const lastClaim = userClaims.length > 0 ? userClaims[0] : null;
          
          return {
            name: item.name && item.name.length > 10 ? item.name.substring(0, 10) + '…' : (item.name || 'Property'),
            fullName: item.name,
            value: parseFloat(totalRent.toFixed(4)),
            lastRent: lastClaim ? lastClaim.amountEth : "0.0000",
            ownershipPct: item.totalShares > 0 ? ((item.sharesOwned / item.totalShares) * 100).toFixed(1) : 0,
            propertyId: item.propertyId
          };
        });
    }, [portfolio, history, walletAddress]);
    return (
      <div className="page-portfolio" style={{ 
        padding: '24px', 
        maxWidth: '1400px', 
        margin: '0 auto', 
        background: bgColor, 
        minHeight: '100vh',
        color: textColor,
        fontFamily: "'Inter', sans-serif",
        transition: 'all 0.3s ease'
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .portfolio-table th { text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.5px; color: ${textMuted}; padding: 12px 16px; border-bottom: 2px solid ${borderColor}; font-weight: 700; }
          .portfolio-table td { padding: 12px 16px; border-bottom: 1px solid ${borderColor}; vertical-align: middle; }
          .portfolio-table tr:hover { background: ${hoverBg}; cursor: pointer; }
          .portfolio-table tr.selected { background: ${isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'}; border-left: 4px solid #3b82f6; }
          .light-card { background: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 16px; box-shadow: ${isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}; transition: transform 0.2s ease, box-shadow 0.2s ease; backdrop-filter: blur(10px); }
          .light-card:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}; border-radius: 10px; }

          .tx-table th { font-size: 0.6rem; color: ${textMuted}; text-transform: uppercase; padding: 8px; border-bottom: 1px solid ${borderColor}; }
          .tx-table td { font-size: 0.75rem; padding: 8px; color: ${textColor}; border-bottom: 1px solid ${borderColor}; white-space: nowrap; }
        `}</style>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800', color: isDark ? '#fff' : '#0f172a', letterSpacing: '-0.025em' }}>Portfolio Overview</h2>
            <p style={{ color: textMuted, margin: '2px 0 0', fontSize: '0.875rem' }}>Track and manage your fractional real estate investments</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button style={{ padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: textMuted, cursor: 'pointer' }} onClick={loadPortfolio} title="Refresh Data">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* ROW 1: GRAPHS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* OWNERSHIP DISTRIBUTION */}
          <div className="light-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', color: '#3b82f6' }}>
                <TrendingUp size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' }}>Property Ownership</h3>
            </div>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={portfolio.filter(p => p.sharesOwned > 0).map(p => ({
                    ...p,
                    remainingShares: Math.max(0, p.totalShares - p.sharesOwned)
                  }))} 
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textMuted, fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: textMuted, fontSize: 10 }} label={{ value: 'Tokens', angle: -90, position: 'insideLeft', offset: 15, style: { fill: textMuted, fontSize: 10, fontWeight: 600 } }} />
                  <RechartsTooltip 
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const rent = history
                          .filter(tx => tx.propertyId === d.propertyId && tx.type === 'claim' && tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase())
                          .reduce((acc, tx) => acc + parseFloat(tx.amountEth || 0), 0);
                        return (
                          <div style={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                            <p style={{ margin: '0 0 8px', fontWeight: '700', color: isDark ? '#fff' : '#1e293b', fontSize: '0.85rem' }}>{d.name}</p>
                            <div style={{ display: 'grid', gap: '4px', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: textMuted }}>Total Tokens:</span>
                                <span style={{ color: isDark ? '#e2e8f0' : '#1e293b', fontWeight: '700' }}>{d.totalShares}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: '#3b82f6' }}>Your Tokens:</span>
                                <span style={{ color: '#3b82f6', fontWeight: '700' }}>{d.sharesOwned}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: textMuted }}>Stake:</span>
                                <span style={{ color: '#10b981', fontWeight: '700' }}>{((d.sharesOwned / d.totalShares) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sharesOwned" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40} onClick={(d) => setSelectedPropertyId(d.propertyId)} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="remainingShares" stackId="a" fill={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} radius={[6, 6, 0, 0]} barSize={40} onClick={(d) => setSelectedPropertyId(d.propertyId)} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RENTAL INCOME ANALYTICS */}
          <div className="light-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fff7ed', color: '#f59e0b' }}>
                <BarChart2 size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' }}>Rental Income Analytics</h3>
            </div>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rentalIncomeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textMuted, fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: textMuted, fontSize: 10 }} />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                            <p style={{ margin: '0 0 8px', fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>{d.fullName}</p>
                            <div style={{ display: 'grid', gap: '4px', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: '#64748b' }}>Total Rent:</span>
                                <span style={{ color: '#f59e0b', fontWeight: '700' }}>{d.value} ETH</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: '#64748b' }}>Last Rent:</span>
                                <span style={{ color: '#10b981', fontWeight: '700' }}>{d.lastRent} ETH</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                                <span style={{ color: '#64748b' }}>Ownership:</span>
                                <span style={{ color: '#3b82f6', fontWeight: '700' }}>{d.ownershipPct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRent)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 2: INVESTMENT HOLDINGS */}
        <div className="light-card" style={{ overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '10px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' }}>Investment Holdings</h3>
            <span style={{ fontSize: '0.7rem', color: textMuted, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '2px 10px', borderRadius: '20px' }}>
              {portfolio.filter(p => Number(p.sharesOwned) > 0).length} Assets
            </span>
          </div>
          <div className="custom-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '250px', display: 'block' }}>
            <table className="portfolio-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: isDark ? '#1e293b' : '#ffffff' }}>
                <tr style={{ fontSize: '0.75rem', color: textMuted, borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ padding: '8px 20px' }}>Property</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Shares / Total</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Price</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Stake</th>
                  <th style={{ textAlign: 'right', padding: '8px 20px' }}>Rent</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.filter(p => Number(p.sharesOwned) > 0).length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: textMuted, fontSize: '0.85rem' }}>No investments found.</td></tr>
                ) : (
                  [...portfolio]
                    .filter(p => Number(p.sharesOwned) > 0)
                    .sort((a, b) => Number(a.propertyId) - Number(b.propertyId))
                    .map(item => {
                    const isSelected = selectedPropertyId === item.propertyId;
                    const ownershipPct = item.totalShares > 0 ? ((Number(item.sharesOwned) / item.totalShares) * 100).toFixed(1) : 0;
                    const rent = history
                      .filter(tx => tx.propertyId === item.propertyId && tx.type === 'claim' && tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase())
                      .reduce((acc, tx) => acc + parseFloat(tx.amountEth || 0), 0);
                    
                    return (
                      <tr 
                        key={item.propertyId} 
                        className={isSelected ? 'selected' : ''} 
                        onClick={() => setSelectedPropertyId(isSelected ? null : item.propertyId)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s', borderBottom: `1px solid ${borderColor}` }}
                      >
                        <td style={{ padding: '10px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={item.image} style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: isDark ? '#fff' : '#1e293b' }}>{item.name}</div>
                              <div style={{ fontSize: '0.7rem', color: textMuted }}>{item.location}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: isDark ? '#e2e8f0' : '#1e293b' }}>{item.sharesOwned} <span style={{ color: textMuted, fontWeight: '400', fontSize: '0.7rem' }}>/ {item.totalShares}</span></div>
                          <div style={{ height: '3px', width: '60px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: '2px', margin: '4px auto 0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(item.sharesOwned / item.totalShares) * 100}%`, background: '#3b82f6' }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.8rem', fontWeight: '500', padding: '10px 8px' }}>{item.sharePriceEth} ETH</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4', color: '#16a34a', fontWeight: '700', fontSize: '0.7rem' }}>
                            {ownershipPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 20px' }}>
                          <div style={{ fontWeight: '700', color: '#f59e0b', fontSize: '0.85rem' }}>{rent.toFixed(4)} ETH</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL TRANSACTION HISTORY */}
        {selectedPropertyId !== null && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              background: 'rgba(0,0,0,0.7)', 
              backdropFilter: 'blur(4px)',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              zIndex: 9999,
              padding: '20px'
            }}
            onClick={() => setSelectedPropertyId(null)}
          >
            <div 
              className="light-card" 
              style={{ 
                width: '100%', 
                maxHeight: '90vh',
                maxWidth: '720px', 
                padding: '20px', 
                animation: 'scaleIn 0.2s ease-out',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={20} color="#3b82f6" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' }}>
                    {portfolio.find(p => p.propertyId === selectedPropertyId)?.name} — History
                  </h3>
                </div>
                <button 
                  style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.2rem' }} 
                  onClick={() => setSelectedPropertyId(null)}
                >✕</button>
              </div>
              
              <div className="custom-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '450px', paddingRight: '4px', flexGrow: 1 }}>
                <table className="tx-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: isDark ? '#1e293b' : '#ffffff' }}>
                    <tr style={{ fontSize: '0.7rem', color: textMuted, borderBottom: `1px solid ${borderColor}`, textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Date</th>
                      <th style={{ padding: '10px' }}>Type</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>Shares</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Amount</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Rent</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.75rem' }}>
                    {history.filter(tx => tx.propertyId === selectedPropertyId && (tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase() || tx.type === 'distribute' || tx.type === 'rent')).length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: textMuted }}>No transactions recorded for this property.</td></tr>
                    ) : (
                      history
                        .filter(tx => tx.propertyId === selectedPropertyId && (tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase() || tx.type === 'distribute' || tx.type === 'rent'))
                        .map((tx, idx) => {
                          const isRent = tx.type === 'rent' || tx.type === 'distribute' || tx.type === 'claim';
                          const prop = portfolio.find(p => p.propertyId === selectedPropertyId);
                          const userShare = prop ? (prop.sharesOwned / prop.totalShares) : 0;
                          const displayAmount = isRent ? (parseFloat(tx.amountEth) * userShare).toFixed(4) : tx.amountEth;
                          
                          return (
                            <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}` }}>
                              <td style={{ padding: '10px' }}>{tx.date || new Date(tx.createdAt).toLocaleDateString()}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ 
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '700',
                                  background: isRent ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  color: isRent ? '#f59e0b' : '#3b82f6',
                                  border: `1px solid ${isRent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                                }}>
                                  {tx.type?.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px' }}>{tx.shares || '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: '600', padding: '10px' }}>{!isRent ? `${tx.amountEth} ETH` : '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: '700', color: '#10b981', padding: '10px' }}>{isRent ? `+${displayAmount} ETH` : '-'}</td>
                              <td style={{ textAlign: 'center', padding: '10px' }}>
                                <span style={{ color: '#10b981', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                  Success
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <Router>
      <div className="app-shell">
        {notification.show && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'var(--text-main)', padding: '16px 32px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideDown 0.4s ease-out' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Income Received!</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{notification.message}</div>
            </div>
            <button onClick={() => setNotification({ show: false, message: "" })} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', marginLeft: '12px', opacity: 0.7 }}>✕</button>
          </div>
        )}

        {location.pathname !== "/" && <Navbar />}

        {walletError && (
          <div style={{ position: 'fixed', top: '80px', right: '20px', fontSize: "0.72rem", color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", padding: "4px 10px", maxWidth: "260px", textAlign: "right", animation: "fadeIn 0.2s ease", zIndex: 1000 }}>
            ⚠️ {walletError}
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<Login onLogin={handleLoginSuccess} />} />
            
            <Route path="/properties" element={
              <ProtectedRoute allowedRoles={["Investor"]}>
                <PropertiesView />
              </ProtectedRoute>
            } />

            <Route path="/portfolio" element={
              <ProtectedRoute allowedRoles={["Investor"]}>
                <PortfolioView />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminDashboard provider={provider} />
              </ProtectedRoute>
            } />

            <Route path="/tenant" element={
              <ProtectedRoute allowedRoles={["Tenant"]}>
                <TenantDashboard provider={provider} />
              </ProtectedRoute>
            } />

            <Route path="/history" element={<ProtectedRoute allowedRoles={["Admin"]}><HistoryView /></ProtectedRoute>} />
            <Route path="/details/:id" element={<DetailsView />} />
            <Route path="/buy/:id" element={<BuyView />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      
      <button 
        onClick={toggleTheme}
        title="Toggle Theme"
        className="theme-toggle"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </Router>
  );
}

const HistoryRow = ({ tx, idx, getInvestorId }) => (
  <tr key={idx}>
    <td>{tx.date}</td>
    <td>{tx.investor}</td>
    <td>{tx.propertyName}</td>
    <td>{tx.shares}</td>
    <td>{tx.amountEth}</td>
    <td>Success</td>
  </tr>
);
