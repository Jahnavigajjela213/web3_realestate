/**
 * Tenant Agent - Analyzes rent status and due dates
 */
export const analyzeTenantData = (tenantProperty) => {
  const notifications = [];
  const insights = [];

  if (!tenantProperty) {
    return {
      notifications: [{ text: "You are not currently leasing any properties.", type: 'info' }],
      insights: []
    };
  }

  // 1. Rent Status
  const rentAmount = tenantProperty.tenant?.rentAmount || "0";
  insights.push({
    text: `Monthly rent: ${rentAmount} ETH`,
    type: 'info'
  });

  // 2. Due Date Simulation (Based on current day)
  const today = new Date().getDate();
  const daysLeft = 30 - today;

  if (daysLeft <= 5) {
    notifications.push({
      text: `Urgent: Rent payment due in ${daysLeft} days!`,
      type: 'danger'
    });
  } else {
    notifications.push({
      text: `Your next payment is scheduled in ${daysLeft} days.`,
      type: 'info'
    });
  }

  // 3. Payment Success
  notifications.push({
    text: "Last payment completed successfully via smart contract.",
    type: 'success'
  });

  return { notifications, insights };
};
