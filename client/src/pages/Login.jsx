import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserProvider } from "ethers";

// Hardhat demo accounts — index maps to role
const DEMO_ADDRESSES = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // 0 Admin - James Wilson
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // 1 Admin - Mary Johnson
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // 2 Admin
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // 3 Admin
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // 4 Investor - Jennifer Garcia
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // 5 Investor
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // 6 Investor - Michael Rodriguez
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // 7 Investor - Linda Martinez
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // 8 Investor
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // 9 Investor
  "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // 10 Investor
  "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // 11 Investor
  "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // 12 Tenant - Richard Anderson
  "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", // 13 Tenant - Susan Thomas
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", // 14 Tenant - Joseph Taylor
  "0xcd3B766CCDd6AE721141F452C550Ca635964ce71", // 15 Tenant
  "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", // 16 Tenant
  "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", // 17 Tenant
  "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // 18 Tenant
  "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"  // 19 Tenant
];

const DEMO_NAMES = [
  "James Wilson","Mary Johnson","Robert Brown","Patricia Miller",
  "Jennifer Garcia","David Hernandez","Michael Rodriguez","Linda Martinez",
  "Elizabeth Lopez","William Gonzalez","Barbara Wilson","Richard Anderson",
  "Susan Thomas","Joseph Taylor","Jessica Moore","Thomas Jackson",
  "Sarah Martin","Charles Lee","Karen Perez","Nancy Hall"
];

// Pre-set demo credentials for each role
const ROLE_CONFIGS = {
  Admin: {
    icon: "👑",
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    shadow: "0 10px 30px rgba(99,102,241,0.35)",
    email: "admin@estatechain.com",
    description: "Manage properties, assign tenants & distribute rent",
    addressIndex: 0,
    badge: "Full Control",
  },
  Investor: {
    icon: "📈",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    shadow: "0 10px 30px rgba(16,185,129,0.35)",
    email: "investor@estatechain.com",
    description: "Buy property shares & earn rental yield",
    addressIndex: 7, // Linda Martinez
    badge: "Portfolio View",
  },
  Tenant: {
    icon: "🏠",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    shadow: "0 10px 30px rgba(245,158,11,0.35)",
    email: "tenant@estatechain.com",
    description: "View your lease & pay rent on-chain",
    addressIndex: 13, // Susan Thomas
    badge: "My Lease",
  },
};

