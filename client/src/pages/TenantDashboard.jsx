import React, { useState, useEffect, useMemo } from "react";
import { fetchProperties, payRentOnChain } from "../services/contract";
import { AlertCircle, CheckCircle, Clock, Calendar, DollarSign, Home, TrendingUp, LayoutGrid, List } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

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

const TenantDashboard = ({ provider }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [history, setHistory] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [viewType, setViewType] = useState("grid"); // "grid" or "table"
  
  const walletAddress = localStorage.getItem("walletAddress") || "";
  
  const getTenantName = (address) => {
    const index = DEMO_ADDRESSES.findIndex(a => a.toLowerCase() === address.toLowerCase());
    return index !== -1 ? DEMO_NAMES[index] : "Unknown Tenant";
  };

  const tenantName = getTenantName(walletAddress);

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
  }, [tenantName]);

  const handlePayRent = async (p) => {
    setStatus({ type: "processing", message: `Processing rent payment for ${p.name}...` });
    try {
      let txHash = `0x-rent-${Date.now()}`;
      const rentAmount = p.sharePriceEth; 

      if (provider) {
        const result = await payRentOnChain({
          provider,
          propertyId: p.id,
          rentEth: rentAmount
        });
        txHash = result.txHash;
      }

      await fetch(`${import.meta.env.VITE_API_BASE_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: p.id,
          propertyName: p.name,
          sharesToBuy: 0,
          amountEth: rentAmount,
          buyerWallet: localStorage.getItem("walletAddress"),
          buyerName: tenantName,
          txHash: txHash,
          isMock: !provider,
          type: "rent"
        })
      });
      
      await loadData();
      
      setStatus({ type: "success", message: `✅ Rent for ${p.name} paid successfully!` });
      setTimeout(() => setStatus({ type: "", message: "" }), 5000);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "Payment failed" });
    }
  };

  const getRentStatusInfo = (p) => {
    const recentPayments = history.filter(tx => 
      tx.type === "rent" && 
      parseInt(tx.propertyId) === p.id &&
      String(tx.buyerWallet).toLowerCase() === walletAddress.toLowerCase()
    );

    recentPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastPayment = recentPayments[0];

    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (lastPayment) {
        const lastPaidDate = new Date(lastPayment.createdAt);
        const nextDueDate = new Date(lastPaidDate.getTime() + thirtyDaysInMs);
        const daysRemaining = Math.ceil((nextDueDate.getTime() - now) / (1000 * 60 * 60 * 24));
        
        let statusCode = "Pending";
        if (daysRemaining > 5) statusCode = "Paid";
        else if (daysRemaining <= 5 && daysRemaining >= 0) statusCode = "Pending";
        else statusCode = "Overdue";

        return {
            status: statusCode,
            lastPaid: lastPaidDate.toLocaleDateString('en-GB').replace(/\//g, "-"),
            nextDue: nextDueDate.toLocaleDateString('en-GB').replace(/\//g, "-"),
            daysRemaining
        };
    }

    return {
        status: "Overdue",
        lastPaid: "Not Paid",
        nextDue: new Date().toLocaleDateString('en-GB').replace(/\//g, "-"),
        daysRemaining: -1
    };
  };

  // Generate Alerts based on rent info
  const alerts = useMemo(() => {
    let result = [];
    if (status.type === "success") {
      result.push({ id: 'status-success', type: 'success', icon: <CheckCircle color="#10b981"/>, msg: status.message });
    }
    
    properties.forEach(p => {
      const info = getRentStatusInfo(p);
      if (info.status === "Pending") {
        result.push({ id: `pending-${p.id}`, type: 'warning', icon: <Clock color="#f59e0b"/>, msg: `Rent for ${p.name} is due in ${info.daysRemaining} days.` });
      } else if (info.status === "Overdue") {
        result.push({ id: `overdue-${p.id}`, type: 'error', icon: <AlertCircle color="#f87171"/>, msg: `Rent payment for ${p.name} is OVERDUE!` });
      }
    });
    return result.filter(a => !dismissedAlerts.has(a.id));
  }, [properties, history, status, dismissedAlerts]);

  // Calculate tenant analytics
  const analytics = useMemo(() => {
    const activeRentals = properties.length;
    const upcomingDues = properties.filter(p => {
      const info = getRentStatusInfo(p);
      return info.status === "Pending";
    }).length;
    const totalPaid = history
      .filter(tx => String(tx.buyerWallet).toLowerCase() === walletAddress.toLowerCase() && (tx.type === 'rent' || tx.type === 'distribute'))
      .reduce((acc, tx) => acc + parseFloat(tx.amountEth || 0), 0);
    const pendingPayments = properties.filter(p => {
      const info = getRentStatusInfo(p);
      return info.status === "Overdue";
    }).length;

    return { activeRentals, upcomingDues, totalPaid, pendingPayments };
  }, [properties, history, walletAddress]);

  // Chart data for rent payment history
  const rentPaymentData = useMemo(() => {
    const monthlyData = {};
    history.forEach(tx => {
      if (String(tx.buyerWallet).toLowerCase() === walletAddress.toLowerCase() && (tx.type === 'rent' || tx.type === 'distribute')) {
        const month = tx.createdAt ? tx.createdAt.substring(0, 7) : new Date().toISOString().substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { month, amount: 0 };
        monthlyData[month].amount += parseFloat(tx.amountEth || 0);
      }
    });
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [history, walletAddress]);

  // Chart data for due status
  const dueStatusData = useMemo(() => {
    const status = { paid: 0, pending: 0, overdue: 0 };
    properties.forEach(p => {
      const info = getRentStatusInfo(p);
      if (info.status === "Paid") status.paid++;
      else if (info.status === "Pending") status.pending++;
      else status.overdue++;
    });
    return [
      { name: 'Paid', value: status.paid, color: '#10b981' },
      { name: 'Pending', value: status.pending, color: '#f59e0b' },
      { name: 'Overdue', value: status.overdue, color: '#f87171' }
    ];
  }, [properties]);

  return (
    <div className="app-shell" style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Tenant Payment Dashboard</h2>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Welcome, </span>
          <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>{tenantName}</span>
        </div>
      </div>

      {/* SECTION 5: COMPACT TOAST NOTIFICATIONS */}
      {alerts.length > 0 && (
        <div style={{ 
          position: 'fixed', 
          top: '80px', 
          right: '20px', 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          maxWidth: '380px'
        }}>
          {alerts.map((al, idx) => (
            <div 
              key={idx} 
              className="toast-notification"
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '14px 18px', 
                borderRadius: '12px',
                background: al.type === 'success' 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(16, 185, 129, 0.85))' 
                  : al.type === 'warning' 
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(245, 158, 11, 0.85))' 
                  : 'linear-gradient(135deg, rgba(248, 113, 113, 0.95), rgba(248, 113, 113, 0.85))',
                color: 'white',
                animation: 'slideInRight 0.4s ease-out',
                boxShadow: al.type === 'success' 
                  ? '0 8px 32px rgba(16, 185, 129, 0.4)' 
                  : al.type === 'warning' 
                  ? '0 8px 32px rgba(245, 158, 11, 0.4)' 
                  : '0 8px 32px rgba(248, 113, 113, 0.4)',
                border: al.type === 'success' 
                  ? '1px solid rgba(16, 185, 129, 0.4)' 
                  : al.type === 'warning' 
                  ? '1px solid rgba(245, 158, 11, 0.4)' 
                  : '1px solid rgba(248, 113, 113, 0.4)',
                backdropFilter: 'blur(10px)',
                fontSize: '0.85rem',
                fontWeight: '500',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateX(-4px)';
                e.target.style.boxShadow = al.type === 'success' 
                  ? '0 12px 40px rgba(16, 185, 129, 0.5)' 
                  : al.type === 'warning' 
                  ? '0 12px 40px rgba(245, 158, 11, 0.5)' 
                  : '0 12px 40px rgba(248, 113, 113, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateX(0)';
                e.target.style.boxShadow = al.type === 'success' 
                  ? '0 8px 32px rgba(16, 185, 129, 0.4)' 
                  : al.type === 'warning' 
                  ? '0 8px 32px rgba(245, 158, 11, 0.4)' 
                  : '0 8px 32px rgba(248, 113, 113, 0.4)';
              }}
            >
              <div style={{ 
                position: 'absolute', 
                top: '0', 
                left: '0', 
                width: '4px', 
                height: '100%', 
                background: 'rgba(255, 255, 255, 0.3)' 
              }} />
              
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {al.icon}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '0.9rem',
                  marginBottom: '2px',
                  lineHeight: '1.2'
                }}>
                  {al.type === 'success' ? '✅ Payment Successful' : al.type === 'warning' ? '⏰ Payment Reminder' : '⚠️ Payment Overdue'}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  opacity: 0.9,
                  lineHeight: '1.3'
                }}>
                  {al.msg}
                </div>
              </div>
              
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onClick={(e) => {
                  // Remove this specific alert
                  const alertElement = e.target.closest('.toast-notification');
                  alertElement.style.animation = 'slideOutRight 0.3s ease-in';
                  setTimeout(() => {
                    setDismissedAlerts(prev => {
                      const newSet = new Set(prev);
                      newSet.add(al.id);
                      return newSet;
                    });
                  }, 300);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SUMMARY CARDS REMOVED BY USER REQUEST */}
      {/* ROW 2: AVAILABLE PROPERTIES */}
      <div 
        className="card" 
        style={{ 
          padding: '12px', 
          marginBottom: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ 
            width: '24px', height: '24px', 
            background: 'linear-gradient(135deg, #10b981, #059669)', 
            borderRadius: '6px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Home size={12} color="white" />
          </div>
          <h4 style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>Available Properties</h4>
          
          {/* VIEW TOGGLE BUTTONS - MATCHING USER SPEC (3rd PIC) */}
          <div style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(0, 0, 0, 0.2)', 
            borderRadius: '12px', 
            padding: '4px', 
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <button 
              onClick={() => setViewType('grid')}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '8px', 
                border: 'none', 
                background: viewType === 'grid' ? '#3b82f6' : 'transparent',
                color: viewType === 'grid' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: viewType === 'grid' ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
              }}
            >
              <LayoutGrid size={14} /> Card View
            </button>
            <button 
              onClick={() => setViewType('table')}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '8px', 
                border: 'none', 
                background: viewType === 'table' ? '#3b82f6' : 'transparent',
                color: viewType === 'table' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: viewType === 'table' ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
              }}
            >
              <List size={14} /> Table View
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            {properties.length} Total
          </div>
        </div>
        
        {properties.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 40px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}>🏠</div>
            <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-main)' }}>No properties available</div>
            <div style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '300px' }}>
              Check back later for available rental properties
            </div>
          </div>
        ) : (
          <>
            {viewType === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', animation: 'fadeIn 0.4s ease-out' }}>
                {properties.map((p) => {
                  const rentInfo = getRentStatusInfo(p);
                  const isPaid = rentInfo.status === "Paid";
                  const isPending = rentInfo.status === "Pending";
                  const isOverdue = rentInfo.status === "Overdue";
                  const statusColor = isPaid ? '#10b981' : isPending ? '#f59e0b' : '#f87171';
                  const statusBg = isPaid ? 'rgba(16, 185, 129, 0.1)' : isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(248, 113, 113, 0.1)';
                  
                  return (
                    <div 
                      key={p.id} 
                      style={{ 
                        padding: '16px', 
                        background: 'var(--bg-card)', 
                        border: `1px solid ${statusColor}30`,
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = `0 8px 32px ${statusColor}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ position: 'absolute', top: '0', right: '0', width: '80px', height: '80px', background: `radial-gradient(circle, ${statusColor}15 0%, transparent 70%)`, borderRadius: '50%', transform: 'translate(30px, -30px)' }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
                        <img src={p.image} style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', border: `2px solid ${statusColor}40` }} alt={p.name} />
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '1rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '2px' }}>{p.name}</h5>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{p.location || 'Global'}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ 
                              background: statusBg, 
                              color: statusColor, 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold',
                              border: `1px solid ${statusColor}40`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {rentInfo.status}
                            </span>
                            <span style={{ 
                              background: 'rgba(59, 130, 246, 0.1)', 
                              color: 'var(--primary)', 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold' 
                            }}>
                              {p.sharePriceEth} ETH/mo
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
                        <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '2px' }}>Next Due Date</div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.8rem' }}>{rentInfo.nextDue}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px', background: statusBg, borderRadius: '8px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '2px' }}>Days Remaining</div>
                          <div style={{ fontWeight: 'bold', color: statusColor, fontSize: '0.8rem' }}>
                            {isPaid ? 'Paid' : isOverdue ? `${Math.abs(rentInfo.daysRemaining)} days overdue` : `${rentInfo.daysRemaining} days left`}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className="btn-primary" 
                        style={{ 
                          width: '100%',
                          padding: '10px 16px', 
                          fontSize: '0.85rem',
                          background: isPaid ? 'linear-gradient(135deg, #64748b, #475569)' : `linear-gradient(135deg, ${statusColor}, ${statusColor}cc)`,
                          cursor: isPaid ? 'not-allowed' : 'pointer',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          color: 'white'
                        }}
                        onMouseEnter={(e) => {
                          if (!isPaid) {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = `0 4px 12px ${statusColor}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                        onClick={() => handlePayRent(p)}
                        disabled={isPaid}
                      >
                        {isPaid ? "✓ Rent Paid" : isOverdue ? "⚠ Pay Overdue Rent" : "💳 Pay Rent Now"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div 
                  className="table-container" 
                  style={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    overflowY: 'auto', 
                    maxHeight: '450px',
                    background: 'rgba(255,255,255,0.01)',
                    position: 'relative'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>PROPERTY</th>
                        <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>LOCATION</th>
                        <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>RENT / MO</th>
                        <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>STATUS</th>
                        <th style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>NEXT DUE</th>
                        <th style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((p) => {
                        const rentInfo = getRentStatusInfo(p);
                        const isPaid = rentInfo.status === "Paid";
                        const statusColor = isPaid ? '#10b981' : rentInfo.status === "Pending" ? '#f59e0b' : '#f87171';
                        
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={p.image} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt="" />
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{p.location || 'Global'}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', color: 'var(--text-main)' }}>{p.sharePriceEth} ETH</td>
                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                              <span style={{ 
                                color: statusColor, 
                                background: `${statusColor}15`, 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                border: `1px solid ${statusColor}30`,
                                display: 'inline-block',
                                minWidth: '70px'
                              }}>
                                {rentInfo.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--text-main)', fontWeight: '500' }}>{rentInfo.nextDue}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              <button 
                                onClick={() => handlePayRent(p)}
                                disabled={isPaid}
                                style={{ 
                                  padding: '8px 16px', 
                                  borderRadius: '8px', 
                                  fontSize: '0.8rem',
                                  background: isPaid ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                                  color: isPaid ? 'var(--text-muted)' : 'white',
                                  border: 'none',
                                  cursor: isPaid ? 'default' : 'pointer',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {isPaid ? "Paid" : "Pay Rent"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>



      {/* ROW 4: COMPACT PAYMENT HISTORY TABLE */}
      <div 
        className="card" 
        style={{ 
          padding: '12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ 
            width: '24px', height: '24px', 
            background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', 
            borderRadius: '6px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Calendar size={12} color="white" />
          </div>
          <h4 style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>Payment History</h4>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {history.filter(tx => String(tx.buyerWallet).toLowerCase() === walletAddress.toLowerCase() && (tx.type === 'rent' || tx.type === 'distribute')).length} Transactions
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', width: '100%' }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              background: 'var(--bg-card)', 
              zIndex: 1,
              backdropFilter: 'blur(10px)'
            }}>
              <tr>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textAlign: 'left' }}>DATE</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textAlign: 'left' }}>PROPERTY</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textAlign: 'right' }}>AMOUNT</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textAlign: 'center' }}>TYPE</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '600', fontSize: '0.75rem', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const userPayments = history
                  .filter(tx => String(tx.buyerWallet).toLowerCase() === walletAddress.toLowerCase() && (tx.type === 'rent' || tx.type === 'distribute'))
                  .slice(0, 20); // Show last 20 payments

                if (userPayments.length === 0) return (
                  <tr>
                    <td colSpan="5" style={{ 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      padding: '32px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ marginBottom: '8px' }}>💳</div>
                      No payment history found
                    </td>
                  </tr>
                );

                return userPayments.map((tx, idx) => {
                  const formattedDate = tx.date || new Date(tx.createdAt).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  }).replace(/\//g, "-");
                  
                  const isYield = tx.type === 'distribute';

                  return (
                    <tr 
                      key={idx}
                      style={{ 
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formattedDate}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: '500' }}>
                        {tx.propertyName ? (tx.propertyName.length > 20 ? tx.propertyName.substring(0, 20) + '...' : tx.propertyName) : 'N/A'}
                      </td>
                      <td style={{ 
                        padding: '10px 8px',
                        fontWeight: '700',
                        color: 'var(--accent)',
                        fontSize: '0.8rem',
                        textAlign: 'right'
                      }}>
                        {parseFloat(tx.amountEth || 0).toFixed(4)} ETH
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          background: isYield ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isYield ? 'var(--accent)' : 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          border: isYield ? '1px solid var(--accent)' : '1px solid var(--primary)'
                        }}>
                          {isYield ? 'Yield' : 'Rent'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          color: 'var(--accent)', 
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          background: 'rgba(16, 185, 129, 0.15)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--accent)'
                        }}>
                          ✓ Success
                        </span>
                      </td>
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

export default TenantDashboard;
