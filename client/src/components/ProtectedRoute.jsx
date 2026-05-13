import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem("role");
  const walletAddress = localStorage.getItem("walletAddress");

  if (!walletAddress || !userRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '500px' }}>
          <h2 style={{ color: '#f87171', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            You do not have permission to view this page. This area is restricted to {allowedRoles.join(" or ")}s only.
          </p>
          <button className="btn-primary" onClick={() => window.location.href = '/'}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
