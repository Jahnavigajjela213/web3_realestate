import React, { useState, useEffect, useMemo } from "react";
import { fetchProperties, addPropertyOnChain } from "../services/contract";
import { savePropertyMetadata } from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Users, X, MapPin, ExternalLink, TrendingUp, ShieldCheck, Wallet, Sparkles } from "lucide-react";
import { aiOrchestrator } from "../services/agentOrchestrator";
import AIAgentPanel from "../components/AIAgentPanel";
import AIAssistantButton from "../components/AIAssistantButton";


const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];

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

const formatWalletShort = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getInvestorLabel = (tx) => {
  if (tx.buyerName && tx.buyerName !== "Investor") return tx.buyerName;

  const index = DEMO_ADDRESSES.findIndex(
    address => address.toLowerCase() === String(tx.buyerWallet || "").toLowerCase()
  );
  if (index !== -1) return DEMO_NAMES[index];

  return tx.buyerWallet ? `External Investor (${formatWalletShort(tx.buyerWallet)})` : "Unknown Investor";
};

// Enhanced Tooltip with investor details
const PropertyPieTooltip = ({ active, payload }) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(96, 165, 250, 0.5)',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '0.8rem'
      }}>
        <p style={{ margin: '0 0 4px 0', color: '#60a5fa', fontWeight: 'bold' }}>
          {data.name}
        </p>
        <p style={{ margin: '2px 0', color: '#34d399' }}>
          Shares: {data.value}
        </p>
        <p style={{ margin: '2px 0', color: '#fbbf24' }}>
          Ownership: {data.percentage}%
        </p>
        {data.invested && (
          <p style={{ margin: '2px 0', color: '#a78bfa' }}>
            Invested: {data.invested.toFixed(4)} ETH
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Bar Tooltip that triggers hover state
const BarTooltip = ({ active, payload, setHoveredProperty }) => {
  if (active && payload && payload[0]) {
    const propertyName = payload[0].payload.name;
    if (setHoveredProperty) {
      setHoveredProperty(propertyName);
    }
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(96, 165, 250, 0.5)',
        borderRadius: '8px',
        padding: '8px',
        fontSize: '0.75rem'
      }}>
        <p style={{ margin: '0', color: '#60a5fa', fontWeight: 'bold' }}>
          {propertyName}
        </p>
        <p style={{ margin: '2px 0', color: '#34d399' }}>
          Total: {payload[0].value}
        </p>
        {payload[1] && (
          <p style={{ margin: '2px 0', color: '#10b981' }}>
            Sold: {payload[1].value}
          </p>
        )}
      </div>
    );
  } else if (setHoveredProperty) {
    setHoveredProperty(null);
  }
  return null;
};