const Login = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState("Investor");
  const [email, setEmail] = useState(ROLE_CONFIGS["Investor"].email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const selectRole = (role) => {
    setSelectedRole(role);
    setEmail(ROLE_CONFIGS[role].email);
    setPassword("");
    setError("");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter an email address."); return; }
    if (!password.trim()) { setError("Please enter a password."); return; }

    const config = ROLE_CONFIGS[selectedRole];
    const address = DEMO_ADDRESSES[config.addressIndex];
    const name = DEMO_NAMES[config.addressIndex];

    localStorage.setItem("role", selectedRole);
    localStorage.setItem("walletAddress", address);
    localStorage.setItem("userName", name);
    localStorage.setItem("loginMethod", "email");

    if (onLogin) onLogin(address, selectedRole, null);

    if (selectedRole === "Admin") navigate("/admin");
    else if (selectedRole === "Tenant") navigate("/tenant");
    else navigate("/properties");
  };

  const handleMetaMask = async () => {
    setLoading(true);
    setError("");
    try {
      if (!window.ethereum) { setError("MetaMask not installed."); return; }
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const idx = DEMO_ADDRESSES.findIndex(a => a.toLowerCase() === address.toLowerCase());
      
      if (idx === -1) {
        setError("Unauthorized Wallet. Please use one of the 20 test accounts.");
        setLoading(false);
        return;
      }

      let role;
      if (idx < 4) role = "Admin";
      else if (idx < 12) role = "Investor";
      else role = "Tenant";

      localStorage.setItem("role", role);
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("userName", idx !== -1 ? DEMO_NAMES[idx] : "Wallet User");
      localStorage.setItem("loginMethod", "metamask");

      if (onLogin) onLogin(address, role, provider);
      if (role === "Admin") navigate("/admin");
      else if (role === "Tenant") navigate("/tenant");
      else navigate("/properties");
    } catch (err) {
      setError("Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = ROLE_CONFIGS[selectedRole];

  return (
    <div className="login-shell" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Animated background blobs */}
      <div className="login-blob blob1" />
      <div className="login-blob blob2" />

      <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <div style={{
            width: "56px", height: "56px",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px",
            boxShadow: "0 10px 25px rgba(99,102,241,0.4)",
            fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)"
          }}>E</div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-main)", margin: "0 0 4px" }}>EstateChain</h1>
          <p style={{ color: "var(--login-text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Web3 Real Estate Tokenization Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="login-card">
          <p style={{ color: "var(--login-text-muted)", fontSize: "0.8rem", textAlign: "center", marginBottom: "12px" }}>
            Select your role to login
          </p>

          {/* Role Cards */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
            {Object.entries(ROLE_CONFIGS).map(([role, c]) => (
              <div
                key={role}
                onClick={() => selectRole(role)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "center",
                  border: `2px solid ${selectedRole === role ? c.color : "var(--border)"}`,
                  background: selectedRole === role
                    ? `linear-gradient(135deg, ${c.color}22, ${c.color}11)`
                    : "var(--panel-bg)",
                  transition: "all 0.2s ease",
                  transform: selectedRole === role ? "translateY(-1px)" : "none",
                  boxShadow: selectedRole === role ? c.shadow : "none"
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>{c.icon}</div>
                <div style={{
                  fontWeight: "700", fontSize: "0.8rem",
                  color: selectedRole === role ? c.color : "var(--login-text-muted)"
                }}>{role}</div>
              </div>
            ))}
          </div>

          {/* Role description badge */}
          <div style={{
            background: `${cfg.color}15`,
            border: `1px solid ${cfg.color}30`,
            borderRadius: "10px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "15px"
          }}>
            <span style={{ fontSize: "1.1rem" }}>{cfg.icon}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--login-text-muted)" }}>{cfg.description}</span>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", color: "var(--login-text-muted)", fontSize: "0.78rem", marginBottom: "4px", fontWeight: "500" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="any@email.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--input-bg)",
                  border: `1px solid ${cfg.color}50`,
                  borderRadius: "10px",
                  color: "var(--input-color)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s"
                }}
              />
            </div>
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", color: "var(--login-text-muted)", fontSize: "0.78rem", marginBottom: "4px", fontWeight: "500" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter any password"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--input-bg)",
                  border: `1px solid ${cfg.color}50`,
                  borderRadius: "10px",
                  color: "var(--input-color)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "10px", padding: "10px 14px", marginBottom: "16px",
                color: "#f87171", fontSize: "0.85rem"
              }}>{error}</div>
            )}

            <button
              type="submit"
              style={{
                width: "100%", padding: "12px",
                background: cfg.gradient,
                border: "none", borderRadius: "10px",
                color: "white", fontWeight: "700", fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: cfg.shadow,
                transition: "transform 0.15s, opacity 0.15s",
                letterSpacing: "0.3px"
              }}
              onMouseEnter={e => e.target.style.opacity = "0.9"}
              onMouseLeave={e => e.target.style.opacity = "1"}
            >
              {cfg.icon} Login as {selectedRole}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "15px 0" }}>
            <div className="login-divider" />
            <span style={{ color: "var(--login-text-muted)", fontSize: "0.75rem" }}>or connect wallet</span>
            <div className="login-divider" />
          </div>

          <button
            onClick={handleMetaMask}
            disabled={loading}
            style={{
              width: "100%", padding: "10px",
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-main)", fontWeight: "600", fontSize: "0.9rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--panel-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--input-bg)"}
          >
            <span style={{ fontSize: "1.1rem" }}>🦊</span>
            {loading ? "Connecting…" : "Connect with MetaMask"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
