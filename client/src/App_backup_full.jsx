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
import { Wallet, PieChart as PieChartIcon, Home, DollarSign, TrendingUp, Calendar } from "lucide-react";

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedInvestorName, setSelectedInvestorName] = useState("");
  const [provider, setProvider] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [history, setHistory] = useState([]);
  const [ethInr, setEthInr] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [pendingRent, setPendingRent] = useState("0.0");
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [sharesToBuy, setSharesToBuy] = useState("");
  const [buyStatus, setBuyStatus] = useState({ state: "idle", message: "" });
  
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
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
  ];

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        const provider = new BrowserProvider(window.ethereum);
        setProvider(provider);
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setProvider(null);
  };

  const loadProperties = async () => {
    try {
      const data = await fetchProperties();
      setProperties(data);
    } catch (err) {
      console.error("Failed to load properties:", err);
      setLoadError("Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchProperties();
      const txs = [];
      let txId = 1;
      
      data.forEach((prop, idx) => {
        const investorCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < investorCount; i++) {
          const investorName = DEMO_NAMES[(idx * investorCount + i) % DEMO_NAMES.length];
          const sharesToBuy = Math.floor(Math.random() * 50) + 10;
          const amountEth = (sharesToBuy * parseFloat(prop.sharePriceEth || 0.1)).toFixed(4);
          
          txs.push({
            id: txId++,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            type: "buy",
            buyerName: investorName,
            buyerWallet: DEMO_ADDRESSES[(idx * investorCount + i) % DEMO_ADDRESSES.length],
            propertyName: prop.name,
            propertyId: prop.id,
            sharesToBuy,
            amountEth,
            status: "Success"
          });
        }
        
        if (Math.random() > 0.3) {
          const rentAmount = (Math.random() * 0.5 + 0.1).toFixed(4);
          txs.push({
            id: txId++,
            date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            type: "distribute",
            propertyName: prop.name,
            propertyId: prop.id,
            amountEth: rentAmount,
            status: "Success"
          });
        }
      });
      
      setHistory(txs);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const loadPortfolio = async () => {
    if (!walletAddress) return;
    setLoadingPortfolio(true);
    try {
      const data = await fetchUserPortfolio(walletAddress);
      setPortfolio(data);
    } catch (err) {
      console.error("Failed to load portfolio:", err);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    const mockEthPrice = 150000;
    setEthInr(mockEthPrice);
  }, []);

  useEffect(() => {
    loadProperties();
    loadHistory();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      loadPortfolio();
    }
  }, [walletAddress]);

  const handleBuy = async (propertyId, sharesToBuy, amountEth) => {
    if (!provider) {
      alert("Please connect your wallet first!");
      return;
    }
    try {
      await buySharesOnChain(provider, propertyId, sharesToBuy, amountEth);
      await loadPortfolio();
      await loadHistory();
      
      setNotification({
        show: true,
        message: `Successfully purchased ${sharesToBuy} shares for ${amountEth} ETH!`
      });
      
      setTimeout(() => setNotification({ show: false, message: "" }), 5000);
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Transaction failed. Please try again.");
    }
  };

  const handleClaimRent = async () => {
    if (!provider) {
      alert("Please connect your wallet first!");
      return;
    }
    try {
      const amount = parseFloat(pendingRent);
      if (amount <= 0) {
        alert("No rent to claim!");
        return;
      }
      
      await claimRentOnChain(provider, amount);
      setPendingRent("0.0");
      await loadPortfolio();
      await loadHistory();
      
      setNotification({
        show: true,
        message: `Successfully claimed ${amount.toFixed(4)} ETH in rent!`
      });
      
      setTimeout(() => setNotification({ show: false, message: "" }), 5000);
    } catch (err) {
      console.error("Claim failed:", err);
      alert("Transaction failed. Please try again.");
    }
  };

  const handleLoginSuccess = (walletAddress, role) => {
    setWalletAddress(walletAddress);
  };

  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const PropertiesView = () => {
    const navigate = useNavigate();
    
    return (
      <div className="page-properties">
        <div className="page-header">
          <h2>Properties</h2>
        </div>
        <div className="properties-grid">
          {properties.map((property, idx) => (
            <div key={idx} className="property-card" onClick={() => navigate(`/details/${property.id}`)}>
              <div className="property-image">
                <img src={property.image} alt={property.name} />
              </div>
              <div className="property-info">
                <h3>{property.name}</h3>
                <div className="card-location">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s13 9 13 9-9 13-9 13-9-9-13-9z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {property.location}
                </div>
                <div className="property-stats">
                  <div className="property-stat">
                    <div className="label">Share Price</div>
                    <div className="value">{property.sharePriceEth} ETH</div>
                  </div>
                  <div className="property-stat">
                    <div className="label">Available Shares</div>
                    <div className="value">{property.availableShares}</div>
                  </div>
                  <div className="property-stat">
                    <div className="label">Total Shares</div>
                    <div className="value">{property.totalShares}</div>
                  </div>
                </div>
                <div className="property-description">
                  <p>{property.description}</p>
                </div>
                <div className="card-actions">
                  <button className="btn-primary">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DetailsView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedProperty, setSelectedProperty] = useState(null);

    useEffect(() => {
      const property = properties.find(p => p.id === parseInt(id));
      setSelectedProperty(property);
    }, [id, properties]);

    if (!selectedProperty) return <div style={{ textAlign: 'center', padding: '50px' }}>Property not found.</div>;

    return (
      <div className="page-details">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate("/properties")}>← Back</button>
          <h2>Property Details</h2>
        </div>
        <div className="details-container">
          <div className="details-image"><img src={selectedProperty.image} alt={selectedProperty.name} /></div>
          <div className="details-info">
            <h2>{selectedProperty.name}</h2>
            <div className="card-location" style={{ fontSize: "1.1rem", marginBottom: "24px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s13 9 13 9-9 13-9 13-9-9-13-9z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {selectedProperty.location}
            </div>
            <div className="details-stats">
              <div className="details-stat-box"><div className="label">Share Price</div><div className="value">{selectedProperty.sharePriceEth} ETH</div></div>
              <div className="details-stat-box"><div className="label">Total Shares</div><div className="value">{selectedProperty.totalShares}</div></div>
              <div className="details-stat-box"><div className="label">Shares Sold</div><div className="value">{selectedProperty.sharesSold}</div></div>
              <div className="details-stat-box"><div className="label">Available Shares</div><div className="value">{selectedProperty.availableShares}</div></div>
            </div>
            <button className="btn-primary" style={{ padding: "16px", fontSize: "1.1rem", marginTop: "auto" }} disabled={selectedProperty.availableShares === 0} onClick={() => navigate(`/buy/${selectedProperty.id}`)}>
              {selectedProperty.availableShares === 0 ? "Sold Out" : "Buy Shares Now"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const BuyView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedProperty, setSelectedProperty] = useState(null);

    useEffect(() => {
      const property = properties.find(p => p.id === parseInt(id));
      setSelectedProperty(property);
    }, [id, properties]);

    if (!selectedProperty) return <div style={{ textAlign: 'center', padding: '50px' }}>Property not found.</div>;

    return (
      <div className="page-buy">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(`/details/${id}`)}>← Back</button>
          <h2>Buy Shares — {selectedProperty.name}</h2>
        </div>
        <div className="buy-container">
          <div className="buy-summary">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ color: "var(--text-muted)" }}>Share Price</span><span style={{ fontWeight: "600" }}>{selectedProperty.sharePriceEth} ETH</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ color: "var(--text-muted)" }}>Available Shares</span><span style={{ fontWeight: "600" }}>{selectedProperty.availableShares}</span></div>
          </div>
          <div className="input-group">
            <label>Enter Number of Shares</label>
            <input 
              type="number" 
              min="1" 
              max={selectedProperty.availableShares} 
              value={sharesToBuy} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setSharesToBuy('');
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num)) {
                    setSharesToBuy(Math.min(selectedProperty.availableShares, num));
                  }
                }
              }} 
            />
            <div className="total-cost" style={{ marginTop: '20px' }}>
              <span className="total-cost-label">Total Price</span>
              <span className="total-cost-value">{((sharesToBuy || 0) * parseFloat(selectedProperty.sharePriceEth)).toFixed(3)} ETH</span>
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
                  <td>{tx.propertyName}</td>
                  <td>{tx.shares || "-"}</td>
                  <td style={{ 
                    fontWeight: '600',
                    color: tx.type === 'claim' ? '#10b981' : '#f87171'
                  }}>
                    {tx.type === 'claim' ? '+' : '-'}{parseFloat(tx.amountEth).toFixed(4)} ETH
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
    
    const totalInvestment = portfolio.reduce((acc, item) => acc + ((item.sharesOwned || 0) * parseFloat(item.sharePriceEth || 0)), 0);
    const totalSharesOwned = portfolio.reduce((acc, item) => acc + (item.sharesOwned || 0), 0);
    const totalRentEarned = history
      .filter(tx => tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase() && tx.type === 'claim')
      .reduce((acc, tx) => acc + parseFloat(tx.amountEth || 0), 0);
    
    const portfolioGrowthData = useMemo(() => {
      const monthlyData = {};
      history.forEach(tx => {
        if (tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase() && tx.type === 'buy') {
          const month = tx.createdAt ? tx.createdAt.substring(0, 7) : new Date().toISOString().substring(0, 7);
          if (!monthlyData[month]) monthlyData[month] = { month, value: 0 };
          monthlyData[month].value += parseFloat(tx.amountEth || 0);
        }
      });
      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }, [history, walletAddress]);
    
    const propertyOwnershipData = useMemo(() => {
      return portfolio.map(item => ({
        name: item.name,
        value: parseInt(item.sharesOwned || 0),
        percentage: ((item.sharesOwned || 0) / parseInt(item.totalShares || 1) * 100).toFixed(1)
      }));
    }, [portfolio]);

    return (
      <div className="page-portfolio" style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Investor Portfolio</h2>
          <button className="btn-secondary" onClick={loadPortfolio} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Refresh</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '16px', border: '1px solid rgba(96, 165, 250, 0.3)', background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(0, 0, 0, 0.2))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <DollarSign size={18} color="#60a5fa" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>Total Investment</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalInvestment.toFixed(3)} ETH</div>
          </div>
          <div className="card" style={{ padding: '16px', border: '1px solid rgba(167, 139, 250, 0.3)', background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(0, 0, 0, 0.2))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <PieChartIcon size={18} color="#a78bfa" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>Portfolio Value</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalInvestment.toFixed(3)} ETH</div>
          </div>
          <div className="card" style={{ padding: '16px', border: '1px solid rgba(52, 211, 153, 0.3)', background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(0, 0, 0, 0.2))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Home size={18} color="#34d399" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>Shares Owned</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalSharesOwned}</div>
          </div>
          <div className="card" style={{ padding: '16px', border: '1px solid rgba(251, 146, 60, 0.3)', background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(0, 0, 0, 0.2))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={18} color="#fb923c" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>Rent Earned</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalRentEarned.toFixed(4)} ETH</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '16px', height: '240px', minHeight: '240px', overflow: 'hidden' }}>
            <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Property Investment Values</h4>
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portfolio && portfolio.length > 0 ? portfolio.map(item => ({
                  name: item.name,
                  value: (item.sharesOwned || 0) * parseFloat(item.sharePriceEth || 0)
                })) : [
                  { name: 'Sample Property', value: 1.5 },
                  { name: 'Sample Property 2', value: 2.8 },
                  { name: 'Sample Property 3', value: 0.9 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 9}} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '0.8rem' }} />
                  <Bar dataKey="value" fill="#60a5fa" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', height: '240px', minHeight: '240px', overflow: 'hidden' }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Property Ownership</h4>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={propertyOwnershipData && propertyOwnershipData.length > 0 ? propertyOwnershipData : [
                  { name: 'Sample Property 1', value: 60 },
                  { name: 'Sample Property 2', value: 40 },
                  { name: 'Sample Property 3', value: 20 }
                ]} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
                  {(propertyOwnershipData && propertyOwnershipData.length > 0 ? propertyOwnershipData : [
                    { name: 'Sample Property 1', value: 60 },
                    { name: 'Sample Property 2', value: 40 },
                    { name: 'Sample Property 3', value: 20 }
                  ]).map((entry, index) => <Cell key={`cell-${index}`} fill={['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'][index % 6]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Property Investments & Ownership</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {portfolio.map(item => {
              const ownershipPct = item.totalShares > 0 ? ((item.sharesOwned / item.totalShares) * 100).toFixed(1) : 0;
              const rentEarned = history
                .filter(tx => tx.propertyId === item.propertyId && tx.type === 'claim' && tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase())
                .reduce((acc, tx) => acc + parseFloat(tx.amountEth || 0), 0);
              
              return (
                <div key={item.propertyId} className="card" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <img src={item.image} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                    <div>
                      <h5 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 'bold' }}>{item.name}</h5>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sharesOwned} shares</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Ownership</div>
                      <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>{ownershipPct}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Value</div>
                      <div style={{ fontWeight: 'bold' }}>{((item.sharesOwned || 0) * parseFloat(item.sharePriceEth || 0)).toFixed(3)} ETH</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Share Price</div>
                      <div style={{ fontWeight: 'bold' }}>{item.sharePriceEth} ETH</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Rent Earned</div>
                      <div style={{ fontWeight: 'bold', color: '#10b981' }}>{rentEarned.toFixed(4)} ETH</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Transaction History</h4>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Claimable: </span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pendingRent} ETH</span>
              </div>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10b981' }} onClick={handleClaimRent} disabled={parseFloat(pendingRent) === 0}>Claim Rent</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Date</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Type</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Property</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Shares</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Amount</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const userTxs = history.filter(tx => {
                    if (tx.buyerWallet?.toLowerCase() === walletAddress.toLowerCase()) return true;
                    if ((tx.type === 'rent' || tx.type === 'distribute')) {
                      return portfolio.some(p => p.propertyId === tx.propertyId);
                    }
                    return false;
                  }).slice(0, 10);

                  if (userTxs.length === 0) return (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No transactions yet</td></tr>
                  );

                  return userTxs.map((tx, idx) => {
                    let displayAmount = tx.amountEth;
                    let displayType = tx.type === 'rent' || tx.type === 'distribute' ? 'yield' : tx.type;
                    
                    if (tx.type === 'rent' || tx.type === 'distribute') {
                      const owned = portfolio.find(p => p.propertyId === tx.propertyId);
                      const prop = properties.find(p => p.id === tx.propertyId);
                      if (owned && prop) {
                        displayAmount = ((owned.sharesOwned / prop.totalShares) * parseFloat(tx.amountEth)).toFixed(4);
                      }
                    } else {
                      displayAmount = parseFloat(displayAmount || 0).toFixed(4);
                    }

                    const isIncome = displayType === 'yield' || displayType === 'claim';

                    return (
                      <tr key={idx}>
                        <td style={{ padding: '6px 8px' }}>{tx.date || new Date().toLocaleDateString()}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ 
                            background: isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            color: isIncome ? '#10b981' : '#a78bfa',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold'
                          }}>
                            {displayType || 'buy'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>{tx.propertyName}</td>
                        <td style={{ padding: '6px 8px' }}>{tx.shares || "-"}</td>
                        <td style={{ 
                          padding: '6px 8px',
                          fontWeight: '600',
                          color: isIncome ? '#10b981' : '#f87171' 
                        }}>
                          {isIncome ? '+' : '-'}{displayAmount} ETH
                        </td>
                        <td style={{ padding: '6px 8px' }}><span style={{ color: '#10b981', fontSize: '0.7rem' }}>✔ Success</span></td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

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