const AdminDashboard = ({ provider }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ 
    name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, 
    location: "", image: "", description: "" 
  });
  const [history, setHistory] = useState([]);
  const [hoveredPropertyName, setHoveredPropertyName] = useState(null);
  const [portfolioView, setPortfolioView] = useState('table'); // 'card' or 'table'
  const [selectedPieProperty, setSelectedPieProperty] = useState(null);
  const [detailProperty, setDetailProperty] = useState(null);
  const [aiInsights, setAiInsights] = useState({ insights: [], recommendations: [], notifications: [] });

  useEffect(() => {
    if (!loading && properties.length > 0) {
      aiOrchestrator.getInsights('Admin', { properties, transactions: history }).then(setAiInsights);
    }
  }, [loading, properties, history]);


  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/properties`);
      const result = await response.json();
      setProperties(result.data || []);
      
      const historyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/transactions`);
      const historyData = await historyRes.json();
      setHistory(historyData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setStatus({ type: "processing", message: "Deploying property..." });
    try {
      if (!provider) {
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
      } else {
        await addPropertyOnChain({
          provider,
          name: adminForm.name,
          symbol: adminForm.symbol,
          sharePriceEth: adminForm.sharePriceEth,
          totalShares: parseInt(adminForm.totalShares)
        });
        const updatedProps = await fetchProperties();
        const newId = updatedProps.length - 1;
        await savePropertyMetadata({
          id: newId,
          name: adminForm.name,
          location: adminForm.location,
          image: adminForm.image,
          description: adminForm.description
        });
      }
      setStatus({ type: "success", message: `Property deployed successfully!` });
      setAdminForm({ name: "", symbol: "", sharePriceEth: "0.01", totalShares: 100, location: "", image: "", description: "" });
      setShowAddForm(false);
      loadData();
      setTimeout(() => setStatus({type: "", message: ""}), 5000);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to deploy property" });
    }
  };

  // Analytics Calculations
  const analytics = useMemo(() => {
    let totalTokensCreated = 0;
    let totalTokensSold = 0;
    let totalRentCollected = 0;
    let totalEthDistributed = 0;
    let uniqueInvestors = new Set();
    let totalTenants = 0;

    properties.forEach(p => {
      totalTokensCreated += parseInt(p.totalShares || 0);
      totalTokensSold += parseInt(p.sharesSold || 0);
      if (p.tenant && p.tenant.isActive) totalTenants++;
      totalRentCollected += parseFloat(p.totalRentDistributed || 0);
    });

    history.forEach(tx => {
      if (tx.type === "buy" && tx.buyerWallet) {
        uniqueInvestors.add(tx.buyerWallet.toLowerCase());
      }
      if (tx.type === "distribute") {
        totalEthDistributed += parseFloat(tx.amountEth || 0);
      }
    });

    return {
      activeProperties: properties.length,
      totalTokensCreated,
      totalTokensSold,
      totalInvestors: uniqueInvestors.size,
      totalTenants,
      totalRentCollected: totalRentCollected.toFixed(4),
      totalEthDistributed: totalEthDistributed.toFixed(4)
    };
  }, [properties, history]);

  // Data for Charts
  const chartData = useMemo(() => {
    // 1. Property vs Tokens
    const propertyTokens = properties.map(p => ({
      name: p.name,
      Total: p.totalShares,
      Sold: p.sharesSold,
      Available: p.availableShares
    }));

    // 2. Investor Distribution (Overall Ownership % logic simplified to relative shares sold)
    const investorShareMap = {};
    history.forEach(tx => {
      if (tx.type === 'buy') {
        const investorName = getInvestorLabel(tx);
        investorShareMap[investorName] = (investorShareMap[investorName] || 0) + parseInt(tx.sharesToBuy);
      }
    });
    const investorPie = Object.entries(investorShareMap).map(([name, val]) => ({ name, value: val }));

    // 3. Activity Timeline
    const timelineMap = {};
    history.forEach(tx => {
      const d = tx.createdAt ? tx.createdAt.split('T')[0] : 'Unknown';
      if (!timelineMap[d]) timelineMap[d] = { date: d, buys: 0, claims: 0, rent: 0 };
      if (tx.type === 'buy') timelineMap[d].buys++;
      if (tx.type === 'claim') timelineMap[d].claims++;
      if (tx.type === 'rent' || tx.type === 'distribute') timelineMap[d].rent++;
    });
    const activityTimeline = Object.values(timelineMap).sort((a,b) => new Date(a.date) - new Date(b.date));

    // 4. Rent Collection Graph
    const rentMap = {};
    history.forEach(tx => {
      if (tx.type === 'distribute' || tx.type === 'rent') {
        const month = tx.createdAt ? tx.createdAt.substring(0,7) : 'Current';
        rentMap[month] = (rentMap[month] || 0) + parseFloat(tx.amountEth);
      }
    });
    const rentTimeline = Object.entries(rentMap).map(([month, val]) => ({ month, ETH: val })).sort((a,b) => a.month.localeCompare(b.month));

    return { propertyTokens, investorPie, activityTimeline, rentTimeline };
  }, [properties, history]);

  // Property Details
  const getPropertyInvestors = (propId) => {
    const invMap = {};
    const property = properties.find(p => Number(p.id) === Number(propId));
    const sharePriceEth = Number(property?.sharePriceEth || 0);

    history.forEach(tx => {
      // Robust matching: by ID or by Name if ID is -1/1000
      const idMatch = Number(tx.propertyId) === Number(propId);
      const nameMatch = tx.propertyName && property?.name && tx.propertyName.toLowerCase() === property.name.toLowerCase();

      if ((idMatch || nameMatch) && tx.type === 'buy') {
        const investorName = getInvestorLabel(tx);
        const shares = Number(tx.sharesToBuy || 0);
        const invested = sharePriceEth > 0 ? shares * sharePriceEth : Number(tx.amountEth || 0);

        if (!invMap[investorName]) invMap[investorName] = { shares: 0, invested: 0 };
        invMap[investorName].shares += shares;
        invMap[investorName].invested += invested;
      }
    });
    return Object.entries(invMap).map(([name, data]) => ({ name, ...data }));
  };

  // Get hovered property for dynamic pie chart
  const getHoveredPropertyData = () => {
    if (!hoveredPropertyName) return null;
    const property = properties.find(p => p.name === hoveredPropertyName);
    if (!property) return null;
    
    const investors = getPropertyInvestors(property.id);
    return {
      property,
      investors: investors.map(inv => ({
        name: inv.name,
        value: inv.shares,
        percentage: ((inv.shares / property.totalShares) * 100).toFixed(1),
        invested: inv.invested
      }))
    };
  };

  // Handle bar hover to show property details dynamically
  const handleBarHover = (state) => {
    if (state && state.activeTooltipIndex !== undefined && chartData.propertyTokens[state.activeTooltipIndex]) {
      const propertyName = chartData.propertyTokens[state.activeTooltipIndex].name;
      setHoveredPropertyName(propertyName);
    }
  };

  const handleBarLeave = () => {
    setHoveredPropertyName(null);
  };

  // Custom event handler for bar shapes
  const handleBarMouseEnter = (data) => {
    if (data && data.name) {
      setHoveredPropertyName(data.name);
    }
  };

  // Handle bar click to show property investor pie chart
  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const propertyName = data.activePayload[0].payload.name;
      const property = properties.find(p => p.name === propertyName);
      if (property) {
        setSelectedPieProperty(property);
      }
    }
  };

  return (
    <div className="app-shell" style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .admin-investor-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .admin-investor-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); borderRadius: 10px; }
        .admin-investor-scroll::-webkit-scrollbar-thumb { background: rgba(96, 165, 250, 0.2); borderRadius: 10px; }
        .admin-investor-scroll::-webkit-scrollbar-thumb:hover { background: rgba(96, 165, 250, 0.4); }
        .admin-scroll-box {
          overflow-y: scroll;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(96, 165, 250, 0.55) transparent;
        }
        .admin-highlight-panel {
          background: linear-gradient(135deg, rgba(96,165,250,0.16), rgba(52,211,153,0.08));
          border: 2px solid rgba(96,165,250,0.45);
          box-shadow: 0 12px 28px rgba(96,165,250,0.12);
        }
      `}</style>
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Admin Dashboard</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "+ Add Property"}
        </button>
      </div>

      {status.message && (
        <div className={`status-msg ${status.type}`} style={{ marginBottom: '16px' }}>
          {status.message}
        </div>
      )}

      {showAddForm && (
        <div className="card glass" style={{ padding: '20px', marginBottom: '20px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Register New Property</h3>
          <form onSubmit={handleAddProperty} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group"><label>Property Name</label><input type="text" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required /></div>
            <div className="input-group"><label>Token Symbol</label><input type="text" value={adminForm.symbol} onChange={e => setAdminForm({...adminForm, symbol: e.target.value})} required /></div>
            <div className="input-group"><label>Share Price (ETH)</label><input type="number" step="0.001" value={adminForm.sharePriceEth} onChange={e => setAdminForm({...adminForm, sharePriceEth: e.target.value})} required /></div>
            <div className="input-group"><label>Total Shares</label><input type="number" value={adminForm.totalShares} onChange={e => setAdminForm({...adminForm, totalShares: e.target.value})} required /></div>
            <div className="input-group"><label>Location</label><input type="text" value={adminForm.location} onChange={e => setAdminForm({...adminForm, location: e.target.value})} required /></div>
            <div className="input-group"><label>Image URL</label><input type="text" value={adminForm.image} onChange={e => setAdminForm({...adminForm, image: e.target.value})} required /></div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea style={{ width: '100%', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--input-color)', minHeight: '100px' }} value={adminForm.description} onChange={e => setAdminForm({...adminForm, description: e.target.value})} required />
            </div>
            <button className="btn-primary" style={{ gridColumn: 'span 2', padding: '12px' }} type="submit">Deploy Property</button>
          </form>
        </div>
      )}

      {/* AI AGENT INSIGHTS */}
      <AIAgentPanel 
        title="Admin AI Strategist" 
        data={aiInsights} 
        icon={<Sparkles size={20} color="#f59e0b" />} 
      />

      {/* ROW 1: SIDE BY SIDE CHARTS */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', minHeight: '280px' }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Property Token Distribution</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.propertyTokens} onClick={handleBarClick} onMouseMove={handleBarHover} onMouseLeave={handleBarLeave}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fontSize: 9}} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="var(--text-muted)" tick={{fontSize: 10}} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#f8fafc' }} />
              <Bar dataKey="Total" fill="#3b82f6" radius={[2,2,0,0]} cursor="pointer" onMouseEnter={handleBarMouseEnter} onMouseLeave={handleBarLeave} onClick={(data) => { if (data && data.name) { const prop = properties.find(p => p.name === data.name); if (prop) setSelectedPieProperty(prop); } }} />
              <Bar dataKey="Sold" fill="#10b981" radius={[2,2,0,0]} cursor="pointer" onMouseEnter={handleBarMouseEnter} onMouseLeave={handleBarLeave} onClick={(data) => { if (data && data.name) { const prop = properties.find(p => p.name === data.name); if (prop) setSelectedPieProperty(prop); } }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '16px', minHeight: '280px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>
              {selectedPieProperty ? `${selectedPieProperty.name}` : 'Property Investors'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selectedPieProperty && (
                <button
                  onClick={() => setSelectedPieProperty(null)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(248, 113, 113, 0.15)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(248, 113, 113, 0.25)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(248, 113, 113, 0.15)'; }}
                >
                  ✕ Clear
                </button>
              )}
              <select 
                style={{ 
                  padding: '5px 8px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(96, 165, 250, 0.25)', 
                  borderRadius: '6px', 
                  color: 'var(--text-main)', 
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                value={selectedPieProperty ? selectedPieProperty.name : ""}
                onChange={(e) => {
                  const propName = e.target.value;
                  if (propName) {
                    const prop = properties.find(p => p.name === propName);
                    setSelectedPieProperty(prop);
                  } else {
                    setSelectedPieProperty(null);
                  }
                }}
              >
                <option value="">Select Property</option>
                {properties.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content: either prompt or property analytics */}
          {!selectedPieProperty ? (
            /* Empty state — prompt to select */
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              padding: '20px',
              opacity: 0.7
            }}>
              <div style={{ 
                width: '48px', height: '48px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(96,165,250,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M9 12h6" /><path d="M12 9v6" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Select a Property</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: '1.4' }}>
                  Click a bar in the chart or use the<br/>dropdown to view investor breakdown
                </div>
              </div>
            </div>
          ) : (
            /* Property analytics content */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Stats banner */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '6px', 
                marginBottom: '10px'
              }}>
                {[
                  { label: 'Total Shares', value: selectedPieProperty.totalShares, color: '#60a5fa' },
                  { label: 'Sold', value: selectedPieProperty.sharesSold, color: '#10b981' },
                  { label: 'Investors', value: getPropertyInvestors(selectedPieProperty.id).length, color: '#fb923c' }
                ].map((stat, i) => (
                  <div key={i} style={{ 
                    textAlign: 'center', 
                    padding: '6px 4px',
                    background: `${stat.color}10`,
                    borderRadius: '6px',
                    border: `1px solid ${stat.color}20`
                  }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>{stat.label}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Donut + Investor list side by side */}
              <div style={{ display: 'flex', gap: '8px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Donut chart */}
                <div style={{ width: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie 
                        data={getPropertyInvestors(selectedPieProperty.id).map(inv => ({
                          name: inv.name,
                          value: inv.shares,
                          percentage: ((inv.shares / selectedPieProperty.totalShares) * 100).toFixed(1),
                          invested: inv.invested
                        }))} 
                        cx="50%" cy="50%" 
                        innerRadius={32} outerRadius={58} 
                        paddingAngle={2} 
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={400}
                        startAngle={90} endAngle={-270}
                      >
                        {getPropertyInvestors(selectedPieProperty.id).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<PropertyPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Scrollable investor list */}
                <div style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  maxHeight: 'clamp(150px, 24vh, 230px)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  paddingRight: '4px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(96,165,250,0.3) transparent'
                }}
                  className="admin-investor-scroll admin-scroll-box"
                >
                  {getPropertyInvestors(selectedPieProperty.id).map((inv, idx) => {
                    const pct = ((inv.shares / selectedPieProperty.totalShares) * 100).toFixed(1);
                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${COLORS[idx % COLORS.length]}`,
                        transition: 'background 0.2s ease',
                        cursor: 'default',
                        flexShrink: 0
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        {/* Color dot */}
                        <div style={{ 
                          width: '6px', height: '6px', 
                          borderRadius: '50%', 
                          background: COLORS[idx % COLORS.length],
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${COLORS[idx % COLORS.length]}40`
                        }} />
                        {/* Name */}
                        <span style={{ 
                          flex: 1, 
                          color: 'var(--text-main)', 
                          fontWeight: '500', 
                          fontSize: '0.72rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>{inv.name}</span>
                        {/* Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0 }}>
                          <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.72rem' }}>{inv.shares} shares</span>
                          <span style={{ color: '#fbbf24', fontSize: '0.6rem', fontWeight: '500' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {getPropertyInvestors(selectedPieProperty.id).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      No investors yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: PROPERTY-CENTRIC PORTFOLIO */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#34d399" />
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: '600' }}>Property Portfolio</h4>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setPortfolioView('card')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: portfolioView === 'card' ? 'linear-gradient(135deg, #60a5fa, #3b82f6)' : 'transparent',
                color: portfolioView === 'card' ? 'white' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Card View
            </button>
            <button
              onClick={() => setPortfolioView('table')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: portfolioView === 'table' ? 'linear-gradient(135deg, #60a5fa, #3b82f6)' : 'transparent',
                color: portfolioView === 'table' ? 'white' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Table View
            </button>
          </div>
        </div>

        {portfolioView === 'card' ? (
          <div className="grid admin-investor-scroll admin-scroll-box" style={{ 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '16px', 
            maxHeight: 'clamp(360px, 62vh, 560px)', 
            padding: '4px'
          }}>
            {[...properties].sort((a, b) => Number(a.id) - Number(b.id)).map(p => (
              <div key={p.id}
                className="card admin-card-hover"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)'
                }}
                onClick={() => setDetailProperty(p)}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                  {p.image && (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  )}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {((p.sharesSold / p.totalShares) * 100).toFixed(0)}% Sold
                  </div>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>{p.name}</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <MapPin size={12} /> {p.location}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Tokens</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#60a5fa' }}>{p.sharesSold}/{p.totalShares}</div>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Token Price</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24' }}>{parseFloat(p.sharePriceEth).toFixed(4)}</div>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Investors</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fb923c' }}>{getPropertyInvestors(p.id).length}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-container admin-investor-scroll admin-scroll-box" style={{ maxHeight: 'clamp(260px, 45vh, 420px)', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <table style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(96, 165, 250, 0.12))', zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <tr>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid rgba(96, 165, 250, 0.3)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'left' }}>Property</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid rgba(96, 165, 250, 0.3)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'center' }}>Total Tokens</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid rgba(96, 165, 250, 0.3)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'center' }}>Tokens Sold</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid rgba(96, 165, 250, 0.3)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'center' }}>Token Price (ETH)</th>
                  <th style={{ padding: '12px 8px', borderBottom: '1px solid rgba(96, 165, 250, 0.3)', color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem', textAlign: 'center' }}>Investors</th>
                </tr>
              </thead>
              <tbody>
                {[...properties].sort((a, b) => Number(a.id) - Number(b.id)).map(p => (
                  <tr key={p.id} style={{ 
                    cursor: 'pointer', 
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.2s ease'
                  }}
                    onClick={() => setDetailProperty(p)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 12px', color: 'var(--text-main)', fontWeight: '600' }}>{p.name}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', color: '#60a5fa', fontWeight: '700' }}>{p.totalShares}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', color: '#34d399', fontWeight: '700' }}>{p.sharesSold}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', color: '#fbbf24', fontWeight: '700' }}>{parseFloat(p.sharePriceEth).toFixed(4)}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', color: '#fb923c', fontWeight: '700' }}>{getPropertyInvestors(p.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROPERTY DETAILS MODAL */}
      {detailProperty && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.3s ease'
        }} onClick={() => setDetailProperty(null)}>
          <div style={{
            width: '90%', maxWidth: '800px', maxHeight: 'calc(100vh - 32px)',
            background: 'var(--bg-card)',
            borderRadius: '24px', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            position: 'relative', animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              onClick={() => setDetailProperty(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'var(--panel-bg)', border: '1px solid var(--border)',
                borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-main)', cursor: 'pointer', zIndex: 10
              }}
            >
              <X size={20} />
            </button>

            <div className="admin-investor-scroll admin-scroll-box" style={{ flex: 1, minHeight: 0, padding: '24px' }}>
              <div style={{ display: 'flex', gap: '18px', marginBottom: '18px', alignItems: 'center' }}>
                <img src={detailProperty.image} style={{ width: '220px', height: '135px', objectFit: 'cover', borderRadius: '14px' }} alt="" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <ShieldCheck size={14} color="#34d399" />
                    <span style={{ color: '#34d399', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Verified Asset</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.55rem', fontWeight: '800', color: 'var(--text-main)' }}>{detailProperty.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <MapPin size={14} />
                    <span style={{ fontSize: '0.82rem' }}>{detailProperty.location}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    {detailProperty.description || "High-yield real estate asset tokenized on the blockchain for fractional ownership and transparent rent distribution."}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                {[
                  { label: 'Total Tokens', value: detailProperty.totalShares, icon: <TrendingUp size={16} />, color: '#60a5fa' },
                  { label: 'Sold Tokens', value: detailProperty.sharesSold, icon: <TrendingUp size={16} />, color: '#34d399' },
                  { label: 'Token Price', value: `${detailProperty.sharePriceEth} ETH`, icon: <Wallet size={16} />, color: '#fbbf24' },
                  { label: 'Occupancy', value: `${((detailProperty.sharesSold / detailProperty.totalShares) * 100).toFixed(1)}%`, icon: <Users size={16} />, color: '#a78bfa' }
                ].map((stat, i) => (
                  <div key={i} style={{ 
                    background: 'var(--panel-bg)', padding: '12px', borderRadius: '14px',
                    border: '1px solid var(--border)', textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {stat.icon} {stat.label}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Investor List */}
              <div className="admin-highlight-panel" style={{ borderRadius: '20px', padding: '18px', maxHeight: 'clamp(220px, 40vh, 360px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.22)' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>Asset Holders</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getPropertyInvestors(detailProperty.id).length} total investors</span>
                </div>
                
                <div style={{ maxHeight: 'clamp(140px, 26vh, 240px)', minHeight: 0 }} className="admin-investor-scroll admin-scroll-box">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Investor</th>
                        <th style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Shares</th>
                        <th style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Ownership</th>
                        <th style={{ textAlign: 'right', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Invested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPropertyInvestors(detailProperty.id).map((inv, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px 0', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '500' }}>{inv.name}</td>
                          <td style={{ padding: '14px 0', textAlign: 'center', color: '#60a5fa', fontSize: '0.85rem', fontWeight: '700' }}>{inv.shares}</td>
                          <td style={{ padding: '14px 0', textAlign: 'center' }}>
                            <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {((inv.shares / detailProperty.totalShares) * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 0', textAlign: 'right', color: '#fbbf24', fontSize: '0.85rem', fontWeight: '600' }}>{inv.invested.toFixed(3)} ETH</td>
                        </tr>
                      ))}
                      {getPropertyInvestors(detailProperty.id).length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No active investments for this property
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING AI ASSISTANT */}
      <AIAssistantButton role="Admin" contextData={{ properties, transactions: history }} />
    </div>
  );
};


export default AdminDashboard;
