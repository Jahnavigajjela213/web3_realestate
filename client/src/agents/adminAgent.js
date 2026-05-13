/**
 * Admin Agent - Analyzes platform-wide metrics
 */
export const analyzeAdminData = (properties, transactions) => {
  const insights = [];
  const recommendations = [];
  const notifications = [];

  if (!properties || properties.length === 0) return { insights, recommendations, notifications };

  // 1. Analyze Token Sales
  const topSeller = [...properties].sort((a, b) => b.sharesSold - a.sharesSold)[0];
  if (topSeller && topSeller.sharesSold > 0) {
    insights.push({
      text: `${topSeller.name} has the highest token sales (${topSeller.sharesSold} shares)`,
      type: 'success'
    });
  }

  // 2. Detect High Demand
  properties.forEach(p => {
    const soldPercent = (p.sharesSold / p.totalShares) * 100;
    if (soldPercent > 80 && soldPercent < 100) {
      notifications.push({
        text: `High Demand: ${p.name} is ${soldPercent.toFixed(0)}% sold!`,
        type: 'warning'
      });
    }
  });

  // 3. Analyze Rent Collection
  const totalRent = properties.reduce((acc, p) => acc + parseFloat(p.totalRentDistributed || 0), 0);
  insights.push({
    text: `Total platform yield distributed: ${totalRent.toFixed(3)} ETH`,
    type: 'info'
  });

  // 4. Pending Actions
  const propertiesWithoutTenants = properties.filter(p => !p.tenant || !p.tenant.isActive);
  if (propertiesWithoutTenants.length > 0) {
    recommendations.push({
      text: `Assign tenants to ${propertiesWithoutTenants.length} vacant properties to start generating yield.`,
      action: 'Assign Tenants'
    });
  }

  return { insights, recommendations, notifications };
};
