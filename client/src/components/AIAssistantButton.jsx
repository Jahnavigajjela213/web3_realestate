import React, { useState, useEffect } from 'react';
import { aiOrchestrator } from '../services/agentOrchestrator';

const AIAssistantButton = ({ role, contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState({ insights: [], recommendations: [], notifications: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      aiOrchestrator.getInsights(role, contextData).then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [isOpen, role, contextData]);

  const getGreeting = () => {
    if (role === 'Admin') return "Need property analytics?";
    if (role === 'Investor') return "Need portfolio insights?";
    if (role === 'Tenant') return "Need rent payment help?";
    return "How can I help?";
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none',
          boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(90deg)' : 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
        onMouseLeave={e => e.currentTarget.style.transform = isOpen ? 'rotate(90deg)' : 'none'}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Tiny Modal */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '72px',
          right: '0',
          width: '320px',
          background: '#1e293b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f59e0b' }}>EstateChain AI</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{getGreeting()}</p>
          </div>
          
          <div style={{ padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Analyzing data...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.notifications?.map((n, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: n.type === 'danger' ? '#f87171' : '#60a5fa' }}>• {n.text}</div>
                ))}
                {data.insights?.map((ins, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>• {ins.text}</div>
                ))}
                {data.recommendations?.length > 0 && (
                   <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px' }}>
                     <span style={{ fontSize: '0.65rem', color: '#f59e0b', textTransform: 'uppercase' }}>Strategy:</span>
                     <p style={{ margin: '4px 0', fontSize: '0.75rem', color: '#cbd5e1' }}>{data.recommendations[0].text}</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AIAssistantButton;
