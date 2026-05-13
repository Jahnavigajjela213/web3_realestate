import React from 'react';

const AIAgentPanel = ({ title, data, icon }) => {
  const isDark = true; // Matching existing glassmorphism theme

  return (
    <div className="light-card" style={{ 
      marginBottom: '16px', 
      padding: '16px', 
      border: '1px solid rgba(245, 158, 11, 0.2)', // Amber border to signify AI
      background: 'rgba(245, 158, 11, 0.02)',
      borderRadius: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon || '🤖'}</span>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#f59e0b' }}>
          {title}
        </h3>
      </div>

      {/* Notifications/Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.notifications?.map((n, i) => (
          <div key={i} style={{ 
            fontSize: '0.75rem', 
            padding: '8px 12px', 
            borderRadius: '8px', 
            background: n.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: n.type === 'danger' ? '#f87171' : '#60a5fa',
            borderLeft: `3px solid ${n.type === 'danger' ? '#ef4444' : '#3b82f6'}`
          }}>
            {n.text}
          </div>
        ))}

        {data.insights?.map((ins, i) => (
          <div key={i} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'start', gap: '8px' }}>
            <span style={{ color: '#f59e0b', fontSize: '0.6rem', marginTop: '4px' }}>●</span>
            <span>{ins.text}</span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Suggested Action
          </p>
          {data.recommendations.map((rec, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              padding: '8px 12px',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{rec.text}</span>
              <button style={{ 
                fontSize: '0.65rem', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                background: '#f59e0b', 
                color: '#000', 
                border: 'none', 
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAgentPanel;
