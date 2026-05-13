/**
 * Investor Agent - Analyzes personal portfolio and ROI
 */
export const analyzeInvestorData = (portfolio, properties) => {
  const insights = [];
  const recommendations = [];
  
  if (!portfolio || portfolio.length === 0) {
    return {
      insights: [{ text: "Your portfolio is empty. Explore properties to start earning.", type: 'info' }],
      recommendations: [{ text: "Consider diversifying into high-yield commercial assets.", action: 'View Marketplace' }]
    };
  }

  // 1. Calculate Ownership & ROI
  const totalValue = portfolio.reduce((acc, p) => acc + parseFloat(p.valueEth || 0), 0);
  insights.push({
    text: `Total Portfolio Value: ${totalValue.toFixed(3)} ETH`,
    type: 'success'
  });

  // 2. High Performing Assets
  const topAsset = [...portfolio].sort((a, b) => b.sharesOwned - a.sharesOwned)[0];
  if (topAsset) {
    const ownership = ((topAsset.sharesOwned / topAsset.totalShares) * 100).toFixed(1);
    insights.push({
      text: `You own ${ownership}% of ${topAsset.propertyName}`,
      type: 'info'
    });
  }

  // 3. Earnings Prediction (Simulated)
  const estMonthly = portfolio.reduce((acc, p) => {
    const prop = properties.find(prop => prop.id === p.propertyId);
    if (prop && prop.tenant && prop.tenant.isActive) {
      const shareRatio = p.sharesOwned / p.totalShares;
      return acc + (parseFloat(prop.tenant.rentAmount) * shareRatio);
    }
    return acc;
  }, 0);

  if (estMonthly > 0) {
    insights.push({
      text: `Estimated monthly rental income: ${estMonthly.toFixed(4)} ETH`,
      type: 'success'
    });
  }

  // 4. Diversification Check
  if (portfolio.length < 3) {
    recommendations.push({
      text: "Spread your risk by investing in at least 3 different property types.",
      action: 'Diversify'
    });
  }

  return { insights, recommendations };
};
